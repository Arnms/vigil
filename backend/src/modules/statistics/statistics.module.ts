import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CheckResult } from '../health-check/check-result.entity';
import { Endpoint } from '../endpoint/endpoint.entity';
import { Incident } from '../incident/incident.entity';
import { StatisticsService } from './services/statistics.service';
import { UptimeCalculatorService } from './services/uptime-calculator.service';
import { ResponseTimeAnalyzerService } from './services/response-time-analyzer.service';
import { CacheManagerService } from './services/cache-manager.service';
import { IncidentService } from './services/incident.service';
import { StatisticsController } from './statistics.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CheckResult, Endpoint, Incident])],
  providers: [
    StatisticsService,
    UptimeCalculatorService,
    ResponseTimeAnalyzerService,
    CacheManagerService,
    IncidentService,
  ],
  controllers: [StatisticsController],
  exports: [StatisticsService],
})
export class StatisticsModule {}
