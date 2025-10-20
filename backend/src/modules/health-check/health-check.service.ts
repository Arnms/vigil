import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue, Job } from 'bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Endpoint } from '../endpoint/endpoint.entity';
import { CheckResult } from './check-result.entity';

@Injectable()
export class HealthCheckService {
  private readonly logger = new Logger(HealthCheckService.name);

  constructor(
    @InjectQueue('HEALTH_CHECK_QUEUE')
    private healthCheckQueue: Queue,
    @InjectRepository(Endpoint)
    private endpointRepository: Repository<Endpoint>,
  ) {}

  /**
   * 엔드포인트를 위한 주기적 헬스 체크 작업 스케줄
   *
   * @param endpoint - 스케줄할 엔드포인트
   */
  async scheduleHealthCheck(endpoint: Endpoint): Promise<void> {
    try {
      const jobName = `endpoint-${endpoint.id}`;

      // Repeatable Job 생성
      // 매 checkInterval 초마다 반복 실행
      const job = await this.healthCheckQueue.add(
        'check',
        { endpointId: endpoint.id },
        {
          jobId: jobName,
          repeat: {
            every: endpoint.checkInterval * 1000, // 밀리초 단위
          },
          removeOnComplete: false, // 완료해도 히스토리 유지
          attempts: 3, // 최대 3회 재시도
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      );

      this.logger.log(
        `Health check scheduled for endpoint ${endpoint.id} with interval ${endpoint.checkInterval}s`,
      );

      // 즉시 첫 실행
      await this.healthCheckQueue.add(
        'check',
        { endpointId: endpoint.id, isImmediate: true },
        {
          priority: 1, // 높은 우선순위
        },
      );

      this.logger.log(`Immediate health check queued for endpoint ${endpoint.id}`);
    } catch (error) {
      this.logger.error(
        `Failed to schedule health check for endpoint ${endpoint.id}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * 헬스 체크 작업 재스케줄
   * checkInterval 변경 시 호출
   *
   * @param endpoint - 재스케줄할 엔드포인트
   */
  async rescheduleHealthCheck(endpoint: Endpoint): Promise<void> {
    try {
      // 기존 Job 제거
      await this.unscheduleHealthCheck(endpoint);

      // 새로 스케줄
      await this.scheduleHealthCheck(endpoint);

      this.logger.log(
        `Health check rescheduled for endpoint ${endpoint.id} with new interval ${endpoint.checkInterval}s`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to reschedule health check for endpoint ${endpoint.id}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * 헬스 체크 작업 제거
   * 엔드포인트 삭제 시 호출
   *
   * @param endpoint - 제거할 엔드포인트
   */
  async unscheduleHealthCheck(endpoint: Endpoint): Promise<void> {
    try {
      // 반복되는 작업들 조회
      const jobs = await this.healthCheckQueue.getJobs(
        ['active', 'waiting', 'delayed', 'paused'] as any,
      );

      for (const job of jobs) {
        if (
          job.data &&
          job.data.endpointId === endpoint.id
        ) {
          await job.remove();
          this.logger.log(`Removed job for endpoint ${endpoint.id}`);
        }
      }

      this.logger.log(`Health check jobs removed for endpoint ${endpoint.id}`);
    } catch (error) {
      this.logger.error(
        `Failed to unschedule health check for endpoint ${endpoint.id}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * 즉시 헬스 체크 수행
   * 수동 체크 시 호출
   *
   * @param endpoint - 즉시 체크할 엔드포인트
   * @returns CheckResult - 체크 결과
   */
  async performHealthCheckNow(endpoint: Endpoint): Promise<CheckResult> {
    try {
      const job = await this.healthCheckQueue.add(
        'check',
        { endpointId: endpoint.id, isManual: true },
        {
          priority: 1, // 높은 우선순위
          attempts: 1, // 재시도 없음
        },
      );

      this.logger.log(`Manual health check queued for endpoint ${endpoint.id}`);

      // 작업 완료 대기
      return new Promise((resolve, reject) => {
        job
          .finished()
          .then(() => {
            // Processor에서 저장한 결과 반환
            resolve(job.returnvalue as CheckResult);
          })
          .catch(reject);
      });
    } catch (error) {
      this.logger.error(
        `Failed to perform manual health check for endpoint ${endpoint.id}: ${error.message}`,
      );
      throw error;
    }
  }
}
