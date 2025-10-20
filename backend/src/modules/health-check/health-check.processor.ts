import { Processor, Process, OnGlobalQueueError } from '@nestjs/bull';
import { Injectable, Logger } from '@nestjs/common';
import type { Job } from 'bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { HttpService } from '@nestjs/axios';

import { Endpoint, EndpointStatus } from '../endpoint/endpoint.entity';
import { CheckResult, CheckStatus } from './check-result.entity';
import { Incident } from '../incident/incident.entity';

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
  ) {}

  @Process('check')
  async handleHealthCheck(job: Job<HealthCheckJobData>): Promise<CheckResult | null> {
    const { endpointId } = job.data;

    try {
      // 1️⃣ 엔드포인트 정보 조회
      const endpoint = await this.endpointRepository.findOne({
        where: { id: endpointId },
      });

      if (!endpoint) {
        throw new Error(`Endpoint not found: ${endpointId}`);
      }

      if (!endpoint.isActive) {
        this.logger.debug(`Endpoint is not active, skipping: ${endpointId}`);
        return null;
      }

      // 2️⃣ HTTP 요청 수행 및 응답 분석
      const checkResult = await this.performHttpRequest(endpoint);

      // 3️⃣ CheckResult 저장
      const savedResult = await this.checkResultRepository.save(checkResult);

      // 4️⃣ Endpoint 상태 업데이트
      await this.updateEndpointStatus(endpoint, checkResult);

      // 5️⃣ Incident 처리
      await this.handleIncidents(endpoint, checkResult);

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
   * Incident 처리
   *
   * DOWN 상태 진입 시: 새 Incident 생성
   * UP/DEGRADED 상태 회복 시: Incident 종료
   */
  private async handleIncidents(
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

      await this.incidentRepository.save(incident);
      this.logger.warn(
        `Incident created for endpoint ${endpoint.name}: ${incident.errorMessage}`,
      );
    } else if (newStatus !== EndpointStatus.DOWN && activeIncident) {
      // UP/DEGRADED 상태 회복 → 인시던트 종료
      activeIncident.resolvedAt = new Date();
      activeIncident.duration =
        activeIncident.resolvedAt.getTime() -
        activeIncident.startedAt.getTime();

      await this.incidentRepository.save(activeIncident);
      this.logger.log(
        `Incident resolved for endpoint ${endpoint.name}, duration: ${activeIncident.duration}ms`,
      );
    }
  }

  @OnGlobalQueueError()
  onGlobalQueueError(error: Error) {
    this.logger.error(`Global queue error: ${error.message}`, error.stack);
  }
}
