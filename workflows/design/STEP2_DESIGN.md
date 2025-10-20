# Step 2 상세 설계 문서: 엔드포인트 & 헬스 체크

**작성일**: 2025-10-20
**상태**: 설계 확인됨
**기간**: Day 3-4

---

## 📋 목차

1. [개요](#개요)
2. [전체 아키텍처](#전체-아키텍처)
3. [1단계: Endpoint CRUD API](#1단계-endpoint-crud-api)
4. [2단계: Bull Queue 설정](#2단계-bull-queue-설정)
5. [3단계: Health Check 로직](#3단계-health-check-로직)
6. [4단계: 체크 결과 저장 및 인시던트 처리](#4단계-체크-결과-저장-및-인시던트-처리)
7. [에러 처리 전략](#에러-처리-전략)
8. [데이터 플로우](#데이터-플로우)
9. [구현 체크리스트](#구현-체크리스트)

---

## 개요

### 목표
- ✅ 엔드포인트 관리 API (CRUD) 구현
- ✅ Bull Queue를 이용한 주기적 헬스 체크 시스템 구축
- ✅ HTTP 요청 수행 및 상태 판정 로직 구현
- ✅ 체크 결과 저장 및 상태 업데이트 자동화
- ✅ 인시던트 자동 생성/종료 처리

### 기대 효과
- 엔드포인트를 등록하면 자동으로 주기적 모니터링 시작
- 장애 발생 시 자동으로 인시던트 생성
- 복구 시 자동으로 인시던트 종료

---

## 전체 아키텍처

### 시스템 흐름도

```
┌────────────────────────────────────────────────────────────────┐
│                     클라이언트 요청                             │
└────────────────────────────────────────────────────────────────┘
                            ↓
┌────────────────────────────────────────────────────────────────┐
│          Endpoint Controller & Service (CRUD)                  │
│  ┌──────────────┬──────────────┬──────────────┬──────────────┐ │
│  │   등록(POST) │   목록(GET)  │  상세(GET)   │   수정(PATCH)│ │
│  │              │              │              │              │ │
│  │ • 검증       │ • 페이지     │ • 통계 포함  │ • 간격 변경  │ │
│  │ • DB 저장    │ • 필터링     │ • 최근 사건  │ • Queue 재  │ │
│  │ • Queue 추가 │ • 정렬       │              │   스케줄    │ │
│  └──────────────┴──────────────┴──────────────┴──────────────┘ │
└────────────────────────────────────────────────────────────────┘
                            ↓
┌────────────────────────────────────────────────────────────────┐
│           Bull Queue (Redis 기반 작업 큐)                      │
│                                                                │
│  엔드포인트 등록 시:                                           │
│  1. HEALTH_CHECK_QUEUE에 Repeatable Job 생성                  │
│  2. repeat: { every: checkInterval * 1000 }  ← 밀리초 단위   │
│  3. 즉시 첫 실행 (removeOnComplete: false)                    │
│                                                                │
│  엔드포인트 수정 시:                                           │
│  1. 기존 Job 제거                                             │
│  2. 새로운 간격으로 Job 생성                                   │
│                                                                │
│  엔드포인트 삭제 시:                                           │
│  1. 관련 Job 모두 제거                                        │
└────────────────────────────────────────────────────────────────┘
                            ↓
┌────────────────────────────────────────────────────────────────┐
│           Health Check Processor (작업 처리)                   │
│                                                                │
│  @Process('HEALTH_CHECK_QUEUE')                               │
│  async performHealthCheck(job: Job) {                         │
│    1️⃣  엔드포인트 정보 조회 (DB)                              │
│    2️⃣  HTTP 요청 수행 (axios)                                │
│    3️⃣  응답 분석 (상태코드, 시간)                             │
│    4️⃣  상태 판정 (UP/DOWN/DEGRADED)                          │
│    5️⃣  CheckResult 저장                                       │
│    6️⃣  Endpoint 상태 업데이트                                 │
│    7️⃣  Incident 처리                                          │
│  }                                                             │
└────────────────────────────────────────────────────────────────┘
                            ↓
┌────────────────────────────────────────────────────────────────┐
│              데이터베이스 (PostgreSQL)                          │
│                                                                │
│  endpoints:                                                    │
│    • currentStatus 업데이트                                    │
│    • lastResponseTime, lastCheckedAt 업데이트                  │
│    • consecutiveFailures 업데이트                              │
│                                                                │
│  check_results:                                                │
│    • 모든 체크 결과 저장 (성공/실패)                           │
│                                                                │
│  incidents:                                                    │
│    • DOWN 감지 시 새 레코드 생성                               │
│    • UP 복구 시 resolvedAt 설정                               │
└────────────────────────────────────────────────────────────────┘
```

---

## 1단계: Endpoint CRUD API

### 디렉토리 구조

```
src/modules/endpoint/
├── dto/
│   ├── create-endpoint.dto.ts
│   ├── update-endpoint.dto.ts
│   └── endpoint-list-query.dto.ts
├── entities/
│   └── endpoint.entity.ts (이미 생성)
├── endpoint.controller.ts
├── endpoint.service.ts
├── endpoint.module.ts
└── README.md
```

### 1.1 DTO 설계

#### `create-endpoint.dto.ts`
```typescript
import { IsString, IsUrl, IsEnum, IsObject, IsOptional, IsNumber, IsPositive, Min, Max } from 'class-validator';

export enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
  PATCH = 'PATCH',
  HEAD = 'HEAD',
  OPTIONS = 'OPTIONS',
}

export class CreateEndpointDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsUrl()
  @IsNotEmpty()
  url: string;

  @IsEnum(HttpMethod)
  @IsOptional()
  method?: HttpMethod = HttpMethod.GET;

  @IsObject()
  @IsOptional()
  headers?: Record<string, string>;

  @IsObject()
  @IsOptional()
  body?: Record<string, any>;

  @IsNumber()
  @IsPositive()
  @Min(30) // 최소 30초
  checkInterval: number; // 초 단위

  @IsNumber()
  @Min(100)
  @Max(599)
  expectedStatusCode?: number = 200;

  @IsNumber()
  @Min(1000)
  @Max(60000) // 1초 ~ 60초
  timeoutThreshold?: number = 5000; // 밀리초 단위
}
```

#### `update-endpoint.dto.ts`
```typescript
// CreateEndpointDto의 모든 필드가 선택사항
export class UpdateEndpointDto extends PartialType(CreateEndpointDto) {}
```

#### `endpoint-list-query.dto.ts`
```typescript
import { IsOptional, IsEnum, IsBoolean, IsNumber, Min } from 'class-validator';

export enum EndpointStatus {
  UP = 'UP',
  DOWN = 'DOWN',
  DEGRADED = 'DEGRADED',
  UNKNOWN = 'UNKNOWN',
}

export enum SortBy {
  NAME = 'name',
  CREATED = 'createdAt',
  LAST_CHECKED = 'lastCheckedAt',
  STATUS = 'currentStatus',
}

export enum Order {
  ASC = 'ASC',
  DESC = 'DESC',
}

export class EndpointListQueryDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsEnum(EndpointStatus)
  status?: EndpointStatus;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isActive?: boolean;

  @IsOptional()
  @IsEnum(SortBy)
  sortBy?: SortBy = SortBy.CREATED;

  @IsOptional()
  @IsEnum(Order)
  order?: Order = Order.DESC;
}
```

### 1.2 Service 메서드 설계

```typescript
export class EndpointService {
  constructor(
    @InjectRepository(Endpoint)
    private endpointRepository: Repository<Endpoint>,
    @InjectRepository(CheckResult)
    private checkResultRepository: Repository<CheckResult>,
    @InjectRepository(Incident)
    private incidentRepository: Repository<Incident>,
    private healthCheckService: HealthCheckService, // Bull Queue 관리
  ) {}

  // 1. 등록
  async create(dto: CreateEndpointDto): Promise<Endpoint> {
    const endpoint = this.endpointRepository.create({
      ...dto,
      currentStatus: 'UNKNOWN',
      consecutiveFailures: 0,
    });
    await this.endpointRepository.save(endpoint);

    // 💡 헬스 체크 스케줄 추가
    await this.healthCheckService.scheduleHealthCheck(endpoint);

    return endpoint;
  }

  // 2. 목록 조회
  async findAll(query: EndpointListQueryDto): Promise<{
    data: Endpoint[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    let qb = this.endpointRepository.createQueryBuilder('endpoint');

    // 필터링
    if (query.status) qb = qb.where('endpoint.currentStatus = :status', { status: query.status });
    if (query.isActive !== undefined) qb = qb.andWhere('endpoint.isActive = :isActive', { isActive: query.isActive });

    // 정렬
    qb = qb.orderBy(`endpoint.${query.sortBy}`, query.order);

    // 페이지네이션
    const total = await qb.getCount();
    const data = await qb
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getMany();

    return {
      data,
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  // 3. 상세 조회 (통계 포함)
  async findOne(id: string): Promise<Endpoint> {
    const endpoint = await this.endpointRepository.findOne({ where: { id } });
    if (!endpoint) throw new NotFoundException('Endpoint not found');

    // 💡 최근 24시간 통계 조회 (추후 Statistics 서비스로 이동)
    // endpoint.statistics = await this.getStatistics(id);
    // endpoint.recentIncidents = await this.getRecentIncidents(id, 10);

    return endpoint;
  }

  // 4. 수정
  async update(id: string, dto: UpdateEndpointDto): Promise<Endpoint> {
    const endpoint = await this.findOne(id);

    // checkInterval이 변경된 경우 재스케줄
    const intervalChanged = dto.checkInterval && dto.checkInterval !== endpoint.checkInterval;

    Object.assign(endpoint, dto);
    await this.endpointRepository.save(endpoint);

    if (intervalChanged) {
      // 💡 기존 Job 제거 후 새로 스케줄
      await this.healthCheckService.rescheduleHealthCheck(endpoint);
    }

    return endpoint;
  }

  // 5. 삭제 (Soft Delete)
  async remove(id: string): Promise<void> {
    const endpoint = await this.findOne(id);

    // 💡 Queue Job 제거
    await this.healthCheckService.unscheduleHealthCheck(endpoint);

    // isDeleted 또는 isActive = false로 설정
    endpoint.isActive = false;
    await this.endpointRepository.save(endpoint);
  }

  // 6. 수동 헬스 체크
  async manualHealthCheck(id: string): Promise<CheckResult> {
    const endpoint = await this.findOne(id);
    // 💡 즉시 큐에 우선순위 작업 추가
    return await this.healthCheckService.performHealthCheckNow(endpoint);
  }
}
```

### 1.3 Controller 설계

```typescript
@Controller('api/endpoints')
@ApiTags('Endpoints')
export class EndpointController {
  constructor(private endpointService: EndpointService) {}

  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: '엔드포인트 등록' })
  @ApiResponse({ status: 201, description: 'Endpoint created' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async create(@Body() dto: CreateEndpointDto) {
    return await this.endpointService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: '엔드포인트 목록 조회' })
  async findAll(@Query() query: EndpointListQueryDto) {
    return await this.endpointService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '엔드포인트 상세 조회' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return await this.endpointService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '엔드포인트 수정' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEndpointDto,
  ) {
    return await this.endpointService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '엔드포인트 삭제' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.endpointService.remove(id);
    return { message: 'Endpoint deleted successfully' };
  }

  @Post(':id/check')
  @ApiOperation({ summary: '수동 헬스 체크' })
  async manualHealthCheck(@Param('id', ParseUUIDPipe) id: string) {
    return await this.endpointService.manualHealthCheck(id);
  }
}
```

---

## 2단계: Bull Queue 설정

### 2.1 Bull 설정 파일

#### `src/config/bull.config.ts`
```typescript
import { BullModuleOptions, BullRootModuleOptions } from '@nestjs/bull';

export function getBullConfig(): BullRootModuleOptions {
  return {
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT) || 6379,
    },
  };
}

export function getHealthCheckQueueConfig(): BullModuleOptions {
  return {
    name: 'HEALTH_CHECK_QUEUE',
  };
}
```

### 2.2 Health Check Module 구조

```typescript
// health-check.module.ts
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';

import { HealthCheckService } from './health-check.service';
import { HealthCheckProcessor } from './health-check.processor';
import { Endpoint } from '../endpoint/entities/endpoint.entity';
import { CheckResult } from './entities/check-result.entity';
import { Incident } from '../incident/entities/incident.entity';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'HEALTH_CHECK_QUEUE',
    }),
    TypeOrmModule.forFeature([Endpoint, CheckResult, Incident]),
    HttpModule,
  ],
  providers: [HealthCheckService, HealthCheckProcessor],
  exports: [HealthCheckService], // 다른 모듈에서 사용 가능
})
export class HealthCheckModule {}
```

### 2.3 Health Check Service 설계

```typescript
// health-check.service.ts
@Injectable()
export class HealthCheckService {
  constructor(
    @InjectQueue('HEALTH_CHECK_QUEUE')
    private healthCheckQueue: Queue,
    @InjectRepository(Endpoint)
    private endpointRepository: Repository<Endpoint>,
  ) {}

  /**
   * 엔드포인트를 위한 주기적 헬스 체크 작업 스케줄
   */
  async scheduleHealthCheck(endpoint: Endpoint): Promise<void> {
    // Repeatable Job 생성
    // 매 checkInterval 초마다 반복 실행
    await this.healthCheckQueue.add(
      'check',
      { endpointId: endpoint.id },
      {
        repeat: {
          every: endpoint.checkInterval * 1000, // 밀리초 단위
        },
        removeOnComplete: false, // 완료해도 히스토리 유지
      },
    );
  }

  /**
   * 헬스 체크 작업 재스케줄
   * (checkInterval 변경 시 호출)
   */
  async rescheduleHealthCheck(endpoint: Endpoint): Promise<void> {
    // 기존 Job 제거
    await this.unscheduleHealthCheck(endpoint);

    // 새로 스케줄
    await this.scheduleHealthCheck(endpoint);
  }

  /**
   * 헬스 체크 작업 제거
   * (엔드포인트 삭제 시 호출)
   */
  async unscheduleHealthCheck(endpoint: Endpoint): Promise<void> {
    const jobs = await this.healthCheckQueue.getJobs(['repeat']);

    for (const job of jobs) {
      if (job.data.endpointId === endpoint.id) {
        await job.remove();
      }
    }
  }

  /**
   * 즉시 헬스 체크 수행
   * (수동 체크 시 호출)
   */
  async performHealthCheckNow(endpoint: Endpoint): Promise<CheckResult> {
    // 우선순위 높은 작업으로 즉시 추가
    const job = await this.healthCheckQueue.add(
      'check',
      { endpointId: endpoint.id, isManual: true },
      { priority: 1 }, // 높은 우선순위
    );

    // 작업 완료 대기
    return new Promise((resolve, reject) => {
      job.finished()
        .then(() => {
          // Processor에서 저장한 결과 조회
          resolve(job.returnvalue);
        })
        .catch(reject);
    });
  }
}
```

### 2.4 Health Check Processor 설계

```typescript
// health-check.processor.ts
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
  async handleHealthCheck(job: Job<{ endpointId: string }>): Promise<CheckResult> {
    const { endpointId } = job.data;

    try {
      // 1️⃣ 엔드포인트 정보 조회
      const endpoint = await this.endpointRepository.findOne({
        where: { id: endpointId },
      });

      if (!endpoint) {
        throw new Error(`Endpoint not found: ${endpointId}`);
      }

      // 2️⃣ HTTP 요청 수행
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
      this.logger.error(`Health check failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * HTTP 요청 수행 및 응답 분석
   */
  private async performHttpRequest(
    endpoint: Endpoint,
  ): Promise<CheckResult> {
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

      return new CheckResult({
        endpoint,
        status: response.status === endpoint.expectedStatusCode ? 'success' : 'failure',
        responseTime,
        statusCode: response.status,
        errorMessage: response.status !== endpoint.expectedStatusCode
          ? `Expected ${endpoint.expectedStatusCode}, got ${response.status}`
          : null,
      });
    } catch (error) {
      const responseTime = Date.now() - startTime;

      return new CheckResult({
        endpoint,
        status: 'failure',
        responseTime,
        statusCode: null,
        errorMessage: this.getErrorMessage(error),
      });
    }
  }

  /**
   * 에러 메시지 생성
   */
  private getErrorMessage(error: any): string {
    if (error.code === 'ECONNABORTED') return 'Timeout exceeded';
    if (error.code === 'ENOTFOUND') return 'DNS resolution failed';
    if (error.code === 'ECONNREFUSED') return 'Connection refused';
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
    if (checkResult.status === 'success') {
      endpoint.consecutiveFailures = 0;
    } else {
      endpoint.consecutiveFailures++;
    }

    await this.endpointRepository.save(endpoint);
  }

  /**
   * 상태 판정 로직
   */
  private determineStatus(
    endpoint: Endpoint,
    checkResult: CheckResult,
  ): EndpointStatus {
    if (checkResult.status === 'failure') {
      if (endpoint.consecutiveFailures >= 3) {
        return EndpointStatus.DOWN;
      }
      return endpoint.currentStatus; // 기존 상태 유지
    }

    // 성공 응답
    const thresholdMs = endpoint.timeoutThreshold * 0.8;
    if (checkResult.responseTime > thresholdMs) {
      return EndpointStatus.DEGRADED;
    }

    return EndpointStatus.UP;
  }

  /**
   * Incident 처리
   */
  private async handleIncidents(
    endpoint: Endpoint,
    checkResult: CheckResult,
  ): Promise<void> {
    const newStatus = endpoint.currentStatus;

    // 기존 진행 중인 인시던트 조회
    const activeIncident = await this.incidentRepository.findOne({
      where: {
        endpoint: { id: endpoint.id },
        resolvedAt: IsNull(),
      },
    });

    if (newStatus === EndpointStatus.DOWN && !activeIncident) {
      // DOWN 상태 진입 → 새 인시던트 생성
      await this.incidentRepository.save({
        endpoint,
        startedAt: new Date(),
        failureCount: endpoint.consecutiveFailures,
        errorMessage: checkResult.errorMessage,
      });
    } else if (newStatus !== EndpointStatus.DOWN && activeIncident) {
      // UP/DEGRADED 상태 회복 → 인시던트 종료
      activeIncident.resolvedAt = new Date();
      await this.incidentRepository.save(activeIncident);
    }
  }
}
```

---

## 3단계: Health Check 로직

### 3.1 상태 판정 로직 상세

```
┌─────────────────────────────────────────────────────┐
│          HTTP 요청 수행                              │
│  ─────────────────────────────────────              │
│  ✓ 성공/실패 판단                                   │
│  ✓ 응답 시간 측정                                   │
│  ✓ 상태 코드 확인                                   │
└─────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────┐
│          상태 판정 (4가지)                            │
├─────────────────────────────────────────────────────┤
│                                                     │
│  UP (정상)                                          │
│  ├─ 조건: 최근 성공 + 응답시간 < 임계값의 80%      │
│  └─ 예: 응답 120ms, 임계값 5000ms (4000ms < 120) │
│                                                     │
│  DOWN (다운)                                        │
│  ├─ 조건: 연속 3회 이상 실패                        │
│  └─ 또는 최근 체크 실패                             │
│                                                     │
│  DEGRADED (성능저하)                                │
│  ├─ 조건: 최근 성공 + 응답시간 > 임계값의 80%      │
│  └─ 예: 응답 4500ms, 임계값 5000ms (4000ms > 4500)│
│                                                     │
│  UNKNOWN (미체크)                                   │
│  ├─ 조건: 아직 체크 안 됨                           │
│  └─ 엔드포인트 등록 직후                            │
│                                                     │
└─────────────────────────────────────────────────────┘

상태 전환 다이어그램:

  ┌────────┐
  │ UNKNOWN │  (초기 상태, 첫 체크 후 다른 상태로 전환)
  └────┬───┘
       │
       ├─ 첫 성공 + 빠름 → UP
       │
       ├─ 첫 성공 + 느림 → DEGRADED
       │
       └─ 첫 실패 × 3회 → DOWN
```

### 3.2 에러 처리 전략

```typescript
// 발생 가능한 에러 타입별 처리

enum NetworkErrorCode {
  TIMEOUT = 'ECONNABORTED',
  DNS_FAILED = 'ENOTFOUND',
  CONNECTION_REFUSED = 'ECONNREFUSED',
  NETWORK_UNREACHABLE = 'ENETUNREACH',
  HOST_UNREACHABLE = 'EHOSTUNREACH',
}

상태 코드 에러:
├─ 4xx: 클라이언트 에러 (설정 확인 필요)
├─ 5xx: 서버 에러 (임시 장애, DOWN으로 판정)
└─ 기타: 예상 코드와 다름 (실패로 판정)

타임아웃:
├─ responseTime > timeoutThreshold
├─ errorMessage: "Timeout exceeded"
└─ consecutiveFailures++ → 3회 이상 시 DOWN

네트워크 에러:
├─ DNS 해석 실패: errorMessage "DNS resolution failed"
├─ 연결 거부: errorMessage "Connection refused"
└─ 기타 네트워크 에러: 구체적 메시지 기록
```

---

## 4단계: 체크 결과 저장 및 인시던트 처리

### 4.1 CheckResult 엔티티 설계

```typescript
// check-result.entity.ts
@Entity('check_results')
export class CheckResult {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Endpoint, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'endpointId' })
  endpoint: Endpoint;

  @Column({ type: 'enum', enum: ['success', 'failure'] })
  status: 'success' | 'failure';

  @Column({ type: 'float', nullable: true })
  responseTime: number; // 밀리초

  @Column({ type: 'int', nullable: true })
  statusCode: number;

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @CreateDateColumn()
  checkedAt: Date;
}
```

### 4.2 Incident 엔티티 설계

```typescript
// incident.entity.ts
@Entity('incidents')
export class Incident {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Endpoint, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'endpointId' })
  endpoint: Endpoint;

  @CreateDateColumn()
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  resolvedAt: Date;

  @Column({ type: 'int', nullable: true })
  duration: number; // 밀리초 (계산됨)

  @Column({ type: 'int', default: 0 })
  failureCount: number;

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  // beforeUpdate 훅에서 자동 계산
  @BeforeUpdate()
  calculateDuration() {
    if (this.resolvedAt && this.startedAt) {
      this.duration = this.resolvedAt.getTime() - this.startedAt.getTime();
    }
  }
}
```

### 4.3 Incident 처리 흐름

```
체크 결과 수신
    ↓
상태 판정 (UP/DOWN/DEGRADED/UNKNOWN)
    ↓
┌───────────────────────────────────────────────────────┐
│ 기존 진행 중인 인시던트 조회                            │
│ WHERE resolvedAt IS NULL                             │
└───────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┬─────────────────────────────────┐
│ activeIncident 없음                 │ activeIncident 있음              │
├─────────────────────────────────────┼─────────────────────────────────┤
│                                     │                                 │
│ 현재 상태 = DOWN?                   │ 현재 상태 = DOWN?                │
│  ├─ YES → 새 Incident 생성          │  ├─ YES → 유지 (failureCount↑)  │
│  └─ NO → 아무것도 안 함              │  └─ NO → 인시던트 종료 (UP회복) │
│                                     │                                 │
└─────────────────────────────────────┴─────────────────────────────────┘
    ↓
체크 결과 & Endpoint 상태 업데이트
```

---

## 에러 처리 전략

### 전역 에러 처리

```typescript
// Health Check 처리 중 에러
1. Endpoint를 찾을 수 없음 → Job 실패 (자동 재시도 설정)
2. HTTP 요청 실패 → CheckResult 저장 (status: 'failure')
3. 상태 업데이트 실패 → 로깅 후 다음 체크에서 재시도
4. Incident 처리 실패 → 로깅

// 재시도 전략
- Bull Queue 기본 재시도: 3회 (설정 가능)
- 재시도 간격: exponential backoff
- 최대 대기 시간: 설정 가능

// 로깅
- 모든 에러는 Logger로 기록
- 심각 에러는 에러 모니터링 서비스로 전송 (추후)
```

---

## 데이터 플로우

### 시나리오 1: 엔드포인트 등록

```
클라이언트
  │
  ├─ POST /api/endpoints
  │   {
  │     name: "Example API",
  │     url: "https://api.example.com/health",
  │     checkInterval: 60
  │   }
  │
  ↓
EndpointController
  │
  ├─ DTO 검증
  ├─ EndpointService.create() 호출
  │
  ↓
EndpointService
  │
  ├─ Endpoint 엔티티 생성
  ├─ DB에 저장
  ├─ HealthCheckService.scheduleHealthCheck() 호출
  │
  ↓
HealthCheckService
  │
  ├─ Bull Queue에 Repeatable Job 추가
  │   {
  │     name: 'check',
  │     data: { endpointId },
  │     repeat: { every: 60000 } (밀리초)
  │   }
  │
  ↓
Redis (Queue 저장)
  │
  ├─ Job 즉시 실행 (스케줄링됨)
  │
  ↓
HealthCheckProcessor
  │
  ├─ performHealthCheck() 실행
  ├─ HTTP 요청
  ├─ CheckResult 저장
  ├─ Endpoint 상태 업데이트
  ├─ Incident 처리
  │
  ↓
응답 반환
  └─ 201 Created, Endpoint 정보
```

### 시나리오 2: 주기적 헬스 체크 실행

```
Redis (Bull Queue)
  │
  ├─ checkInterval 시간 경과
  │
  ↓
Job 트리거
  │
  ├─ Job 실행 권한 부여
  │
  ↓
HealthCheckProcessor.handleHealthCheck()
  │
  ├─ 1️⃣ Endpoint 정보 조회
  ├─ 2️⃣ HTTP 요청 수행
  │    ├─ 메서드: endpoint.method
  │    ├─ URL: endpoint.url
  │    ├─ 헤더: endpoint.headers
  │    ├─ 바디: endpoint.body
  │    └─ 타임아웃: endpoint.timeoutThreshold
  ├─ 3️⃣ 응답 분석
  ├─ 4️⃣ CheckResult 저장
  │    {
  │      endpointId,
  │      status: 'success' | 'failure',
  │      responseTime,
  │      statusCode,
  │      errorMessage,
  │      checkedAt: now()
  │    }
  ├─ 5️⃣ Endpoint 상태 업데이트
  │    ├─ currentStatus
  │    ├─ lastResponseTime
  │    ├─ lastCheckedAt
  │    └─ consecutiveFailures
  ├─ 6️⃣ Incident 처리
  │    ├─ DOWN 감지 시 Incident 생성
  │    └─ UP 회복 시 Incident 종료
  │
  ↓
다음 주기 대기 (checkInterval 초)
```

### 시나리오 3: 엔드포인트 체크 간격 변경

```
클라이언트
  │
  ├─ PATCH /api/endpoints/:id
  │   {
  │     checkInterval: 120  (기존 60초 → 120초)
  │   }
  │
  ↓
EndpointService.update()
  │
  ├─ Endpoint 정보 수정
  ├─ intervalChanged 여부 판단
  ├─ 변경 됨 → HealthCheckService.rescheduleHealthCheck() 호출
  │
  ↓
HealthCheckService.rescheduleHealthCheck()
  │
  ├─ 기존 Job 조회 후 제거
  │   └─ queue.getJobs(['repeat']) → 필터링 → remove()
  ├─ 새로운 간격으로 Job 추가
  │   └─ repeat: { every: 120000 }
  │
  ↓
Redis
  │
  ├─ 기존 Job 제거됨
  ├─ 새 Job으로 다시 스케줄
  │
  ↓
응답 반환
  └─ 200 OK, 수정된 Endpoint 정보
```

---

## 구현 체크리스트

### Phase 1: Endpoint CRUD API
- [ ] `create-endpoint.dto.ts` 작성
- [ ] `update-endpoint.dto.ts` 작성
- [ ] `endpoint-list-query.dto.ts` 작성
- [ ] `endpoint.service.ts` 메서드 구현
- [ ] `endpoint.controller.ts` 엔드포인트 구현
- [ ] `endpoint.module.ts` 작성
- [ ] DTO 검증 테스트
- [ ] API 기본 동작 테스트

### Phase 2: Bull Queue 설정
- [ ] `bull.config.ts` 작성
- [ ] `health-check.module.ts` 작성
- [ ] `health-check.service.ts` 메서드 구현
  - [ ] `scheduleHealthCheck()`
  - [ ] `rescheduleHealthCheck()`
  - [ ] `unscheduleHealthCheck()`
  - [ ] `performHealthCheckNow()`
- [ ] Bull Queue 동작 테스트

### Phase 3: Health Check 로직
- [ ] `health-check.processor.ts` 작성
- [ ] `performHttpRequest()` 메서드 구현
- [ ] 에러 처리 로직 구현
- [ ] 상태 판정 로직 구현 (`determineStatus()`)
- [ ] Endpoint 상태 업데이트 구현
- [ ] HTTP 요청 테스트

### Phase 4: 체크 결과 저장 & Incident 처리
- [ ] CheckResult 엔티티 검증
- [ ] Incident 엔티티 검증
- [ ] `updateEndpointStatus()` 구현
- [ ] `handleIncidents()` 구현
- [ ] Incident 생성/종료 테스트

### Phase 5: 통합 테스트
- [ ] 엔드포인트 등록 후 자동 헬스 체크 확인
- [ ] 실패 감지 후 인시던트 생성 확인
- [ ] 복구 후 인시던트 종료 확인
- [ ] 상태 판정 로직 전체 테스트
- [ ] 에러 케이스 테스트

---

## 관련 문서

- [FEATURE_SPECIFICATIONS.md](../docs/FEATURE_SPECIFICATIONS.md) - 기능 명세
- [API_SPECIFICATIONS.md](../docs/API_SPECIFICATIONS.md) - API 명세
- [DATABASE_SCHEMA.md](../docs/DATABASE_SCHEMA.md) - DB 스키마

---

**문서 작성**: 2025-10-20
**최종 검토**: 설계 확인 완료
