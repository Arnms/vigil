import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ResponseTimeQueryDto,
  ResponseTimePeriod,
  ResponseTimeStatsResponse,
  ResponseTimeStatistics,
  TimeSeriesData,
} from '../dto/response-time-query.dto';
import { CheckResult } from '../../health-check/check-result.entity';

@Injectable()
export class ResponseTimeAnalyzerService {
  private readonly logger = new Logger(ResponseTimeAnalyzerService.name);

  constructor(
    @InjectRepository(CheckResult)
    private checkResultRepository: Repository<CheckResult>,
  ) {}

  async analyze(
    endpointId: string,
    query: ResponseTimeQueryDto,
  ): Promise<ResponseTimeStatsResponse> {
    const { startDate, endDate } = this.calculateDateRange(query);

    // 기본 통계 (평균, 최소, 최대)
    const basicStats = await this.getBasicStats(
      endpointId,
      startDate,
      endDate,
    );

    // 백분위수 (P50, P95, P99)
    const percentiles = await this.getPercentiles(
      endpointId,
      startDate,
      endDate,
    );

    // 시계열 데이터 (시간당 평균)
    const timeSeries = await this.getTimeSeries(
      endpointId,
      startDate,
      endDate,
    );

    const statistics: ResponseTimeStatistics = {
      average: basicStats.avg ? Math.round(parseFloat(basicStats.avg)) : 0,
      min: basicStats.min ? Math.round(parseFloat(basicStats.min)) : 0,
      max: basicStats.max ? Math.round(parseFloat(basicStats.max)) : 0,
      p50: percentiles.p50 ? Math.round(parseFloat(percentiles.p50)) : 0,
      p95: percentiles.p95 ? Math.round(parseFloat(percentiles.p95)) : 0,
      p99: percentiles.p99 ? Math.round(parseFloat(percentiles.p99)) : 0,
    };

    return {
      endpointId,
      period: query.period || ResponseTimePeriod.TWENTY_FOUR_HOURS,
      statistics,
      timeSeries,
    };
  }

  private async getBasicStats(
    endpointId: string,
    startDate: Date,
    endDate: Date,
  ) {
    return await this.checkResultRepository
      .createQueryBuilder('cr')
      .select('AVG(cr.responseTime)', 'avg')
      .addSelect('MIN(cr.responseTime)', 'min')
      .addSelect('MAX(cr.responseTime)', 'max')
      .where('cr.endpointId = :endpointId', { endpointId })
      .andWhere('cr.status = :status', { status: 'success' })
      .andWhere('cr.checkedAt >= :startDate', { startDate })
      .andWhere('cr.checkedAt <= :endDate', { endDate })
      .getRawOne();
  }

  private async getPercentiles(
    endpointId: string,
    startDate: Date,
    endDate: Date,
  ) {
    // PostgreSQL의 PERCENTILE_CONT 함수 사용
    const result = await this.checkResultRepository
      .createQueryBuilder('cr')
      .select(
        `PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY cr.responseTime)`,
        'p50',
      )
      .addSelect(
        `PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY cr.responseTime)`,
        'p95',
      )
      .addSelect(
        `PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY cr.responseTime)`,
        'p99',
      )
      .where('cr.endpointId = :endpointId', { endpointId })
      .andWhere('cr.status = :status', { status: 'success' })
      .andWhere('cr.checkedAt >= :startDate', { startDate })
      .andWhere('cr.checkedAt <= :endDate', { endDate })
      .getRawOne();

    return result;
  }

  private async getTimeSeries(
    endpointId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<TimeSeriesData[]> {
    // 시간 단위 집계
    const results = await this.checkResultRepository
      .createQueryBuilder('cr')
      .select(`DATE_TRUNC('hour', cr.checkedAt)`, 'timestamp')
      .addSelect('AVG(cr.responseTime)', 'avgResponseTime')
      .where('cr.endpointId = :endpointId', { endpointId })
      .andWhere('cr.status = :status', { status: 'success' })
      .andWhere('cr.checkedAt >= :startDate', { startDate })
      .andWhere('cr.checkedAt <= :endDate', { endDate })
      .groupBy(`DATE_TRUNC('hour', cr.checkedAt)`)
      .orderBy(`DATE_TRUNC('hour', cr.checkedAt)`, 'ASC')
      .getRawMany();

    return results.map((r) => ({
      timestamp: new Date(r.timestamp),
      avgResponseTime: r.avgResponseTime
        ? Math.round(parseFloat(r.avgResponseTime))
        : 0,
    }));
  }

  private calculateDateRange(query: ResponseTimeQueryDto): {
    startDate: Date;
    endDate: Date;
  } {
    const endDate = new Date();
    let startDate: Date;

    switch (query.period) {
      case ResponseTimePeriod.TWENTY_FOUR_HOURS:
        startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);
        break;
      case ResponseTimePeriod.SEVEN_DAYS:
        startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case ResponseTimePeriod.THIRTY_DAYS:
        startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);
    }

    return { startDate, endDate };
  }
}
