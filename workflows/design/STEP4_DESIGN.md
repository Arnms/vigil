# Step 4 상세 설계 문서: 통계 API & 최적화

**작성일**: 2025-10-22
**상태**: 설계 초안
**기간**: Day 7

---

## 📋 목차

1. [개요](#개요)
2. [전체 아키텍처](#전체-아키텍처)
3. [1단계: Statistics 모듈 구현](#1단계-statistics-모듈-구현)
4. [2단계: 가동률 API 구현](#2단계-가동률-api-구현)
5. [3단계: 응답 시간 통계 API 구현](#3단계-응답-시간-통계-api-구현)
6. [4단계: 전체 통계 API 구현](#4단계-전체-통계-api-구현)
7. [5단계: 인시던트 조회 API 구현](#5단계-인시던트-조회-api-구현)
8. [6단계: 성능 비교 API 구현](#6단계-성능-비교-api-구현)
9. [7단계: 데이터베이스 최적화](#7단계-데이터베이스-최적화)
10. [Redis 캐싱 전략](#redis-캐싱-전략)
11. [에러 처리 전략](#에러-처리-전략)
12. [데이터 플로우](#데이터-플로우)
13. [구현 체크리스트](#구현-체크리스트)

---

## 개요

### 목표
- ✅ Statistics 모듈 구현
- ✅ 가동률(Uptime) 통계 API 개발
- ✅ 응답 시간 통계 API 개발 (백분위수 포함)
- ✅ 전체 엔드포인트 대시보드 API 개발
- ✅ 인시던트 관리 API 개발
- ✅ 엔드포인트별 성능 비교 API 개발
- ✅ 데이터베이스 인덱스 최적화
- ✅ Redis 캐싱으로 성능 개선

### 기대 효과
- 모니터링된 엔드포인트들의 통계 정보 제공
- 대시보드에 필요한 요약 데이터 제공
- 성능 목표: 단일 조회 < 100ms, 전체 조회 < 200ms
- 확장성: 대량 데이터(10만+ 체크 결과)도 < 500ms에 처리

---

## 전체 아키텍처

### 시스템 흐름도

```
┌────────────────────────────────────────────────────────────────┐
│                    Statistics 모듈 요청                         │
│  (프론트엔드 대시보드에서 실시간 데이터 조회)                     │
└────────────────────────────────────────────────────────────────┘
                            ↓
┌────────────────────────────────────────────────────────────────┐
│                 Statistics Service (데이터 조율)                │
│                                                                │
│  1. Redis 캐시 확인 (TTL: 1분)                                 │
│  2. 캐시 없으면 DB 쿼리                                        │
│  3. 쿼리 최적화 (인덱스, 복합 쿼리)                             │
│  4. 결과 캐싱                                                   │
│  5. 응답 데이터 포맷팅                                          │
└────────────────────────────────────────────────────────────────┘
                      ↓                ↓                ↓
        ┌─────────────────────┬──────────────────┬──────────────────┐
        │                     │                  │                  │
        ▼                     ▼                  ▼                  ▼
┌──────────────────┐  ┌──────────────────┐  ┌────────────────┐  ┌──────────────┐
│  Uptime Stats    │  │  Response Time   │  │  Overview API  │  │ Incidents    │
│  · 가동률 계산    │  │  · 평균 응답시간 │  │  · 상태별 분류  │  │  · 조회      │
│  · 기간별 필터   │  │  · 백분위수      │  │  · 활성 인시던트│  │  · 상세      │
│  · QueryBuilder  │  │  · 시계열 데이터 │  │  · 전체 가동률 │  │  · 페이지화  │
└──────────────────┘  └──────────────────┘  └────────────────┘  └──────────────┘
        ↓                     ↓                  ↓                  ↓
    PostgreSQL DB (TypeORM QueryBuilder)
    ├─ check_results 테이블 (인덱스 활용)
    ├─ endpoints 테이블
    ├─ incidents 테이블
    └─ 데이터베이스 함수/뷰
```

### 디렉토리 구조

```
src/modules/statistics/
├── dto/
│   ├── uptime-query.dto.ts
│   ├── response-time-query.dto.ts
│   ├── overview-response.dto.ts
│   ├── comparison-response.dto.ts
│   └── incident-query.dto.ts
├── entities/ (기존 사용)
│   ├── check-result.entity.ts
│   ├── incident.entity.ts
│   └── endpoint.entity.ts
├── services/
│   ├── statistics.service.ts (메인 서비스)
│   ├── uptime-calculator.service.ts (가동률 계산)
│   ├── response-time-analyzer.service.ts (응답시간 분석)
│   ├── incident-service.ts (인시던트 조회)
│   └── cache-manager.service.ts (Redis 캐싱)
├── statistics.controller.ts
├── statistics.module.ts
└── README.md
```

---

## 1단계: Statistics 모듈 구현

### 1.1 DTO 설계

#### `uptime-query.dto.ts`

```typescript
import { IsEnum, IsOptional, IsISO8601, IsString } from 'class-validator';

export enum UptimePeriod {
  TWENTY_FOUR_HOURS = '24h',
  SEVEN_DAYS = '7d',
  THIRTY_DAYS = '30d',
  CUSTOM = 'custom',
}

export class UptimeQueryDto {
  @IsEnum(UptimePeriod)
  @IsOptional()
  period?: UptimePeriod = UptimePeriod.TWENTY_FOUR_HOURS;

  @IsISO8601()
  @IsOptional()
  startDate?: string; // period=custom일 때만

  @IsISO8601()
  @IsOptional()
  endDate?: string; // period=custom일 때만
}
```

#### `response-time-query.dto.ts`

```typescript
import { IsEnum, IsOptional } from 'class-validator';

export enum ResponseTimePeriod {
  TWENTY_FOUR_HOURS = '24h',
  SEVEN_DAYS = '7d',
  THIRTY_DAYS = '30d',
}

export class ResponseTimeQueryDto {
  @IsEnum(ResponseTimePeriod)
  @IsOptional()
  period?: ResponseTimePeriod = ResponseTimePeriod.TWENTY_FOUR_HOURS;
}
```

#### `incident-query.dto.ts`

```typescript
import { IsOptional, IsEnum, IsNumber, Min, Max } from 'class-validator';

export enum IncidentStatus {
  ACTIVE = 'active',
  RESOLVED = 'resolved',
}

export class IncidentQueryDto {
  @IsOptional()
  @IsEnum(IncidentStatus)
  status?: IncidentStatus;

  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
```

#### `overview-response.dto.ts`

```typescript
export class StatusBreakdownDto {
  UP: number;
  DOWN: number;
  DEGRADED: number;
  UNKNOWN: number;
}

export class OverviewResponseDto {
  totalEndpoints: number;
  statusBreakdown: StatusBreakdownDto;
  overallUptime: number;
  activeIncidents: number;
  totalIncidentsLast24h: number;
  averageResponseTime: number;
  cachedAt?: Date;
}
```

#### `comparison-response.dto.ts`

```typescript
export class EndpointComparisonDto {
  endpointId: string;
  name: string;
  uptime24h: number;
  avgResponseTime: number;
  incidentCount: number;
  stabilityScore: number;
  rank: number;
}

export class ComparisonResponseDto {
  data: EndpointComparisonDto[];
  generatedAt: Date;
}
```

### 1.2 Statistics Controller 설계

```typescript
// statistics.controller.ts

import {
  Controller,
  Get,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { StatisticsService } from './services/statistics.service';
import { UptimeQueryDto } from './dto/uptime-query.dto';
import { ResponseTimeQueryDto } from './dto/response-time-query.dto';
import { IncidentQueryDto } from './dto/incident-query.dto';

@Controller('api/statistics')
@ApiTags('Statistics')
export class StatisticsController {
  constructor(private statisticsService: StatisticsService) {}

  // 1. 특정 엔드포인트 가동률 조회
  @Get('endpoints/:id/uptime')
  @HttpCode(200)
  @ApiOperation({ summary: '엔드포인트 가동률 조회' })
  async getUptime(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: UptimeQueryDto,
  ) {
    return await this.statisticsService.getUptimeStats(id, query);
  }

  // 2. 특정 엔드포인트 응답 시간 통계 조회
  @Get('endpoints/:id/response-time')
  @HttpCode(200)
  @ApiOperation({ summary: '응답 시간 통계 조회' })
  async getResponseTime(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: ResponseTimeQueryDto,
  ) {
    return await this.statisticsService.getResponseTimeStats(id, query);
  }

  // 3. 전체 엔드포인트 통계 개요
  @Get('overview')
  @HttpCode(200)
  @ApiOperation({ summary: '전체 통계 개요' })
  async getOverview() {
    return await this.statisticsService.getOverview();
  }

  // 4. 인시던트 목록 조회
  @Get('incidents')
  @HttpCode(200)
  @ApiOperation({ summary: '인시던트 목록 조회' })
  async getIncidents(@Query() query: IncidentQueryDto) {
    return await this.statisticsService.getIncidents(query);
  }

  // 5. 인시던트 상세 조회
  @Get('incidents/:id')
  @HttpCode(200)
  @ApiOperation({ summary: '인시던트 상세 조회' })
  async getIncidentDetail(@Param('id', ParseUUIDPipe) id: string) {
    return await this.statisticsService.getIncidentDetail(id);
  }

  // 6. 엔드포인트 성능 비교
  @Get('comparison')
  @HttpCode(200)
  @ApiOperation({ summary: '엔드포인트 성능 비교' })
  async getComparison() {
    return await this.statisticsService.getComparison();
  }
}
```

### 1.3 Statistics Service 개요

```typescript
// statistics.service.ts (개요)

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
    // 캐시 확인
    const cacheKey = `uptime:${endpointId}:${query.period}`;
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) return cached;

    // 데이터 조회
    const result = await this.uptimeCalculator.calculate(endpointId, query);

    // 캐싱
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
    const cached = await this.cacheManager.get(cacheKey);
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
    const cached = await this.cacheManager.get(cacheKey);
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
  async getIncidents(query: IncidentQueryDto) {
    return await this.incidentService.findAll(query);
  }

  /**
   * 인시던트 상세 조회
   */
  async getIncidentDetail(id: string) {
    return await this.incidentService.findById(id);
  }

  /**
   * 성능 비교
   */
  async getComparison(): Promise<ComparisonResponseDto> {
    const cacheKey = 'comparison:all';
    const cached = await this.cacheManager.get(cacheKey);
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

    await this.cacheManager.set(cacheKey, result);
    return result;
  }

  // 내부 헬퍼 메서드들...
}
```

---

## 2단계: 가동률 API 구현

### 2.1 UptimeCalculatorService

```typescript
// uptime-calculator.service.ts

@Injectable()
export class UptimeCalculatorService {
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

    const totalChecks = parseInt(result.totalChecks) || 0;
    const successfulChecks = parseInt(result.successfulChecks) || 0;
    const uptime =
      totalChecks === 0 ? 0 : (successfulChecks / totalChecks) * 100;

    return {
      endpointId,
      period: query.period,
      uptime: Math.round(uptime * 100) / 100,
      totalChecks,
      successfulChecks,
      failedChecks: parseInt(result.failedChecks) || 0,
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
        startDate = new Date(query.startDate);
        if (query.endDate) {
          return { startDate, endDate: new Date(query.endDate) };
        }
        break;
      default:
        startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);
    }

    return { startDate, endDate };
  }
}
```

---

## 3단계: 응답 시간 통계 API 구현

### 3.1 ResponseTimeAnalyzerService

```typescript
// response-time-analyzer.service.ts

@Injectable()
export class ResponseTimeAnalyzerService {
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

    return {
      endpointId,
      period: query.period,
      statistics: {
        average: Math.round(basicStats.avg),
        min: Math.round(basicStats.min),
        max: Math.round(basicStats.max),
        p50: Math.round(percentiles.p50),
        p95: Math.round(percentiles.p95),
        p99: Math.round(percentiles.p99),
      },
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
  ) {
    // 시간 단위 집계
    const results = await this.checkResultRepository
      .createQueryBuilder('cr')
      .select(
        `DATE_TRUNC('hour', cr.checkedAt)`,
        'timestamp',
      )
      .addSelect('AVG(cr.responseTime)', 'avgResponseTime')
      .where('cr.endpointId = :endpointId', { endpointId })
      .andWhere('cr.status = :status', { status: 'success' })
      .andWhere('cr.checkedAt >= :startDate', { startDate })
      .andWhere('cr.checkedAt <= :endDate', { endDate })
      .groupBy(`DATE_TRUNC('hour', cr.checkedAt)`)
      .orderBy(`DATE_TRUNC('hour', cr.checkedAt)`, 'ASC')
      .getRawMany();

    return results.map((r) => ({
      timestamp: r.timestamp,
      avgResponseTime: Math.round(r.avgResponseTime),
    }));
  }

  private calculateDateRange(query: ResponseTimeQueryDto) {
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
```

---

## 4단계: 전체 통계 API 구현

### 4.1 Overview 관련 메서드들

```typescript
// statistics.service.ts 내 헬퍼 메서드들

private async getEndpointCount(): Promise<number> {
  return await this.endpointRepository.count();
}

private async getStatusBreakdown(): Promise<StatusBreakdownDto> {
  const results = await this.endpointRepository
    .createQueryBuilder('e')
    .select('e.currentStatus', 'status')
    .addSelect('COUNT(*)', 'count')
    .groupBy('e.currentStatus')
    .getRawMany();

  const breakdown = {
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

  return Math.round(parseFloat(result.uptime) * 100) / 100 || 0;
}

private async getActiveIncidentCount(): Promise<number> {
  return await this.incidentRepository.count({
    where: { resolvedAt: IsNull() },
  });
}

private async getIncidentsLast24h(): Promise<number> {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  return await this.incidentRepository.count({
    where: { startedAt: MoreThan(twentyFourHoursAgo) },
  });
}

private async getAverageResponseTime(): Promise<number> {
  const result = await this.checkResultRepository
    .createQueryBuilder('cr')
    .select('AVG(cr.responseTime)', 'avg')
    .where('cr.status = :status', { status: 'success' })
    .getRawOne();

  return Math.round(result.avg) || 0;
}
```

---

## 5단계: 인시던트 조회 API 구현

### 5.1 IncidentService

```typescript
// incident.service.ts

@Injectable()
export class IncidentService {
  constructor(
    @InjectRepository(Incident)
    private incidentRepository: Repository<Incident>,
    @InjectRepository(CheckResult)
    private checkResultRepository: Repository<CheckResult>,
  ) {}

  /**
   * 인시던트 목록 조회
   */
  async findAll(query: IncidentQueryDto) {
    let qb = this.incidentRepository
      .createQueryBuilder('incident')
      .leftJoinAndSelect('incident.endpoint', 'endpoint');

    if (query.status === IncidentStatus.ACTIVE) {
      qb = qb.where('incident.resolvedAt IS NULL');
    } else if (query.status === IncidentStatus.RESOLVED) {
      qb = qb.where('incident.resolvedAt IS NOT NULL');
    }

    qb = qb.orderBy('incident.startedAt', 'DESC');

    const total = await qb.getCount();
    const data = await qb
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getMany();

    return {
      data: data.map((incident) => ({
        id: incident.id,
        endpointId: incident.endpointId,
        endpointName: incident.endpoint?.name,
        startedAt: incident.startedAt,
        resolvedAt: incident.resolvedAt,
        duration: incident.duration,
        failureCount: incident.failureCount,
        errorMessage: incident.errorMessage,
      })),
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  /**
   * 인시던트 상세 조회
   */
  async findById(id: string) {
    const incident = await this.incidentRepository
      .createQueryBuilder('incident')
      .leftJoinAndSelect('incident.endpoint', 'endpoint')
      .where('incident.id = :id', { id })
      .getOne();

    if (!incident) {
      throw new NotFoundException('Incident not found');
    }

    // 관련 체크 결과 조회
    const checkResults = await this.checkResultRepository
      .createQueryBuilder('cr')
      .where('cr.endpointId = :endpointId', {
        endpointId: incident.endpointId,
      })
      .andWhere('cr.checkedAt >= :startDate', {
        startDate: incident.startedAt,
      })
      .andWhere('cr.checkedAt <= :endDate', {
        endDate: incident.resolvedAt || new Date(),
      })
      .orderBy('cr.checkedAt', 'DESC')
      .getMany();

    return {
      id: incident.id,
      endpointId: incident.endpointId,
      endpoint: {
        name: incident.endpoint?.name,
        url: incident.endpoint?.url,
      },
      startedAt: incident.startedAt,
      resolvedAt: incident.resolvedAt,
      duration: incident.duration,
      failureCount: incident.failureCount,
      errorMessage: incident.errorMessage,
      checkResults: checkResults.map((cr) => ({
        checkedAt: cr.checkedAt,
        status: cr.status,
        responseTime: cr.responseTime,
        statusCode: cr.statusCode,
        errorMessage: cr.errorMessage,
      })),
    };
  }
}
```

---

## 6단계: 성능 비교 API 구현

### 6.1 Stability Score 계산

```typescript
// statistics.service.ts 내 메서드

private async calculateStabilityScore(
  endpoint: Endpoint,
): Promise<EndpointComparisonDto> {
  // 1. 24시간 가동률
  const uptime24h = await this.getEndpointUptime24h(endpoint.id);

  // 2. 평균 응답 시간
  const avgResponseTime = await this.getEndpointAvgResponseTime(endpoint.id);

  // 3. 24시간 인시던트 발생 횟수
  const incidentCount = await this.getEndpointIncidentCount24h(endpoint.id);

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
    uptime24h: Math.round(uptime24h * 100) / 100,
    avgResponseTime: Math.round(avgResponseTime),
    incidentCount,
    stabilityScore: Math.round(stabilityScore * 100) / 100,
    rank: 0, // 정렬 후 설정
  };
}

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

private async getEndpointAvgResponseTime(endpointId: string): Promise<number> {
  const result = await this.checkResultRepository
    .createQueryBuilder('cr')
    .select('AVG(cr.responseTime)', 'avg')
    .where('cr.endpointId = :endpointId', { endpointId })
    .andWhere('cr.status = :status', { status: 'success' })
    .getRawOne();

  return parseFloat(result.avg) || 0;
}

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
```

---

## 7단계: 데이터베이스 최적화

### 7.1 필수 인덱스 확인 및 추가

```sql
-- check_results 테이블 인덱스
-- 1. 엔드포인트별 조회 (가장 중요)
CREATE INDEX IF NOT EXISTS idx_check_results_endpoint
  ON check_results (endpointId);

-- 2. 시간 기반 조회
CREATE INDEX IF NOT EXISTS idx_check_results_checked_at
  ON check_results (checkedAt DESC);

-- 3. 복합 인덱스: 엔드포인트 + 시간
CREATE INDEX IF NOT EXISTS idx_check_results_endpoint_time
  ON check_results (endpointId, checkedAt DESC);

-- 4. 통계 쿼리 최적화
CREATE INDEX IF NOT EXISTS idx_check_results_stats
  ON check_results (endpointId, status, checkedAt);

-- incidents 테이블 인덱스
-- 5. 활성 인시던트 조회
CREATE INDEX IF NOT EXISTS idx_incidents_active
  ON incidents (endpointId, resolvedAt)
  WHERE resolvedAt IS NULL;

-- 6. 시간 기반 조회
CREATE INDEX IF NOT EXISTS idx_incidents_started_at
  ON incidents (startedAt DESC);

-- endpoints 테이블 인덱스
-- 7. 상태별 조회
CREATE INDEX IF NOT EXISTS idx_endpoints_status
  ON endpoints (currentStatus);
```

### 7.2 EXPLAIN ANALYZE 쿼리 분석

```sql
-- 가동률 쿼리 성능 분석
EXPLAIN ANALYZE
SELECT COUNT(*) as total,
       COUNT(*) FILTER (WHERE status = 'success') as success
FROM check_results
WHERE endpointId = 'endpoint-uuid'
  AND checkedAt >= NOW() - INTERVAL '24 hours'
  AND checkedAt <= NOW();

-- 응답 시간 통계 쿼리 분석
EXPLAIN ANALYZE
SELECT AVG(responseTime) as avg,
       MIN(responseTime) as min,
       MAX(responseTime) as max,
       PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY responseTime) as p95
FROM check_results
WHERE endpointId = 'endpoint-uuid'
  AND status = 'success'
  AND checkedAt >= NOW() - INTERVAL '24 hours';
```

---

## Redis 캐싱 전략

### 8.1 CacheManagerService 구현

```typescript
// cache-manager.service.ts

@Injectable()
export class CacheManagerService {
  private readonly logger = new Logger(CacheManagerService.name);
  private readonly DEFAULT_TTL = 60; // 1분

  constructor(
    @InjectRedis()
    private redis: Redis,
  ) {}

  /**
   * 캐시에서 데이터 조회
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const cached = await this.redis.get(key);
      if (cached) {
        this.logger.debug(`Cache hit: ${key}`);
        return JSON.parse(cached);
      }
      return null;
    } catch (error) {
      this.logger.error(`Cache get failed: ${error.message}`);
      return null;
    }
  }

  /**
   * 캐시에 데이터 저장
   */
  async set<T>(key: string, value: T, ttl: number = this.DEFAULT_TTL): Promise<void> {
    try {
      await this.redis.setex(key, ttl, JSON.stringify(value));
      this.logger.debug(`Cache set: ${key}, TTL: ${ttl}s`);
    } catch (error) {
      this.logger.error(`Cache set failed: ${error.message}`);
    }
  }

  /**
   * 캐시 삭제
   */
  async delete(key: string): Promise<void> {
    try {
      await this.redis.del(key);
      this.logger.debug(`Cache deleted: ${key}`);
    } catch (error) {
      this.logger.error(`Cache delete failed: ${error.message}`);
    }
  }

  /**
   * 패턴으로 캐시 삭제
   */
  async deletePattern(pattern: string): Promise<void> {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
        this.logger.debug(`Deleted ${keys.length} cache keys matching ${pattern}`);
      }
    } catch (error) {
      this.logger.error(`Cache delete pattern failed: ${error.message}`);
    }
  }

  /**
   * 모든 캐시 삭제 (테스트용)
   */
  async clearAll(): Promise<void> {
    try {
      await this.redis.flushdb();
      this.logger.debug('All cache cleared');
    } catch (error) {
      this.logger.error(`Cache clear failed: ${error.message}`);
    }
  }
}
```

### 8.2 캐싱 전략

```
캐시 키 패턴:
- uptime:{endpointId}:{period}  → TTL: 1분
- response-time:{endpointId}:{period}  → TTL: 1분
- overview:all  → TTL: 1분
- comparison:all  → TTL: 5분 (변화 빈도 낮음)

캐시 무효화:
- 새로운 체크 결과 저장 시 관련 캐시 삭제
  └─ uptime:*, response-time:* 패턴 삭제
- 엔드포인트 상태 변경 시
  └─ overview:all, comparison:all 삭제
- 인시던트 생성/해결 시
  └─ overview:all, comparison:all 삭제
```

---

## 에러 처리 전략

### 9.1 발생 가능한 에러

```
1. 엔드포인트를 찾을 수 없음
   ├─ 원인: 유효하지 않은 UUID
   ├─ HTTP: 404 Not Found
   └─ 메시지: "Endpoint not found"

2. 데이터베이스 쿼리 실패
   ├─ 원인: 데이터베이스 연결 끊김
   ├─ HTTP: 500 Internal Server Error
   └─ 로깅: ERROR 레벨로 기록

3. Redis 캐시 실패
   ├─ 원인: Redis 서버 다운
   ├─ 처리: 캐시 무시, DB에서 직접 조회
   └─ 로깅: WARN 레벨로 기록

4. 유효하지 않은 쿼리 파라미터
   ├─ 원인: 잘못된 기간 형식
   ├─ HTTP: 400 Bad Request
   └─ 메시지: 유효성 검사 에러

5. 인시던트를 찾을 수 없음
   ├─ 원인: 유효하지 않은 인시던트 ID
   ├─ HTTP: 404 Not Found
   └─ 메시지: "Incident not found"
```

### 9.2 에러 핸들링

```typescript
// 모든 에러는 NestJS 예외 필터로 처리
- NotFoundException: 리소스를 찾을 수 없음
- BadRequestException: 유효하지 않은 요청
- InternalServerErrorException: 서버 에러

// 각 서비스의 try-catch
- 데이터베이스 오류: 로깅 후 500 반환
- Redis 오류: 로깅 후 캐시 무시
- 외부 API 호출 오류: 로깅 후 처리
```

---

## 데이터 플로우

### 10.1 가동률 API 요청 플로우

```
클라이언트 요청
  ↓
GET /api/statistics/endpoints/{id}/uptime?period=24h
  ↓
StatisticsController.getUptime()
  ├─ 파라미터 검증
  └─ StatisticsService.getUptimeStats() 호출
      ↓
  CacheManagerService.get('uptime:{id}:24h')
      ├─ 캐시 존재 → 캐시된 데이터 반환
      └─ 캐시 없음
          ↓
  UptimeCalculatorService.calculate()
      ├─ QueryBuilder 생성
      │   └─ check_results 집계 쿼리 실행
      ├─ 성공/실패 횟수 계산
      └─ 가동률 계산
      ↓
  CacheManagerService.set('uptime:{id}:24h', result, 60)
      └─ Redis에 1분 TTL로 저장
      ↓
응답 반환
  └─ { endpointId, period, uptime, totalChecks, ... }
```

### 10.2 Overview API 요청 플로우

```
클라이언트 요청
  ↓
GET /api/statistics/overview
  ↓
StatisticsController.getOverview()
  ↓
StatisticsService.getOverview()
  ├─ CacheManagerService.get('overview:all') 확인
  │   └─ 캐시 있으면 반환
  └─ 캐시 없으면 병렬 조회
      ├─ getEndpointCount()
      ├─ getStatusBreakdown()
      ├─ getOverallUptime()
      ├─ getActiveIncidentCount()
      ├─ getIncidentsLast24h()
      └─ getAverageResponseTime()
      ↓ (모두 완료될 때까지 대기)
  결과 조합
      ↓
  CacheManagerService.set('overview:all', result, 60)
      ↓
응답 반환
  └─ { totalEndpoints, statusBreakdown, overallUptime, ... }
```

---

## 구현 체크리스트

### Phase 1: Statistics 모듈 기본 구조
- [ ] `uptime-query.dto.ts` 작성
- [ ] `response-time-query.dto.ts` 작성
- [ ] `incident-query.dto.ts` 작성
- [ ] `overview-response.dto.ts` 작성
- [ ] `comparison-response.dto.ts` 작성
- [ ] `statistics.service.ts` 기본 구조 생성
- [ ] `statistics.controller.ts` 엔드포인트 정의
- [ ] `statistics.module.ts` 작성

### Phase 2: 가동률 API 구현
- [ ] `uptime-calculator.service.ts` 구현
- [ ] `getUptimeStats()` 메서드 구현
- [ ] 기간별 계산 로직 구현 (24h, 7d, 30d, custom)
- [ ] 캐싱 적용
- [ ] API 테스트 (성공/실패 케이스)

### Phase 3: 응답 시간 통계 API 구현
- [ ] `response-time-analyzer.service.ts` 구현
- [ ] `getBasicStats()` 메서드 (평균, 최소, 최대)
- [ ] `getPercentiles()` 메서드 (P50, P95, P99)
- [ ] `getTimeSeries()` 메서드 (시간당 평균)
- [ ] 캐싱 적용
- [ ] API 테스트

### Phase 4: 전체 통계 API 구현
- [ ] `getOverview()` 메서드 구현
- [ ] `getEndpointCount()` 헬퍼 메서드
- [ ] `getStatusBreakdown()` 헬퍼 메서드
- [ ] `getOverallUptime()` 헬퍼 메서드
- [ ] `getActiveIncidentCount()` 헬퍼 메서드
- [ ] `getIncidentsLast24h()` 헬퍼 메서드
- [ ] `getAverageResponseTime()` 헬퍼 메서드
- [ ] 병렬 처리 최적화
- [ ] 캐싱 적용 (TTL: 1분)
- [ ] API 테스트

### Phase 5: 인시던트 조회 API 구현
- [ ] `incident.service.ts` 구현
- [ ] `findAll()` 메서드 (목록, 페이지네이션)
- [ ] `findById()` 메서드 (상세, 관련 체크 결과 포함)
- [ ] 상태 필터링 (active/resolved)
- [ ] API 테스트

### Phase 6: 성능 비교 API 구현
- [ ] `getComparison()` 메서드 구현
- [ ] `calculateStabilityScore()` 메서드
- [ ] 점수 계산 로직 (가동률 60% + 응답시간 30% + 인시던트 10%)
- [ ] 정렬 및 순위 지정
- [ ] 캐싱 적용 (TTL: 5분)
- [ ] API 테스트

### Phase 7: Redis 캐싱 구현
- [ ] `cache-manager.service.ts` 구현
- [ ] `get()` 메서드
- [ ] `set()` 메서드
- [ ] `delete()` 메서드
- [ ] `deletePattern()` 메서드
- [ ] `clearAll()` 메서드 (테스트용)
- [ ] 캐시 무효화 로직 통합

### Phase 8: 데이터베이스 최적화
- [ ] 필수 인덱스 생성/확인
  - [ ] `idx_check_results_endpoint`
  - [ ] `idx_check_results_checked_at`
  - [ ] `idx_check_results_endpoint_time`
  - [ ] `idx_check_results_stats`
  - [ ] `idx_incidents_active`
  - [ ] `idx_incidents_started_at`
  - [ ] `idx_endpoints_status`
- [ ] EXPLAIN ANALYZE 실행 (주요 쿼리)
- [ ] 쿼리 성능 검증
- [ ] N+1 문제 확인/해결

### Phase 9: 통합 테스트
- [ ] 가동률 API 테스트
  ```bash
  GET /api/statistics/endpoints/{id}/uptime?period=24h
  ```
- [ ] 응답 시간 통계 API 테스트
  ```bash
  GET /api/statistics/endpoints/{id}/response-time?period=24h
  ```
- [ ] 전체 통계 API 테스트
  ```bash
  GET /api/statistics/overview
  ```
- [ ] 인시던트 목록 조회 테스트
  ```bash
  GET /api/statistics/incidents
  ```
- [ ] 인시던트 상세 조회 테스트
  ```bash
  GET /api/statistics/incidents/{id}
  ```
- [ ] 성능 비교 API 테스트
  ```bash
  GET /api/statistics/comparison
  ```

### Phase 10: 성능 테스트
- [ ] 단일 엔드포인트 통계 조회: < 100ms
- [ ] 전체 통계 조회: < 200ms
- [ ] 대량 데이터 처리 (10만 개 체크 결과): < 500ms
- [ ] 캐시 히트율 측정
- [ ] 부하 테스트 (동시 요청)

### Phase 11: 에러 처리 및 로깅
- [ ] 404 에러 처리 (엔드포인트/인시던트 없음)
- [ ] 400 에러 처리 (유효하지 않은 쿼리 파라미터)
- [ ] 500 에러 처리 (데이터베이스 오류)
- [ ] Redis 오류 처리 (캐시 실패)
- [ ] 모든 에러 로깅

### Phase 12: 테스트 코드 작성
- [ ] `statistics.service.spec.ts` 작성
- [ ] `uptime-calculator.service.spec.ts` 작성
- [ ] `response-time-analyzer.service.spec.ts` 작성
- [ ] `incident.service.spec.ts` 작성
- [ ] `statistics.controller.spec.ts` 작성

### Phase 13: 최종 검증
- [ ] 모든 API 엔드포인트 동작 확인
- [ ] 성능 목표 달성 확인
- [ ] 캐싱 정상 작동 확인
- [ ] 테스트 커버리지 확인
- [ ] 코드 리뷰 및 최적화

---

## 환경 변수

```env
# Redis (기존)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0

# 통계 캐싱 설정 (선택사항)
STATISTICS_CACHE_TTL=60
COMPARISON_CACHE_TTL=300

# 데이터베이스 (기존)
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=password
DATABASE_NAME=vigil
```

---

## 관련 문서

- [FEATURE_SPECIFICATIONS.md](../docs/FEATURE_SPECIFICATIONS.md#5-통계-및-분석) - 통계 기능 명세
- [API_SPECIFICATIONS.md](../docs/API_SPECIFICATIONS.md#3-통계-api) - 통계 API 명세
- [DATABASE_SCHEMA.md](../docs/DATABASE_SCHEMA.md#5-데이터베이스-함수-및-뷰) - 스키마 및 최적화

---

## 참고 자료

- [TypeORM QueryBuilder](https://typeorm.io/select-query-builder)
- [PostgreSQL Aggregate Functions](https://www.postgresql.org/docs/current/functions-aggregate.html)
- [PostgreSQL Window Functions](https://www.postgresql.org/docs/current/functions-window.html)
- [Redis Caching Patterns](https://redis.io/docs/management/client-side-caching/)

---

**문서 작성**: 2025-10-22
**상태**: 설계 초안 완성
