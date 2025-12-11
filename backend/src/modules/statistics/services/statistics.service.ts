import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, MoreThan } from 'typeorm';
import {
  UptimeQueryDto,
  UptimeStatsResponse,
} from '../dto/uptime-query.dto';
import {
  ResponseTimeQueryDto,
  ResponseTimeStatsResponse,
} from '../dto/response-time-query.dto';
import {
  OverviewResponseDto,
  StatusBreakdownDto,
} from '../dto/overview-response.dto';
import {
  ComparisonResponseDto,
  EndpointComparisonDto,
} from '../dto/comparison-response.dto';
import {
  IncidentQueryDto,
  IncidentListResponse,
  IncidentDetailResponse,
} from '../dto/incident-query.dto';
import { TimeseriesQueryDto, TimeseriesPeriod } from '../dto/timeseries-query.dto';
import { StatusDistributionResponseDto } from '../dto/status-distribution.dto';
import {
  UptimeTimeseriesResponseDto,
  ResponseTimeTimeseriesResponseDto,
  TimeseriesDataPointDto,
} from '../dto/timeseries-response.dto';
import { CheckResult } from '../../health-check/check-result.entity';
import { Endpoint } from '../../endpoint/endpoint.entity';
import { Incident } from '../../incident/incident.entity';
import { UptimeCalculatorService } from './uptime-calculator.service';
import { ResponseTimeAnalyzerService } from './response-time-analyzer.service';
import { CacheManagerService } from './cache-manager.service';
import { IncidentService } from './incident.service';

@Injectable()
export class StatisticsService {
  private readonly logger = new Logger(StatisticsService.name);

  constructor(
    @InjectRepository(CheckResult)
    private checkResultRepository: Repository<CheckResult>,
    @InjectRepository(Endpoint)
    private endpointRepository: Repository<Endpoint>,
    @InjectRepository(Incident)
    private incidentRepository: Repository<Incident>,
    private uptimeCalculator: UptimeCalculatorService,
    private responseTimeAnalyzer: ResponseTimeAnalyzerService,
    private cacheManager: CacheManagerService,
    private incidentService: IncidentService,
  ) {}

  /**
   * 가동률 통계 조회
   */
  async getUptimeStats(
    endpointId: string,
    query: UptimeQueryDto,
  ): Promise<UptimeStatsResponse> {
    const cacheKey = `uptime:${endpointId}:${query.period}`;
    const cached = await this.cacheManager.get<UptimeStatsResponse>(cacheKey);
    if (cached) return cached;

    const result = await this.uptimeCalculator.calculate(endpointId, query);
    await this.cacheManager.set(cacheKey, result);

    return result;
  }

  /**
   * 응답 시간 통계 조회
   */
  async getResponseTimeStats(
    endpointId: string,
    query: ResponseTimeQueryDto,
  ): Promise<ResponseTimeStatsResponse> {
    const cacheKey = `response-time:${endpointId}:${query.period}`;
    const cached = await this.cacheManager.get<ResponseTimeStatsResponse>(
      cacheKey,
    );
    if (cached) return cached;

    const result = await this.responseTimeAnalyzer.analyze(endpointId, query);
    await this.cacheManager.set(cacheKey, result);

    return result;
  }

  /**
   * 전체 통계 개요
   */
  async getOverview(): Promise<OverviewResponseDto> {
    const cacheKey = 'overview:all';
    const cached = await this.cacheManager.get<OverviewResponseDto>(cacheKey);
    if (cached) return cached;

    // 병렬 조회
    const [
      totalEndpoints,
      statusBreakdown,
      overallUptime,
      activeIncidents,
      incidentsLast24h,
      avgResponseTime,
    ] = await Promise.all([
      this.getEndpointCount(),
      this.getStatusBreakdown(),
      this.getOverallUptime(),
      this.getActiveIncidentCount(),
      this.getIncidentsLast24h(),
      this.getAverageResponseTime(),
    ]);

    const result: OverviewResponseDto = {
      totalEndpoints,
      statusBreakdown,
      overallUptime,
      activeIncidents,
      totalIncidentsLast24h: incidentsLast24h,
      averageResponseTime: avgResponseTime,
      cachedAt: new Date(),
    };

    await this.cacheManager.set(cacheKey, result);
    return result;
  }

  /**
   * 인시던트 목록 조회
   */
  async getIncidents(query: IncidentQueryDto): Promise<IncidentListResponse> {
    return await this.incidentService.findAll(query);
  }

  /**
   * 인시던트 상세 조회
   */
  async getIncidentDetail(id: string): Promise<IncidentDetailResponse> {
    return await this.incidentService.findById(id);
  }

  /**
   * 성능 비교
   */
  async getComparison(): Promise<ComparisonResponseDto> {
    const cacheKey = 'comparison:all';
    const cached = await this.cacheManager.get<ComparisonResponseDto>(
      cacheKey,
    );
    if (cached) return cached;

    const endpoints = await this.endpointRepository.find();
    const comparisons = await Promise.all(
      endpoints.map((endpoint) =>
        this.calculateStabilityScore(endpoint),
      ),
    );

    // 점수로 정렬
    const sorted = comparisons
      .sort((a, b) => b.stabilityScore - a.stabilityScore)
      .map((item, index) => ({ ...item, rank: index + 1 }));

    const result: ComparisonResponseDto = {
      data: sorted,
      generatedAt: new Date(),
    };

    await this.cacheManager.set(cacheKey, result, 300); // 5분 캐싱

    return result;
  }

  /**
   * 엔드포인트 개수
   */
  private async getEndpointCount(): Promise<number> {
    return await this.endpointRepository.count();
  }

  /**
   * 상태별 분류
   */
  private async getStatusBreakdown(): Promise<StatusBreakdownDto> {
    const results = await this.endpointRepository
      .createQueryBuilder('e')
      .select('e.currentStatus', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('e.currentStatus')
      .getRawMany();

    const breakdown: StatusBreakdownDto = {
      UP: 0,
      DOWN: 0,
      DEGRADED: 0,
      UNKNOWN: 0,
    };

    results.forEach((r) => {
      breakdown[r.status] = parseInt(r.count);
    });

    return breakdown;
  }

  /**
   * 전체 가동률
   */
  private async getOverallUptime(): Promise<number> {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const result = await this.checkResultRepository
      .createQueryBuilder('cr')
      .select(
        `(COUNT(*) FILTER (WHERE cr.status = 'success') * 100.0 / COUNT(*))`,
        'uptime',
      )
      .where('cr.checkedAt >= :startDate', { startDate: twentyFourHoursAgo })
      .getRawOne();

    const uptime = parseFloat(result.uptime) || 0;
    return Math.round(uptime * 100) / 100;
  }

  /**
   * 활성 인시던트 개수
   */
  private async getActiveIncidentCount(): Promise<number> {
    return await this.incidentRepository.count({
      where: { resolvedAt: IsNull() },
    });
  }

  /**
   * 24시간 인시던트 발생 수
   */
  private async getIncidentsLast24h(): Promise<number> {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    return await this.incidentRepository.count({
      where: { startedAt: MoreThan(twentyFourHoursAgo) },
    });
  }

  /**
   * 평균 응답 시간
   */
  private async getAverageResponseTime(): Promise<number> {
    const result = await this.checkResultRepository
      .createQueryBuilder('cr')
      .select('AVG(cr.responseTime)', 'avg')
      .where('cr.status = :status', { status: 'success' })
      .getRawOne();

    return Math.round(parseFloat(result.avg)) || 0;
  }

  /**
   * 안정성 점수 계산
   */
  private async calculateStabilityScore(
    endpoint: Endpoint,
  ): Promise<EndpointComparisonDto> {
    const [uptime24h, avgResponseTime, incidentCount] = await Promise.all([
      this.getEndpointUptime24h(endpoint.id),
      this.getEndpointAvgResponseTime(endpoint.id),
      this.getEndpointIncidentCount24h(endpoint.id),
    ]);

    // 정규화 (0-1 범위)
    const normalizedResponseTime = Math.min(avgResponseTime / 5000, 1);
    const normalizedIncidentCount = Math.min(incidentCount / 5, 1);

    // 안정성 점수 계산
    // 가동률 60% + 응답시간 30% + 인시던트 10%
    const stabilityScore =
      uptime24h * 0.6 +
      (1 - normalizedResponseTime) * 0.3 +
      (1 - normalizedIncidentCount) * 0.1;

    return {
      endpointId: endpoint.id,
      name: endpoint.name,
      uptime24h: Math.round(uptime24h * 10000) / 100,
      avgResponseTime: Math.round(avgResponseTime),
      incidentCount,
      stabilityScore: Math.round(stabilityScore * 10000) / 100,
      rank: 0,
    };
  }

  /**
   * 엔드포인트별 24시간 가동률
   */
  private async getEndpointUptime24h(endpointId: string): Promise<number> {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const result = await this.checkResultRepository
      .createQueryBuilder('cr')
      .select(
        `(COUNT(*) FILTER (WHERE cr.status = 'success') * 1.0 / COUNT(*))`,
        'uptime',
      )
      .where('cr.endpointId = :endpointId', { endpointId })
      .andWhere('cr.checkedAt >= :startDate', { startDate: twentyFourHoursAgo })
      .getRawOne();

    return parseFloat(result.uptime) || 0;
  }

  /**
   * 엔드포인트별 평균 응답 시간
   */
  private async getEndpointAvgResponseTime(endpointId: string): Promise<number> {
    const result = await this.checkResultRepository
      .createQueryBuilder('cr')
      .select('AVG(cr.responseTime)', 'avg')
      .where('cr.endpointId = :endpointId', { endpointId })
      .andWhere('cr.status = :status', { status: 'success' })
      .getRawOne();

    return parseFloat(result.avg) || 0;
  }

  /**
   * 엔드포인트별 24시간 인시던트 개수
   */
  private async getEndpointIncidentCount24h(
    endpointId: string,
  ): Promise<number> {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    return await this.incidentRepository.count({
      where: {
        endpointId,
        startedAt: MoreThan(twentyFourHoursAgo),
      },
    });
  }

  /**
   * 전체 엔드포인트 상태 분포 조회
   */
  async getStatusDistribution(): Promise<StatusDistributionResponseDto> {
    const cacheKey = 'status-distribution:all';
    const cached =
      await this.cacheManager.get<StatusDistributionResponseDto>(cacheKey);
    if (cached) return cached;

    try {
      const results = await this.endpointRepository
        .createQueryBuilder('e')
        .select('e.currentStatus', 'status')
        .addSelect('COUNT(*)', 'count')
        .groupBy('e.currentStatus')
        .getRawMany();

      const distribution: StatusDistributionResponseDto = {
        UP: 0,
        DOWN: 0,
        DEGRADED: 0,
        UNKNOWN: 0,
        total: 0,
        generatedAt: new Date(),
      };

      results.forEach((r) => {
        const count = parseInt(r.count);
        distribution[r.status] = count;
        distribution.total += count;
      });

      // 캐싱 (30초)
      await this.cacheManager.set(cacheKey, distribution, 30);

      return distribution;
    } catch (error) {
      this.logger.error('상태 분포 조회 실패', error);
      throw error;
    }
  }

  /**
   * 전체 엔드포인트 가동률 시계열 조회
   */
  async getUptimeTimeseries(
    query: TimeseriesQueryDto,
  ): Promise<UptimeTimeseriesResponseDto> {
    const period = query.period || TimeseriesPeriod.HOURLY;
    const hours = query.hours || 24;
    const cacheKey = `uptime-timeseries:${period}:${hours}`;
    const cached =
      await this.cacheManager.get<UptimeTimeseriesResponseDto>(cacheKey);
    if (cached) return cached;

    try {
      const startTime = new Date(Date.now() - hours * 60 * 60 * 1000);
      const truncFormat = period === TimeseriesPeriod.HOURLY ? 'hour' : 'day';

      // PostgreSQL DATE_TRUNC을 사용한 시계열 집계
      const results = await this.checkResultRepository
        .createQueryBuilder('cr')
        .select(`DATE_TRUNC('${truncFormat}', cr.checkedAt)`, 'time_bucket')
        .addSelect(
          `(COUNT(*) FILTER (WHERE cr.status = 'success') * 100.0 / COUNT(*))`,
          'uptime',
        )
        .where('cr.checkedAt >= :startTime', { startTime })
        .groupBy('time_bucket')
        .orderBy('time_bucket', 'ASC')
        .getRawMany();

      // 데이터 포인트 변환
      const dataPoints: TimeseriesDataPointDto[] = results.map((r) => ({
        timestamp: new Date(r.time_bucket),
        value: parseFloat(r.uptime) || 0,
      }));

      // 평균 계산
      const average =
        dataPoints.length > 0
          ? dataPoints.reduce((sum, point) => sum + point.value, 0) /
            dataPoints.length
          : 0;

      const response: UptimeTimeseriesResponseDto = {
        period,
        hours,
        data: dataPoints,
        average: Math.round(average * 100) / 100,
        generatedAt: new Date(),
      };

      // 캐싱 (60초)
      await this.cacheManager.set(cacheKey, response, 60);

      return response;
    } catch (error) {
      this.logger.error('가동률 시계열 조회 실패', error);
      throw error;
    }
  }

  /**
   * 전체 엔드포인트 응답 시간 시계열 조회
   */
  async getResponseTimeTimeseries(
    query: TimeseriesQueryDto,
  ): Promise<ResponseTimeTimeseriesResponseDto> {
    const period = query.period || TimeseriesPeriod.HOURLY;
    const hours = query.hours || 24;
    const cacheKey = `response-time-timeseries:${period}:${hours}`;
    const cached =
      await this.cacheManager.get<ResponseTimeTimeseriesResponseDto>(cacheKey);
    if (cached) return cached;

    try {
      const startTime = new Date(Date.now() - hours * 60 * 60 * 1000);
      const truncFormat = period === TimeseriesPeriod.HOURLY ? 'hour' : 'day';

      // PostgreSQL DATE_TRUNC을 사용한 시계열 집계
      const results = await this.checkResultRepository
        .createQueryBuilder('cr')
        .select(`DATE_TRUNC('${truncFormat}', cr.checkedAt)`, 'time_bucket')
        .addSelect('AVG(cr.responseTime)', 'avg_response_time')
        .where('cr.checkedAt >= :startTime', { startTime })
        .andWhere('cr.status = :status', { status: 'success' })
        .groupBy('time_bucket')
        .orderBy('time_bucket', 'ASC')
        .getRawMany();

      // 데이터 포인트 변환
      const dataPoints: TimeseriesDataPointDto[] = results.map((r) => ({
        timestamp: new Date(r.time_bucket),
        value: parseFloat(r.avg_response_time) || 0,
      }));

      // 통계 계산
      const values = dataPoints.map((p) => p.value);
      const average =
        values.length > 0
          ? values.reduce((sum, val) => sum + val, 0) / values.length
          : 0;
      const min = values.length > 0 ? Math.min(...values) : 0;
      const max = values.length > 0 ? Math.max(...values) : 0;

      // P95 계산
      const sortedValues = [...values].sort((a, b) => a - b);
      const p95Index = Math.ceil(sortedValues.length * 0.95) - 1;
      const p95 = sortedValues.length > 0 ? sortedValues[p95Index] || 0 : 0;

      const response: ResponseTimeTimeseriesResponseDto = {
        period,
        hours,
        data: dataPoints,
        average: Math.round(average * 100) / 100,
        min: Math.round(min * 100) / 100,
        max: Math.round(max * 100) / 100,
        p95: Math.round(p95 * 100) / 100,
        generatedAt: new Date(),
      };

      // 캐싱 (60초)
      await this.cacheManager.set(cacheKey, response, 60);

      return response;
    } catch (error) {
      this.logger.error('응답 시간 시계열 조회 실패', error);
      throw error;
    }
  }
}
