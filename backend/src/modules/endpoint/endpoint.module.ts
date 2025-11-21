import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { EndpointController } from './endpoint.controller';
import { EndpointService } from './endpoint.service';
import { Endpoint } from './endpoint.entity';
import { CheckResult } from '../health-check/check-result.entity';
import { Incident } from '../incident/incident.entity';
import { HealthCheckModule } from '../health-check/health-check.module';
import { WebsocketModule } from '../websocket/websocket.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Endpoint, CheckResult, Incident]),
    HealthCheckModule, // HealthCheckService 사용을 위해 import
    WebsocketModule, // WebsocketGateway 사용을 위해 import
  ],
  controllers: [EndpointController],
  providers: [EndpointService],
  exports: [EndpointService], // 다른 모듈에서 사용 가능
})
export class EndpointModule {}
