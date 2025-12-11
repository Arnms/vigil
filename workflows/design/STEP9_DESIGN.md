# Step 9 상세 설계 문서: 집계 통계 API 완성

**작성일**: 2025-12-11
**상태**: 설계 초안
**기간**: Day 15

---

## 📋 목차

1. [개요](#개요)
2. [문제 분석](#문제-분석)
3. [전체 아키텍처](#전체-아키텍처)
4. [API 설계](#api-설계)
5. [데이터베이스 쿼리 설계](#데이터베이스-쿼리-설계)
6. [캐싱 전략](#캐싱-전략)
7. [성능 최적화](#성능-최적화)
8. [에러 처리](#에러-처리)
9. [데이터 플로우](#데이터-플로우)
10. [구현 체크리스트](#구현-체크리스트)

---

## 개요

### 배경

**문제**: Step 6 (프론트엔드 Dashboard)에서 요구하는 집계 통계 API가 백엔드에 구현되지 않음

**영향**:
- Dashboard 404 에러 (3개 엔드포인트)
- 상태 분포 카드 미작동
- 응답시간 시계열 차트 미표시
- 가동률 시계열 차트 미표시

**참고 문서**: [api-mismatch-analysis.md](../../claudedocs/api-mismatch-analysis.md)

### 목표

- ✅ 상태 분포 API 구현
- ✅ 가동률 시계열 API 구현
- ✅ 응답시간 시계열 API 구현
- ✅ 프론트엔드-백엔드 API 계약 완성
- ✅ Dashboard 완전 작동

### 기대 효과

**기능적 개선**:
- Dashboard 404 에러 완전 제거
- 실시간 시스템 상태 모니터링
- 시간대별 추이 분석 가능

**성능 목표**:
- API 응답 시간: < 200ms
- 캐시 히트율: > 80%
- 쿼리 최적화: < 100ms

---

## 문제 분석

### 기존 구현 (Step 4)

**백엔드 API**:
```typescript
✅ GET /api/endpoints/:id/uptime           // 개별 엔드포인트
✅ GET /api/endpoints/:id/response-time    // 개별 엔드포인트
✅ GET /api/statistics/overview            // 전체 요약
```

**특징**: 개별 엔드포인트별 상세 통계

### 프론트엔드 요구사항 (Step 6)

**Dashboard.tsx 호출**:
```typescript
❌ fetchStatusDistribution()           → /api/statistics/status-distribution
❌ fetchUptimeTimeseries('day')        → /api/statistics/uptime/day/timeseries
❌ fetchResponseTimeTimeseries('day')  → /api/statistics/response-time/day/timeseries
```

**특징**: 전체 시스템의 집계 통계 기대

### 불일치 원인

1. **워크플로우 문서 불완전**: Step 4에 집계 API 미명시
2. **구현 간 단절**: 백엔드-프론트엔드 API 계약 불명확
3. **통합 테스트 부재**: E2E 테스트 없이 완료 표시

---

## 전체 아키텍처

### 시스템 흐름도

```
┌──────────────────────────────────────────────────────────────┐
│                    Dashboard (Frontend)                      │
│                                                               │
│  매 5초:  fetchOverview() + fetchStatusDistribution()        │
│  매 30초: fetchUptimeTimeseries() + fetchResponseTimeTimeseries() │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│              Statistics Controller (Backend)                  │
│                                                               │
│  GET /api/statistics/status-distribution                     │
│  GET /api/statistics/uptime/:period/timeseries               │
│  GET /api/statistics/response-time/:period/timeseries        │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│              Statistics Service (Business Logic)              │
│                                                               │
│  1. 캐시 확인 (Redis)                                         │
│  2. 캐시 미스 → DB 쿼리 실행                                  │
│  3. 집계 계산 (TypeORM QueryBuilder)                         │
│  4. 결과 캐싱 (TTL 설정)                                      │
│  5. 응답 포맷 변환                                            │
└──────────────────────────────────────────────────────────────┘
         ↓                    ↓                    ↓
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│ Status           │  │ Uptime           │  │ Response Time    │
│ Distribution     │  │ Timeseries       │  │ Timeseries       │
│                  │  │                  │  │                  │
│ • Endpoint 집계  │  │ • CheckResult    │  │ • CheckResult    │
│ • currentStatus  │  │   시계열 집계    │  │   시계열 집계    │
│ • GROUP BY       │  │ • DATE_TRUNC()   │  │ • DATE_TRUNC()   │
└──────────────────┘  └──────────────────┘  └──────────────────┘
         ↓                    ↓                    ↓
┌──────────────────────────────────────────────────────────────┐
│                    PostgreSQL Database                        │
│                                                               │
│  • endpoints 테이블 (currentStatus)                           │
│  • check_results 테이블 (checkedAt, status, responseTime)    │
│  • 인덱스 활용: idx_checkedAt, idx_status                     │
└──────────────────────────────────────────────────────────────┘
         ↓
┌──────────────────────────────────────────────────────────────┐
│                    Redis Cache                                │
│                                                               │
│  • statistics:status-distribution (TTL: 30s)                 │
│  • statistics:uptime:day:24 (TTL: 60s)                       │
│  • statistics:response-time:day:24 (TTL: 60s)                │
└──────────────────────────────────────────────────────────────┘
```

### 디렉토리 구조

```
src/modules/statistics/
├── dto/
│   ├── timeseries-query.dto.ts        # [NEW] 시계열 쿼리 DTO
│   ├── status-distribution.dto.ts     # [NEW] 상태 분포 응답 DTO
│   ├── uptime-timeseries.dto.ts       # [NEW] 가동률 시계열 응답 DTO
│   └── response-time-timeseries.dto.ts # [NEW] 응답시간 시계열 응답 DTO
├── services/
│   └── statistics.service.ts          # [MODIFY] 메서드 3개 추가
└── statistics.controller.ts           # [MODIFY] 라우트 3개 추가
```

---

## API 설계

### 1. 상태 분포 조회

**엔드포인트**: `GET /api/statistics/status-distribution`

**Request**: None

**Response**:
```typescript
{
  "up": number,        // UP 상태 엔드포인트 수
  "down": number,      // DOWN 상태 엔드포인트 수
  "degraded": number,  // DEGRADED 상태 엔드포인트 수
  "unknown": number    // UNKNOWN 상태 엔드포인트 수
}
```

**예시**:
```json
{
  "up": 8,
  "down": 1,
  "degraded": 1,
  "unknown": 0
}
```

**캐시 키**: `statistics:status-distribution`
**캐시 TTL**: 30초

---

### 2. 가동률 시계열 조회

**엔드포인트**: `GET /api/statistics/uptime/:period/timeseries`

**Path Parameters**:
- `period`: 'day' | 'week' | 'month'

**Query Parameters**:
- `hours`: number (기본값: 24) - 조회 시간 범위

**Request 예시**:
```
GET /api/statistics/uptime/day/timeseries?hours=24
```

**Response**:
```typescript
Array<{
  timestamp: string,    // ISO 8601 형식
  uptime: number,       // 가동률 (0-100)
  totalChecks: number,  // 전체 체크 수
  failedChecks: number  // 실패 체크 수
}>
```

**예시**:
```json
[
  {
    "timestamp": "2025-12-11T00:00:00.000Z",
    "uptime": 99.5,
    "totalChecks": 120,
    "failedChecks": 1
  },
  {
    "timestamp": "2025-12-11T01:00:00.000Z",
    "uptime": 100.0,
    "totalChecks": 120,
    "failedChecks": 0
  }
]
```

**캐시 키**: `statistics:uptime:${period}:${hours}`
**캐시 TTL**: 60초

---

### 3. 응답시간 시계열 조회

**엔드포인트**: `GET /api/statistics/response-time/:period/timeseries`

**Path Parameters**:
- `period`: 'day' | 'week' | 'month'

**Query Parameters**:
- `hours`: number (기본값: 24) - 조회 시간 범위

**Request 예시**:
```
GET /api/statistics/response-time/day/timeseries?hours=24
```

**Response**:
```typescript
Array<{
  timestamp: string,        // ISO 8601 형식
  avgResponseTime: number,  // 평균 응답시간 (ms)
  minResponseTime: number,  // 최소 응답시간 (ms)
  maxResponseTime: number   // 최대 응답시간 (ms)
}>
```

**예시**:
```json
[
  {
    "timestamp": "2025-12-11T00:00:00.000Z",
    "avgResponseTime": 145,
    "minResponseTime": 89,
    "maxResponseTime": 523
  },
  {
    "timestamp": "2025-12-11T01:00:00.000Z",
    "avgResponseTime": 152,
    "minResponseTime": 95,
    "maxResponseTime": 445
  }
]
```

**캐시 키**: `statistics:response-time:${period}:${hours}`
**캐시 TTL**: 60초

---

## 데이터베이스 쿼리 설계

### 1. 상태 분포 쿼리

**목표**: 모든 활성 엔드포인트의 현재 상태 집계

**TypeORM QueryBuilder**:
```typescript
const distribution = await this.endpointRepository
  .createQueryBuilder('endpoint')
  .select('endpoint.currentStatus', 'status')
  .addSelect('COUNT(*)', 'count')
  .where('endpoint.isActive = :isActive', { isActive: true })
  .groupBy('endpoint.currentStatus')
  .getRawMany();
```

**생성되는 SQL**:
```sql
SELECT
  currentStatus as status,
  COUNT(*) as count
FROM endpoints
WHERE isActive = true
GROUP BY currentStatus;
```

**결과 변환**:
```typescript
const result = {
  up: 0,
  down: 0,
  degraded: 0,
  unknown: 0
};

distribution.forEach(item => {
  const status = item.status.toLowerCase();
  result[status] = parseInt(item.count, 10);
});
```

**인덱스 활용**: `idx_currentStatus`, `idx_isActive`

---

### 2. 가동률 시계열 쿼리

**목표**: 시간대별 전체 시스템 가동률 집계

**TypeORM QueryBuilder**:
```typescript
const timeseries = await this.checkResultRepository
  .createQueryBuilder('check')
  .select("DATE_TRUNC('hour', check.checkedAt)", 'timestamp')
  .addSelect('COUNT(*)', 'totalChecks')
  .addSelect("COUNT(*) FILTER (WHERE check.status = 'failure')", 'failedChecks')
  .addSelect("COUNT(*) FILTER (WHERE check.status = 'success')", 'successChecks')
  .where('check.checkedAt >= NOW() - INTERVAL :hours HOUR', { hours })
  .groupBy("DATE_TRUNC('hour', check.checkedAt)")
  .orderBy('timestamp', 'ASC')
  .getRawMany();
```

**생성되는 SQL**:
```sql
SELECT
  DATE_TRUNC('hour', checkedAt) as timestamp,
  COUNT(*) as totalChecks,
  COUNT(*) FILTER (WHERE status = 'failure') as failedChecks,
  COUNT(*) FILTER (WHERE status = 'success') as successChecks
FROM check_results
WHERE checkedAt >= NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', checkedAt)
ORDER BY timestamp ASC;
```

**결과 변환**:
```typescript
return timeseries.map(item => ({
  timestamp: item.timestamp,
  totalChecks: parseInt(item.totalChecks, 10),
  failedChecks: parseInt(item.failedChecks, 10),
  uptime: parseFloat(
    ((item.successChecks / item.totalChecks) * 100).toFixed(2)
  )
}));
```

**인덱스 활용**: `idx_checkedAt`, `idx_status`

**성능 최적화**:
- `DATE_TRUNC('hour')` 사용으로 시간 단위 그룹화
- 필터 조건으로 스캔 범위 제한
- 인덱스 활용으로 빠른 범위 검색

---

### 3. 응답시간 시계열 쿼리

**목표**: 시간대별 응답시간 통계 집계

**TypeORM QueryBuilder**:
```typescript
const timeseries = await this.checkResultRepository
  .createQueryBuilder('check')
  .select("DATE_TRUNC('hour', check.checkedAt)", 'timestamp')
  .addSelect('ROUND(AVG(check.responseTime))', 'avgResponseTime')
  .addSelect('MIN(check.responseTime)', 'minResponseTime')
  .addSelect('MAX(check.responseTime)', 'maxResponseTime')
  .where('check.checkedAt >= NOW() - INTERVAL :hours HOUR', { hours })
  .andWhere('check.responseTime IS NOT NULL')
  .groupBy("DATE_TRUNC('hour', check.checkedAt)")
  .orderBy('timestamp', 'ASC')
  .getRawMany();
```

**생성되는 SQL**:
```sql
SELECT
  DATE_TRUNC('hour', checkedAt) as timestamp,
  ROUND(AVG(responseTime)) as avgResponseTime,
  MIN(responseTime) as minResponseTime,
  MAX(responseTime) as maxResponseTime
FROM check_results
WHERE checkedAt >= NOW() - INTERVAL '24 hours'
  AND responseTime IS NOT NULL
GROUP BY DATE_TRUNC('hour', checkedAt)
ORDER BY timestamp ASC;
```

**결과 변환**:
```typescript
return timeseries.map(item => ({
  timestamp: item.timestamp,
  avgResponseTime: parseInt(item.avgResponseTime, 10),
  minResponseTime: parseInt(item.minResponseTime, 10),
  maxResponseTime: parseInt(item.maxResponseTime, 10)
}));
```

**인덱스 활용**: `idx_checkedAt`, `idx_responseTime`

---

## 캐싱 전략

### 캐시 키 설계

**패턴**:
```
statistics:<resource>:<parameters>
```

**구체적 키**:
```typescript
// 상태 분포
'statistics:status-distribution'

// 가동률 시계열
'statistics:uptime:day:24'
'statistics:uptime:week:168'
'statistics:uptime:month:720'

// 응답시간 시계열
'statistics:response-time:day:24'
'statistics:response-time:week:168'
'statistics:response-time:month:720'
```

### TTL 설정

| 리소스 | TTL | 이유 |
|--------|-----|------|
| status-distribution | 30초 | 상태 변경 빠른 반영 |
| uptime-timeseries | 60초 | 집계 쿼리 비용 절감 |
| response-time-timeseries | 60초 | 집계 쿼리 비용 절감 |

### 캐시 무효화

**자동 만료**: TTL 도달 시
**수동 무효화**: 필요 없음 (시계열 데이터는 추가만 발생)

### CacheManagerService 활용

```typescript
async getStatusDistribution() {
  const cacheKey = 'statistics:status-distribution';

  // 1. 캐시 확인
  const cached = await this.cacheManager.get(cacheKey);
  if (cached) {
    return cached;
  }

  // 2. DB 쿼리
  const result = await this.calculateStatusDistribution();

  // 3. 캐시 저장 (TTL: 30초)
  await this.cacheManager.set(cacheKey, result, 30);

  return result;
}
```

---

## 성능 최적화

### 쿼리 최적화

**1. 인덱스 활용**:
```sql
-- check_results 테이블
CREATE INDEX idx_checked_at ON check_results(checkedAt);
CREATE INDEX idx_status ON check_results(status);
CREATE INDEX idx_response_time ON check_results(responseTime);

-- endpoints 테이블
CREATE INDEX idx_current_status ON endpoints(currentStatus);
CREATE INDEX idx_is_active ON endpoints(isActive);
```

**2. 쿼리 플랜 분석**:
```sql
EXPLAIN ANALYZE
SELECT DATE_TRUNC('hour', checkedAt) as timestamp,
       COUNT(*) as totalChecks
FROM check_results
WHERE checkedAt >= NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', checkedAt);
```

**3. 데이터 범위 제한**:
- `WHERE checkedAt >= NOW() - INTERVAL` 사용
- 필요한 시간 범위만 스캔

### 응답 시간 목표

| API | 목표 | 최대 |
|-----|------|------|
| status-distribution | < 50ms | 100ms |
| uptime-timeseries | < 100ms | 200ms |
| response-time-timeseries | < 100ms | 200ms |

**캐시 히트 시**: < 10ms

---

## 에러 처리

### HTTP 상태 코드

| 상황 | 코드 | 응답 |
|------|------|------|
| 성공 | 200 | 데이터 반환 |
| 잘못된 파라미터 | 400 | BadRequestException |
| 서버 에러 | 500 | InternalServerErrorException |

### 에러 응답 형식

```typescript
{
  "statusCode": 400,
  "message": "Invalid period parameter. Must be 'day', 'week', or 'month'.",
  "error": "Bad Request"
}
```

### 예외 처리

```typescript
async getUptimeTimeseries(period: string, hours: number) {
  try {
    // 파라미터 검증
    if (!['day', 'week', 'month'].includes(period)) {
      throw new BadRequestException('Invalid period parameter');
    }

    if (hours < 1 || hours > 720) {
      throw new BadRequestException('Hours must be between 1 and 720');
    }

    // 쿼리 실행
    const result = await this.queryTimeseries(hours);
    return result;

  } catch (error) {
    this.logger.error(`Failed to get uptime timeseries: ${error.message}`);
    throw error;
  }
}
```

---

## 데이터 플로우

### 상태 분포 조회 플로우

```
Dashboard.tsx
  │
  ├─ useEffect(() => { fetchStatusDistribution() }, [])
  │
  ↓
StatisticsStore
  │
  ├─ fetchStatusDistribution()
  │
  ↓
StatisticsService (Frontend)
  │
  ├─ GET /api/statistics/status-distribution
  │
  ↓
StatisticsController (Backend)
  │
  ├─ @Get('status-distribution')
  ├─ getStatusDistribution()
  │
  ↓
StatisticsService (Backend)
  │
  ├─ Redis 캐시 확인
  │   └─ HIT → 캐시 데이터 반환
  │   └─ MISS ↓
  │
  ├─ Endpoint Repository 쿼리
  │   └─ GROUP BY currentStatus
  │
  ├─ 결과 포맷 변환 { up, down, degraded, unknown }
  │
  ├─ Redis 캐싱 (TTL: 30s)
  │
  └─ 응답 반환
       │
       ↓
Dashboard 렌더링 (StatusCard 업데이트)
```

### 시계열 조회 플로우

```
Dashboard.tsx
  │
  ├─ useEffect(() => { fetchUptimeTimeseries('day') }, [])
  │
  ↓
StatisticsStore
  │
  ├─ fetchUptimeTimeseries(period)
  │
  ↓
StatisticsService (Frontend)
  │
  ├─ GET /api/statistics/uptime/day/timeseries?hours=24
  │
  ↓
StatisticsController (Backend)
  │
  ├─ @Get('uptime/:period/timeseries')
  ├─ getUptimeTimeseries(period, hours)
  │
  ↓
StatisticsService (Backend)
  │
  ├─ Redis 캐시 확인 (statistics:uptime:day:24)
  │   └─ HIT → 캐시 데이터 반환
  │   └─ MISS ↓
  │
  ├─ CheckResult Repository 쿼리
  │   └─ DATE_TRUNC('hour', checkedAt)
  │   └─ GROUP BY timestamp
  │   └─ COUNT, FILTER
  │
  ├─ 가동률 계산 (success / total * 100)
  │
  ├─ 결과 포맷 변환
  │   └─ [{ timestamp, uptime, totalChecks, failedChecks }]
  │
  ├─ Redis 캐싱 (TTL: 60s)
  │
  └─ 응답 반환
       │
       ↓
Dashboard 차트 렌더링 (Recharts)
```

---

## 구현 체크리스트

### Phase 1: DTO 생성

- [ ] `dto/timeseries-query.dto.ts` 생성
  - period: 'day' | 'week' | 'month'
  - hours?: number (기본값: 24)
  - 검증: @IsIn, @IsOptional, @IsInt

- [ ] `dto/status-distribution-response.dto.ts` 생성
  - up: number
  - down: number
  - degraded: number
  - unknown: number

- [ ] `dto/uptime-timeseries-response.dto.ts` 생성
  - timestamp: string
  - uptime: number
  - totalChecks: number
  - failedChecks: number

- [ ] `dto/response-time-timeseries-response.dto.ts` 생성
  - timestamp: string
  - avgResponseTime: number
  - minResponseTime: number
  - maxResponseTime: number

### Phase 2: Service 메서드 구현

- [ ] `statistics.service.ts` - `getStatusDistribution()` 구현
  - Endpoint 집계 쿼리
  - 결과 포맷 변환
  - Redis 캐싱 (TTL: 30s)

- [ ] `statistics.service.ts` - `getUptimeTimeseries()` 구현
  - CheckResult 시계열 쿼리
  - DATE_TRUNC 활용
  - 가동률 계산
  - Redis 캐싱 (TTL: 60s)

- [ ] `statistics.service.ts` - `getResponseTimeTimeseries()` 구현
  - CheckResult 시계열 쿼리
  - 평균/최소/최대 계산
  - Redis 캐싱 (TTL: 60s)

### Phase 3: Controller 라우트 추가

- [ ] `statistics.controller.ts` - `@Get('status-distribution')` 추가
  - HttpCode(200)
  - ApiOperation 데코레이터

- [ ] `statistics.controller.ts` - `@Get('uptime/:period/timeseries')` 추가
  - @Param('period') 파라미터
  - @Query() TimeseriesQueryDto

- [ ] `statistics.controller.ts` - `@Get('response-time/:period/timeseries')` 추가
  - @Param('period') 파라미터
  - @Query() TimeseriesQueryDto

### Phase 4: 테스트

- [ ] 로컬 빌드 성공 확인
- [ ] API 수동 테스트 (Postman/curl)
  - GET /api/statistics/status-distribution
  - GET /api/statistics/uptime/day/timeseries?hours=24
  - GET /api/statistics/response-time/day/timeseries?hours=24

- [ ] 프론트엔드 연동 테스트
  - Dashboard 페이지 404 에러 제거 확인
  - 상태 분포 카드 데이터 표시
  - 응답시간 차트 렌더링
  - 가동률 차트 렌더링

### Phase 5: 배포

- [ ] Git 커밋 생성
- [ ] Docker 백엔드 이미지 재빌드
- [ ] 백엔드 컨테이너 재시작
- [ ] 프로덕션 환경 동작 확인

---

## 참고 문서

- [09-statistics-api-completion.md](../09-statistics-api-completion.md) - 워크플로우
- [api-mismatch-analysis.md](../../claudedocs/api-mismatch-analysis.md) - 문제 분석
- [04-statistics-api.md](../04-statistics-api.md) - 기존 Statistics API
- [STEP4_DESIGN.md](./STEP4_DESIGN.md) - Step 4 설계 문서

---

**작성자**: Claude
**검토**: 대기 중
**승인**: 대기 중
