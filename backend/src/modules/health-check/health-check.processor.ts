import { Processor, Process, OnGlobalQueueError } from '@nestjs/bull';
import { Injectable, Logger } from '@nestjs/common';
import type { Job } from 'bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { HttpService } from '@nestjs/axios';

import { Endpoint, EndpointStatus } from '../endpoint/endpoint.entity';
import { CheckResult, CheckStatus } from './check-result.entity';
import { Incident } from '../incident/incident.entity';
import { NotificationService } from '../notification/services/notification.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';

interface HealthCheckJobData {
  endpointId: string;
  isManual?: boolean;
  isImmediate?: boolean;
}

@Injectable()
@Processor('HEALTH_CHECK_QUEUE')
export class HealthCheckProcessor {
  private readonly logger = new Logger(HealthCheckProcessor.name);

  constructor(
    @InjectRepository(Endpoint)
    private endpointRepository: Repository<Endpoint>,
    @InjectRepository(CheckResult)
    private checkResultRepository: Repository<CheckResult>,
    @InjectRepository(Incident)
    private incidentRepository: Repository<Incident>,
    private httpService: HttpService,
    private notificationService: NotificationService,
    private websocketGateway: WebsocketGateway,
  ) {}

  @Process('check')
  async handleHealthCheck(job: Job<HealthCheckJobData>): Promise<CheckResult | null> {
    const { endpointId, isManual } = job.data;

    try {
      // 1️⃣ 엔드포인트 정보 조회
      const endpoint = await this.endpointRepository.findOne({
        where: { id: endpointId },
      });

      if (!endpoint) {
        throw new Error(`Endpoint not found: ${endpointId}`);
      }

      // 비활성 엔드포인트는 예약된 체크에서 건너뛰기 (수동 체크는 허용)
      if (!endpoint.isActive && !isManual) {
        this.logger.log(`Skipping check for inactive endpoint: ${endpointId}`);
        return null;
      }

      // 2️⃣ HTTP 요청 수행 및 응답 분석
      const checkResult = await this.performHttpRequest(endpoint);

      // 3️⃣ CheckResult 저장
      const savedResult = await this.checkResultRepository.save(checkResult);

      // 📡 WebSocket: 체크 완료 이벤트 브로드캐스트
      this.websocketGateway.broadcastCheckCompleted(endpoint.id, {
        endpointId: endpoint.id,
        status: checkResult.status,
        responseTime: checkResult.responseTime || 0,
        statusCode: checkResult.statusCode || undefined,
        errorMessage: checkResult.errorMessage || undefined,
        endpointName: endpoint.name,
      });

      // 📝 상태 변경 전 이전 상태 저장
      const previousStatus = endpoint.currentStatus;

      // 4️⃣ Endpoint 상태 업데이트
      await this.updateEndpointStatus(endpoint, checkResult);

      // 📡 WebSocket: 상태 변경 이벤트 브로드캐스트 (상태가 변경된 경우만)
      if (previousStatus !== endpoint.currentStatus) {
        this.websocketGateway.broadcastStatusChange(endpoint.id, {
          endpointId: endpoint.id,
          currentStatus: endpoint.currentStatus,
          previousStatus: previousStatus,
          timestamp: new Date(),
          responseTime: checkResult.responseTime || 0,
          errorMessage: checkResult.errorMessage || undefined,
          endpointName: endpoint.name,
        });
      }

      // 5️⃣ Incident 처리 및 WebSocket 브로드캐스트
      await this.handleIncidentsWithWebSocket(endpoint, checkResult);

      // 💬 상태 변경 시 알림 발송 (NEW)
      if (previousStatus !== endpoint.currentStatus) {
        await this.notificationService.sendAlertOnStatusChange(
          endpoint,
          previousStatus,
          endpoint.currentStatus,
          checkResult,
        );
      }

      this.logger.log(
        `Health check completed for ${endpoint.name}: ${checkResult.status}`,
      );

      return savedResult;
    } catch (error) {
      this.logger.error(
        `Health check failed for ${endpointId}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * HTTP 요청 수행 및 응답 분석
   */
  private async performHttpRequest(endpoint: Endpoint): Promise<CheckResult> {
    const startTime = Date.now();

    try {
      const response = await this.httpService.axiosRef.request({
        method: endpoint.method,
        url: endpoint.url,
        headers: endpoint.headers || {},
        data: endpoint.body,
        timeout: endpoint.timeoutThreshold,
        validateStatus: () => true, // 모든 상태 코드 수락
      });

      const responseTime = Date.now() - startTime;

      const checkResult = new CheckResult();
      checkResult.endpoint = endpoint;
      checkResult.endpointId = endpoint.id;
      checkResult.responseTime = responseTime;
      checkResult.statusCode = response.status;

      if (response.status === endpoint.expectedStatusCode) {
        checkResult.status = CheckStatus.SUCCESS;
        checkResult.errorMessage = null;
      } else {
        checkResult.status = CheckStatus.FAILURE;
        checkResult.errorMessage = `Expected ${endpoint.expectedStatusCode}, got ${response.status}`;
      }

      return checkResult;
    } catch (error) {
      const responseTime = Date.now() - startTime;

      const checkResult = new CheckResult();
      checkResult.endpoint = endpoint;
      checkResult.endpointId = endpoint.id;
      checkResult.status = CheckStatus.FAILURE;
      checkResult.responseTime = responseTime;
      checkResult.statusCode = null;
      checkResult.errorMessage = this.getErrorMessage(error);

      return checkResult;
    }
  }

  /**
   * 에러 메시지 생성
   */
  private getErrorMessage(error: any): string {
    if (
      error.code === 'ECONNABORTED' ||
      error.message === 'timeout of' + ' ms exceeded'
    ) {
      return 'Timeout exceeded';
    }
    if (error.code === 'ENOTFOUND') {
      return 'DNS resolution failed';
    }
    if (error.code === 'ECONNREFUSED') {
      return 'Connection refused';
    }
    if (error.code === 'ENETUNREACH') {
      return 'Network is unreachable';
    }
    if (error.code === 'EHOSTUNREACH') {
      return 'Host is unreachable';
    }
    if (error.message && error.message.includes('timeout')) {
      return 'Timeout exceeded';
    }
    return error.message || 'Unknown error';
  }

  /**
   * Endpoint 상태 업데이트
   */
  private async updateEndpointStatus(
    endpoint: Endpoint,
    checkResult: CheckResult,
  ): Promise<void> {
    const newStatus = this.determineStatus(endpoint, checkResult);

    endpoint.currentStatus = newStatus;
    endpoint.lastResponseTime = checkResult.responseTime;
    endpoint.lastCheckedAt = new Date();

    // consecutiveFailures 업데이트
    if (checkResult.status === CheckStatus.SUCCESS) {
      endpoint.consecutiveFailures = 0;
    } else {
      endpoint.consecutiveFailures++;
    }

    await this.endpointRepository.save(endpoint);
  }

  /**
   * 상태 판정 로직
   *
   * UP:        최근 성공 && 응답시간 < 타임아웃의 80%
   * DOWN:      연속 3회 이상 실패
   * DEGRADED:  최근 성공 && 응답시간 > 타임아웃의 80%
   * UNKNOWN:   아직 체크 안 됨
   */
  private determineStatus(
    endpoint: Endpoint,
    checkResult: CheckResult,
  ): EndpointStatus {
    if (checkResult.status === CheckStatus.FAILURE) {
      // 실패: 3회 이상 연속 실패 시 DOWN
      if (endpoint.consecutiveFailures >= 3) {
        return EndpointStatus.DOWN;
      }
      // 3회 미만 실패 시 기존 상태 유지
      return endpoint.currentStatus;
    }

    // 성공: 응답 시간에 따라 판정
    const thresholdMs = endpoint.timeoutThreshold * 0.8;

    if (
      checkResult.responseTime !== null &&
      checkResult.responseTime > thresholdMs
    ) {
      return EndpointStatus.DEGRADED;
    }

    return EndpointStatus.UP;
  }

  /**
   * Incident 처리 (WebSocket 이벤트 포함)
   *
   * DOWN 상태 진입 시: 새 Incident 생성 → incident:started 이벤트
   * UP/DEGRADED 상태 회복 시: Incident 종료 → incident:resolved 이벤트
   */
  private async handleIncidentsWithWebSocket(
    endpoint: Endpoint,
    checkResult: CheckResult,
  ): Promise<void> {
    const newStatus = endpoint.currentStatus;

    // 기존 진행 중인 인시던트 조회
    const activeIncident = await this.incidentRepository.findOne({
      where: {
        endpointId: endpoint.id,
        resolvedAt: IsNull(),
      },
    });

    if (newStatus === EndpointStatus.DOWN && !activeIncident) {
      // DOWN 상태 진입 → 새 인시던트 생성
      const incident = new Incident();
      incident.endpoint = endpoint;
      incident.endpointId = endpoint.id;
      incident.startedAt = new Date();
      incident.failureCount = endpoint.consecutiveFailures;
      incident.errorMessage = checkResult.errorMessage;

      const savedIncident = await this.incidentRepository.save(incident);

      // 📡 WebSocket: 인시던트 시작 이벤트 브로드캐스트
      this.websocketGateway.broadcastIncidentStarted(endpoint.id, {
        incidentId: savedIncident.id,
        endpointId: endpoint.id,
        startedAt: savedIncident.startedAt,
        failureCount: savedIncident.failureCount,
        endpointName: endpoint.name,
      });

      this.logger.warn(
        `Incident created for endpoint ${endpoint.name}: ${incident.errorMessage}`,
      );
    } else if (newStatus !== EndpointStatus.DOWN && activeIncident) {
      // UP/DEGRADED 상태 회복 → 인시던트 종료
      activeIncident.resolvedAt = new Date();
      activeIncident.duration =
        activeIncident.resolvedAt.getTime() -
        activeIncident.startedAt.getTime();

      const savedIncident = await this.incidentRepository.save(activeIncident);

      // 📡 WebSocket: 인시던트 해결 이벤트 브로드캐스트
      this.websocketGateway.broadcastIncidentResolved(endpoint.id, {
        incidentId: savedIncident.id,
        endpointId: endpoint.id,
        resolvedAt: savedIncident.resolvedAt || new Date(),
        duration: savedIncident.duration || 0,
        endpointName: endpoint.name,
      });

      this.logger.log(
        `Incident resolved for endpoint ${endpoint.name}, duration: ${activeIncident.duration}ms`,
      );
    }
  }

  /**
   * Incident 처리 (기존 메서드 - 호환성 유지)
   */
  private async handleIncidents(
    endpoint: Endpoint,
    checkResult: CheckResult,
  ): Promise<void> {
    // 이 메서드는 더 이상 사용되지 않음 (handleIncidentsWithWebSocket 사용)
  }

  @OnGlobalQueueError()
  onGlobalQueueError(error: Error) {
    this.logger.error(`Global queue error: ${error.message}`, error.stack);
  }
}
