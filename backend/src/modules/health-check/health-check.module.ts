import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';

import { HealthCheckService } from './health-check.service';
import { HealthCheckProcessor } from './health-check.processor';
import { Endpoint } from '../endpoint/endpoint.entity';
import { CheckResult } from './check-result.entity';
import { Incident } from '../incident/incident.entity';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'HEALTH_CHECK_QUEUE',
    }),
    TypeOrmModule.forFeature([Endpoint, CheckResult, Incident]),
    HttpModule,
    NotificationModule, // 알림 시스템 통합
  ],
  providers: [HealthCheckService, HealthCheckProcessor],
  exports: [HealthCheckService], // 다른 모듈에서 사용 가능
})
export class HealthCheckModule {}
