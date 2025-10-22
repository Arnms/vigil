import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  UptimeQueryDto,
  UptimePeriod,
  UptimeStatsResponse,
} from '../dto/uptime-query.dto';
import { CheckResult } from '../../health-check/check-result.entity';

@Injectable()
export class UptimeCalculatorService {
  private readonly logger = new Logger(UptimeCalculatorService.name);

  constructor(
    @InjectRepository(CheckResult)
    private checkResultRepository: Repository<CheckResult>,
  ) {}

  async calculate(
    endpointId: string,
    query: UptimeQueryDto,
  ): Promise<UptimeStatsResponse> {
    const { startDate, endDate } = this.calculateDateRange(query);

    // QueryBuilder를 사용한 최적화된 집계 쿼리
    const result = await this.checkResultRepository
      .createQueryBuilder('cr')
      .select('COUNT(*)', 'totalChecks')
      .addSelect(
        `COUNT(*) FILTER (WHERE cr.status = 'success')`,
        'successfulChecks',
      )
      .addSelect(
        `COUNT(*) FILTER (WHERE cr.status = 'failure')`,
        'failedChecks',
      )
      .where('cr.endpointId = :endpointId', { endpointId })
      .andWhere('cr.checkedAt >= :startDate', { startDate })
      .andWhere('cr.checkedAt <= :endDate', { endDate })
      .getRawOne();

    const totalChecks = parseInt(result?.totalChecks || '0') || 0;
    const successfulChecks = parseInt(result?.successfulChecks || '0') || 0;
    const uptime =
      totalChecks === 0 ? 0 : (successfulChecks / totalChecks) * 100;

    return {
      endpointId,
      period: query.period || UptimePeriod.TWENTY_FOUR_HOURS,
      uptime: Math.round(uptime * 100) / 100,
      totalChecks,
      successfulChecks,
      failedChecks: parseInt(result?.failedChecks || '0') || 0,
      startDate,
      endDate,
    };
  }

  private calculateDateRange(query: UptimeQueryDto): {
    startDate: Date;
    endDate: Date;
  } {
    const endDate = new Date();
    let startDate: Date;

    switch (query.period) {
      case UptimePeriod.TWENTY_FOUR_HOURS:
        startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);
        break;
      case UptimePeriod.SEVEN_DAYS:
        startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case UptimePeriod.THIRTY_DAYS:
        startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case UptimePeriod.CUSTOM:
        if (query.startDate) {
          startDate = new Date(query.startDate);
          if (query.endDate) {
            return { startDate, endDate: new Date(query.endDate) };
          }
        } else {
          startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);
        }
        break;
      default:
        startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);
    }

    return { startDate, endDate };
  }
}
