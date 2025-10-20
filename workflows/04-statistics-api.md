# Step 4: 통계 API & 최적화

**목표**: 통계 데이터 조회 API 및 쿼리 최적화
**기간**: Day 7
**상태**: ⏳ 대기

---

## 📋 워크플로우

### 1. Statistics 모듈 구현

**목표**: 통계 데이터 조회 기능 모듈화

- [ ] Statistics 모듈 생성
  - `src/modules/statistics/statistics.module.ts`
  - `src/modules/statistics/statistics.service.ts`
  - `src/modules/statistics/statistics.controller.ts`

- [ ] 통계 데이터 캐싱 전략
  - Redis를 이용한 자주 조회되는 통계 캐싱
  - TTL 설정 (예: 1분)

---

### 2. 가동률 API 구현

**목표**: 엔드포인트의 가동률 조회

- [ ] GET /api/endpoints/:id/uptime 구현
  - Query Parameter: period (24h, 7d, 30d, custom)
  - Query Parameter: startDate, endDate (custom 시)

- [ ] 가동률 계산 로직
  ```
  가동률 = (성공 횟수 / 전체 체크 횟수) × 100
  ```

- [ ] TypeORM QueryBuilder로 집계 쿼리 작성
  - checkInterval에 따른 예상 체크 수 계산
  - 실제 성공/실패 횟수 계산
  - 쿼리 성능 최적화

- [ ] 응답 형식
  ```json
  {
    "endpointId": "uuid",
    "period": "24h",
    "uptime": 99.5,
    "totalChecks": 1440,
    "successfulChecks": 1433,
    "failedChecks": 7,
    "startDate": "2025-10-15T12:00:00.000Z",
    "endDate": "2025-10-16T12:00:00.000Z"
  }
  ```

---

### 3. 응답 시간 통계 API 구현

**목표**: 응답 시간의 상세 통계 제공

- [ ] GET /api/endpoints/:id/response-time 구현
  - Query Parameter: period (24h, 7d, 30d)

- [ ] 통계 지표 계산
  - 평균 응답 시간
  - 최소 응답 시간
  - 최대 응답 시간
  - P50 (중앙값)
  - P95 (95 백분위수)
  - P99 (99 백분위수)

- [ ] PostgreSQL Percentile 함수 사용
  ```sql
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY responseTime)
  ```

- [ ] 시계열 데이터 제공
  - 시간당 평균 응답 시간
  - 차트 렌더링용 데이터 포인트

- [ ] 응답 형식
  ```json
  {
    "endpointId": "uuid",
    "period": "24h",
    "statistics": {
      "average": 145,
      "min": 89,
      "max": 523,
      "p50": 134,
      "p95": 298,
      "p99": 456
    },
    "timeSeries": [
      {
        "timestamp": "2025-10-16T00:00:00.000Z",
        "avgResponseTime": 150
      }
    ]
  }
  ```

---

### 4. 전체 엔드포인트 통계 API

**목표**: 모든 엔드포인트의 요약 통계 제공

- [ ] GET /api/statistics/overview 구현
  - 전체 엔드포인트 수
  - 상태별 분류 (UP, DOWN, DEGRADED, UNKNOWN)
  - 전체 가동률
  - 활성 인시던트 수
  - 24시간 인시던트 발생 수
  - 평균 응답 시간

- [ ] 응답 형식
  ```json
  {
    "totalEndpoints": 10,
    "statusBreakdown": {
      "UP": 8,
      "DOWN": 1,
      "DEGRADED": 1,
      "UNKNOWN": 0
    },
    "overallUptime": 98.5,
    "activeIncidents": 1,
    "totalIncidentsLast24h": 3,
    "averageResponseTime": 156
  }
  ```

---

### 5. 인시던트 히스토리 API

**목표**: 인시던트 이력 조회 및 통계

- [ ] GET /api/incidents 구현
  - Query Parameter: endpointId, status (active, resolved)
  - 페이지네이션

- [ ] GET /api/incidents/:id 구현
  - 인시던트 상세 정보
  - 관련 체크 결과 포함

- [ ] 인시던트 통계 계산
  - 총 인시던트 수
  - 평균 복구 시간 (MTTR - Mean Time To Recovery)
  - 가장 긴 장애 시간
  - 월별 인시던트 발생 추이

---

### 6. 엔드포인트별 성능 비교

**목표**: 모든 엔드포인트의 성능을 비교

- [ ] GET /api/statistics/comparison 구현
  - 가동률 순위
  - 평균 응답 시간 순위
  - 인시던트 발생 빈도
  - 안정성 점수 계산

- [ ] 안정성 점수 계산 로직
  ```
  안정성 점수 = (가동률 × 0.6) + ((1 - 정규화된 평균 응답시간) × 0.3) + ((1 - 정규화된 인시던트 빈도) × 0.1)
  ```

- [ ] 응답 형식 (정렬된 리스트)
  ```json
  {
    "data": [
      {
        "endpointId": "uuid",
        "name": "API Server",
        "uptime24h": 99.5,
        "avgResponseTime": 145,
        "incidentCount": 0,
        "stabilityScore": 98.5,
        "rank": 1
      }
    ]
  }
  ```

---

### 7. 데이터베이스 쿼리 최적화

**목표**: 통계 조회 성능 최적화

- [ ] 인덱스 확인 및 추가
  - check_results에 복합 인덱스 확인
  - incidents에 필요한 인덱스 확인

- [ ] EXPLAIN ANALYZE 실행
  - 주요 쿼리 성능 분석
  - 인덱스 사용 여부 확인

- [ ] 쿼리 최적화
  - N+1 문제 해결
  - TypeORM leftJoinAndSelect 활용
  - 불필요한 조인 제거

- [ ] 뷰 생성 (선택사항)
  - `v_endpoint_response_stats` (응답 시간 통계)
  - `v_active_incidents` (활성 인시던트)

---

## ✅ 완료 체크리스트

작업이 완료되었는지 확인합니다:

- [ ] 가동률 API가 정상 작동하는가?
  ```bash
  GET /api/endpoints/:id/uptime?period=24h
  ```

- [ ] 응답 시간 통계 API가 정상 작동하는가?
  ```bash
  GET /api/endpoints/:id/response-time?period=24h
  ```

- [ ] 전체 통계 API가 정상 작동하는가?
  ```bash
  GET /api/statistics/overview
  ```

- [ ] 인시던트 조회 API가 정상 작동하는가?
  ```bash
  GET /api/incidents
  GET /api/incidents/:id
  ```

- [ ] 성능 비교 API가 정상 작동하는가?
  ```bash
  GET /api/statistics/comparison
  ```

- [ ] 통계 조회 성능이 200ms 이하인가?
  - API 응답 시간 측정
  - 대량 데이터 테스트

- [ ] 캐싱이 정상 작동하는가?
  - Redis에서 캐시 데이터 확인
  - 반복 요청 시 성능 개선 확인

---

## 📝 테스트 데이터 생성

```sql
-- 테스트 데이터 생성 스크립트
-- 여러 엔드포인트의 체크 결과 대량 생성
-- 통계 계산 정확성 확인
```

---

## 🧪 성능 테스트

### 성능 목표
- 단일 엔드포인트 통계 조회: < 100ms
- 전체 통계 조회: < 200ms
- 대량 데이터 처리: 10만 개 체크 결과 조회 < 500ms

### 테스트 방법
```bash
# ApacheBench 또는 Artillery 사용
ab -n 100 -c 10 http://localhost:3000/api/statistics/overview
```

---

## 🔗 관련 문서

- [FEATURE_SPECIFICATIONS.md](../docs/FEATURE_SPECIFICATIONS.md#5-통계-및-분석) - 통계 명세
- [API_SPECIFICATIONS.md](../docs/API_SPECIFICATIONS.md#3-통계-api) - 통계 API 명세
- [DATABASE_SCHEMA.md](../docs/DATABASE_SCHEMA.md#5-데이터베이스-함수-및-뷰) - DB 함수/뷰

## 📚 참고 자료

- [TypeORM QueryBuilder](https://typeorm.io/select-query-builder)
- [PostgreSQL Aggregate Functions](https://www.postgresql.org/docs/current/functions-aggregate.html)

## ➡️ 다음 단계

→ [05-frontend-basic.md](./05-frontend-basic.md)

**다음 단계 내용**:
- Vite + React + TS 프로젝트 셋업
- 레이아웃 및 라우팅
- 엔드포인트 목록 및 등록 폼
- API 서비스 연결
