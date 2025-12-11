# Step 9: Statistics API 완성

**목표**: Step 4에서 누락된 집계 통계 API 구현
**기간**: Day 15
**상태**: 🔄 진행 중

---

## 📋 배경

**문제**: Step 6 (프론트엔드)에서 구현된 집계 통계 API가 백엔드에 존재하지 않음
**영향**: Dashboard의 상태 분포, 시계열 차트 404 에러
**참고**: [api-mismatch-analysis.md](../claudedocs/api-mismatch-analysis.md)

---

## 🎯 구현할 API

### 1. 상태 분포 조회

**엔드포인트**: `GET /api/statistics/status-distribution`

**목표**: 모든 엔드포인트의 현재 상태 집계

**구현 사항**:
- [ ] StatisticsController에 라우트 추가
- [ ] StatisticsService에 `getStatusDistribution()` 메서드 구현
- [ ] Endpoint 엔티티에서 currentStatus 집계
- [ ] Redis 캐싱 (TTL: 30초)

**응답 형식**:
```json
{
  "up": 8,
  "down": 1,
  "degraded": 1,
  "unknown": 0
}
```

**쿼리 로직**:
```sql
SELECT
  currentStatus,
  COUNT(*) as count
FROM endpoints
WHERE isActive = true
GROUP BY currentStatus
```

---

### 2. 가동률 시계열 조회

**엔드포인트**: `GET /api/statistics/uptime/:period/timeseries?hours=24`

**목표**: 전체 시스템의 시간대별 가동률 추이

**Path Parameters**:
- `period`: 'day' | 'week' | 'month'

**Query Parameters**:
- `hours`: 시간 범위 (기본값: 24)

**구현 사항**:
- [ ] StatisticsController에 라우트 추가
- [ ] StatisticsService에 `getUptimeTimeseries()` 메서드 구현
- [ ] CheckResult 엔티티에서 시간대별 성공/실패 집계
- [ ] PostgreSQL `DATE_TRUNC()` 함수로 시간 그룹화
- [ ] Redis 캐싱 (TTL: 60초)

**응답 형식**:
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

**쿼리 로직**:
```sql
SELECT
  DATE_TRUNC('hour', checkedAt) as timestamp,
  COUNT(*) as totalChecks,
  COUNT(*) FILTER (WHERE status = 'failure') as failedChecks,
  ROUND((COUNT(*) FILTER (WHERE status = 'success')::decimal / COUNT(*) * 100), 2) as uptime
FROM check_results
WHERE checkedAt >= NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', checkedAt)
ORDER BY timestamp ASC
```

---

### 3. 응답시간 시계열 조회

**엔드포인트**: `GET /api/statistics/response-time/:period/timeseries?hours=24`

**목표**: 전체 시스템의 시간대별 응답시간 추이

**Path Parameters**:
- `period`: 'day' | 'week' | 'month'

**Query Parameters**:
- `hours`: 시간 범위 (기본값: 24)

**구현 사항**:
- [ ] StatisticsController에 라우트 추가
- [ ] StatisticsService에 `getResponseTimeTimeseries()` 메서드 구현
- [ ] CheckResult 엔티티에서 시간대별 응답시간 집계
- [ ] 평균/최소/최대 계산
- [ ] Redis 캐싱 (TTL: 60초)

**응답 형식**:
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

**쿼리 로직**:
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
ORDER BY timestamp ASC
```

---

## 📝 구현 순서

### Phase 1: DTO 및 타입 정의
- [ ] `TimeseriesQueryDto` 생성
  - period: 'day' | 'week' | 'month'
  - hours?: number (기본값: 24)
- [ ] Response 인터페이스 정의

### Phase 2: Service 메서드 구현
- [ ] `getStatusDistribution()` 구현
  - Endpoint 엔티티 집계 쿼리
  - 결과 포맷 변환
- [ ] `getUptimeTimeseries()` 구현
  - CheckResult 시계열 집계
  - 가동률 계산
- [ ] `getResponseTimeTimeseries()` 구현
  - CheckResult 시계열 집계
  - 평균/최소/최대 계산

### Phase 3: Controller 라우트 추가
- [ ] `@Get('status-distribution')` 엔드포인트
- [ ] `@Get('uptime/:period/timeseries')` 엔드포인트
- [ ] `@Get('response-time/:period/timeseries')` 엔드포인트

### Phase 4: 캐싱 전략
- [ ] CacheManagerService 활용
- [ ] 캐시 키 패턴:
  - `statistics:status-distribution`
  - `statistics:uptime:${period}:${hours}`
  - `statistics:response-time:${period}:${hours}`
- [ ] TTL 설정 (30-60초)

### Phase 5: 테스트 및 검증
- [ ] 로컬 빌드 및 실행
- [ ] 각 엔드포인트 수동 테스트
- [ ] 프론트엔드 연동 확인
- [ ] Dashboard 404 에러 해결 확인

---

## ✅ 완료 체크리스트

### 백엔드 구현
- [ ] DTO 클래스 생성 완료
- [ ] StatisticsService 메서드 3개 구현
- [ ] StatisticsController 라우트 3개 추가
- [ ] 빌드 성공 (0 에러)

### API 테스트
- [ ] `GET /api/statistics/status-distribution` - 200 OK
- [ ] `GET /api/statistics/uptime/day/timeseries?hours=24` - 200 OK
- [ ] `GET /api/statistics/response-time/day/timeseries?hours=24` - 200 OK

### 프론트엔드 연동
- [ ] Dashboard 페이지 404 에러 제거 확인
- [ ] 상태 분포 카드 데이터 표시 확인
- [ ] 응답시간 차트 렌더링 확인
- [ ] 가동률 차트 렌더링 확인

### 배포
- [ ] Docker 이미지 재빌드
- [ ] 백엔드 컨테이너 재시작
- [ ] 프로덕션 환경 동작 확인
- [ ] Git 커밋

---

## 🎨 기술 스택

**사용 기술**:
- TypeORM QueryBuilder (시계열 집계)
- PostgreSQL `DATE_TRUNC()` (시간 그룹화)
- Redis 캐싱 (성능 최적화)
- class-validator (DTO 검증)

**성능 목표**:
- 쿼리 응답 시간: < 100ms
- 캐시 히트율: > 80%
- API 응답 시간: < 200ms

---

## 📊 예상 영향

**해결되는 문제**:
- ✅ Dashboard 404 에러 3개 제거
- ✅ 상태 분포 카드 정상 작동
- ✅ 응답시간 시계열 차트 표시
- ✅ 가동률 시계열 차트 표시

**개선되는 UX**:
- 실시간 시스템 상태 모니터링
- 시간대별 추이 분석 가능
- 완전한 Dashboard 기능 제공

---

## 🔗 관련 문서

- [api-mismatch-analysis.md](../claudedocs/api-mismatch-analysis.md) - 문제 분석
- [04-statistics-api.md](./04-statistics-api.md) - 기존 Statistics API
- [06-dashboard-charts.md](./06-dashboard-charts.md) - Dashboard 구현
- [API_SPECIFICATIONS.md](../docs/API_SPECIFICATIONS.md) - API 명세

---

## ➡️ 다음 단계

구현 완료 후:
1. 통합 테스트 추가
2. API 명세서 업데이트
3. 성능 모니터링 설정
4. Step 8 (Testing & Deployment) 완료

---

**시작일**: 2025-12-11
**완료 예정일**: 2025-12-11
