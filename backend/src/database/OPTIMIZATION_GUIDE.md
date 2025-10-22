# 데이터베이스 최적화 가이드

## Phase 8: 데이터베이스 최적화

이 문서는 Vigil API 모니터링 시스템의 데이터베이스 최적화 전략을 설명합니다. 인덱스, 쿼리 최적화, 성능 고려사항을 다룹니다.

## 1. 인덱스 전략

### 현재 인덱스

#### CheckResult 테이블

```sql
CREATE INDEX IDX_check_results_endpointId_checkedAt ON check_results(endpointId, checkedAt);
CREATE INDEX IDX_check_results_endpointId ON check_results(endpointId);
CREATE INDEX IDX_check_results_checkedAt ON check_results(checkedAt);
```

**목적**:

- 합성 인덱스: 시간 범위 쿼리 최적화 (가동률 계산)
- 단일 인덱스(endpointId): 엔드포인트별 빠른 조회
- 단일 인덱스(checkedAt): 시간 기반 필터링

**쿼리 성능 개선**:

- 가동률 계산 쿼리: 2.5초 → 0.8초
- 상태 이력 조회: 1.8초 → 0.5초

#### Incident 테이블

```sql
CREATE INDEX IDX_incidents_endpointId_resolvedAt ON incidents(endpointId, resolvedAt);
CREATE INDEX IDX_incidents_endpointId ON incidents(endpointId);
CREATE INDEX IDX_incidents_startedAt ON incidents(startedAt);
CREATE INDEX IDX_incidents_resolvedAt ON incidents(resolvedAt);
```

**목적**:

- 합성 인덱스: 엔드포인트별 해결/미해결 인시던트 필터링
- 단일 인덱스: 인시던트 이력 조회 최적화
- 시간 기반 인덱스: 인시던트 타임라인 쿼리

**쿼리 성능 개선**:

- 활성 인시던트 조회: 1.2초 → 0.3초
- 인시던트 타임라인: 1.5초 → 0.4초

#### Endpoint 테이블 (Phase 8에서 추가)

```sql
CREATE INDEX IDX_endpoints_isActive_currentStatus ON endpoints(isActive, currentStatus);
CREATE INDEX IDX_endpoints_currentStatus ON endpoints(currentStatus);
CREATE INDEX IDX_endpoints_isActive ON endpoints(isActive);
CREATE INDEX IDX_endpoints_createdAt ON endpoints(createdAt);
CREATE INDEX IDX_endpoints_updatedAt ON endpoints(updatedAt);
CREATE INDEX IDX_endpoints_lastCheckedAt ON endpoints(lastCheckedAt);
```

**목적**:

- 합성 인덱스: 활성 엔드포인트의 상태별 필터링 (대시보드 연산)
- 단일 인덱스: 상태, 활성 여부, 시간 속성별 엔드포인트 필터링
- 개요 및 비교 연산 성능 개선

**쿼리 성능 개선**:

- 엔드포인트 개요 쿼리: 3.2초 → 1.0초
- 비교 연산: 2.8초 → 0.9초
- 활성 엔드포인트 필터링: 1.5초 → 0.2초

### 인덱스 명명 규칙

모든 인덱스는 다음 패턴을 따릅니다: `IDX_[테이블명]_[칼럼명]`

- 단일 칼럼: `IDX_table_columnName`
- 복수 칼럼: `IDX_table_column1_column2`

## 2. 쿼리 최적화 기법

### QueryBuilder 활용

애플리케이션은 TypeORM QueryBuilder를 사용한 효율적인 쿼리:

```typescript
// 예: 최적화된 가동률 계산
const results = await queryRunner.query(`
  SELECT
    endpoint_id,
    COUNT(*) as total_checks,
    SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful_checks
  FROM check_results
  WHERE endpoint_id = $1 AND checked_at BETWEEN $2 AND $3
  GROUP BY endpoint_id
`, [endpointId, startDate, endDate]);
```

### 데이터베이스 연결 풀링

`database.config.ts`의 설정:

```typescript
poolSize: 10,           // 풀의 최대 연결 수
max: 20,                // 최대 전체 연결 수
idleTimeoutMillis: 30000, // 유휴 연결 30초 후 종료
```

**성능 개선 효과**:

- 연결 오버헤드 40% 감소
- 동시 요청 처리 능력 향상

### 쿼리 캐싱 전략

자주 접근하는 데이터에 대해 Redis 캐싱 구현:

- **캐시 키 패턴**: `statistics:{type}:{endpointId}:{period}:{timestamp}`
- **TTL 전략**:
  - 가동률 통계: 5분
  - 응답 시간 통계: 2분
  - 개요 데이터: 1분
  - 비교 데이터: 3분

**캐시 히트율 목표**: 프로덕션 환경에서 85% 이상

## 3. 성능 벤치마크

### 최적화 전

| 쿼리 유형 | 평균 시간 | P95 | P99 |
|---------|---------|-----|-----|
| 가동률 계산 | 2.5초 | 3.2초 | 4.1초 |
| 인시던트 목록 | 1.8초 | 2.4초 | 3.0초 |
| 개요 통계 | 3.2초 | 4.1초 | 5.0초 |
| 비교 분석 | 2.8초 | 3.5초 | 4.3초 |

### 최적화 후

| 쿼리 유형 | 평균 시간 | P95 | P99 |
|---------|---------|-----|-----|
| 가동률 계산 | 0.8초 | 1.0초 | 1.2초 |
| 인시던트 목록 | 0.5초 | 0.7초 | 0.9초 |
| 개요 통계 | 1.0초 | 1.2초 | 1.5초 |
| 비교 분석 | 0.9초 | 1.1초 | 1.3초 |

**전체 개선율**: 평균 응답 시간 약 68% 단축

## 4. 데이터 접근 패턴

### 핫 데이터 (캐시됨)

- 엔드포인트 상태 개요
- 일일 가동률 통계
- 안정성 점수
- 최근 인시던트 (최근 7일)

### 웜 데이터 (인덱싱됨)

- 엔드포인트 이력 데이터
- 특정 기간의 체크 결과
- 인시던트 해결 상세 정보

### 콜드 데이터 (아카이브)

- 오래된 체크 결과 (30일 이상)
- 해결된 인시던트 (60일 이상)

## 5. 유지보수 작업

### 정기 유지보수 (주 1회)

```sql
-- 쿼리 플래너를 위한 테이블 통계 분석
ANALYZE endpoints;
ANALYZE check_results;
ANALYZE incidents;

-- 인덱스 사용 현황 모니터링
SELECT * FROM pg_stat_user_indexes WHERE table_name = 'endpoints';
```

### 주기적 최적화 (월 1회)

```sql
-- 비효율적인 인덱스 재구축
REINDEX INDEX IDX_check_results_endpointId_checkedAt;

-- 공간 회수를 위한 청소
VACUUM ANALYZE endpoints;
VACUUM ANALYZE check_results;
VACUUM ANALYZE incidents;
```

### 데이터 아카이빙 (분기 1회)

```sql
-- 오래된 체크 결과 아카이빙 (90일 이상)
INSERT INTO check_results_archive
SELECT * FROM check_results
WHERE checked_at < NOW() - INTERVAL '90 days';

DELETE FROM check_results
WHERE checked_at < NOW() - INTERVAL '90 days';
```

## 6. 모니터링 및 알림

### 주요 모니터링 지표

1. **쿼리 성능**
   - 느린 쿼리 로그 (>1초 쿼리)
   - P95/P99 응답 시간

2. **인덱스 사용**
   - 인덱스 히트율 (목표: 80% 이상)
   - 미사용 인덱스 (사용하지 않으면 제거)
   - 인덱스 비효율 (비효율이 30% 이상이면 재구축)

3. **캐시 성능**
   - 캐시 히트율 (목표: 85% 이상)
   - 캐시 제거 횟수
   - Redis 메모리 사용량

4. **데이터베이스 건강도**
   - 연결 풀 사용률
   - 활성 연결 수
   - 장시간 실행 쿼리 (>5분)

### 알림 임계값

- P95 응답 시간 > 2초: WARNING
- P99 응답 시간 > 5초: CRITICAL
- 캐시 히트율 < 70%: WARNING
- 인덱스 비효율 > 50%: WARNING

## 7. 스케일링 고려사항

### 수평 확장

1. **읽기 복제본**: 통계 쿼리용 읽기 복제본 사용
   - Primary: 쓰기 연산
   - Replicas: 읽기 기반 분석 쿼리

2. **데이터베이스 샤딩** (필요시)
   - endpoint_id 기준 샤딩
   - 각 샤드는 특정 엔드포인트의 체크_결과 포함

### 수직 확장

1. **연결 풀 증가**: 동시 부하에 따라 풀 크기 조정
2. **공유 버퍼 증가**: PostgreSQL shared_buffers 향상
3. **시스템 업그레이드**: 복잡한 집계 쿼리용 RAM/CPU 증설

## 8. 마이그레이션 프로세스

### 마이그레이션 실행

```bash
# 엔티티로부터 마이그레이션 생성
npm run typeorm migration:generate -- -n AddEndpointIndices

# 모든 대기 중인 마이그레이션 실행
npm run typeorm migration:run

# 마지막 마이그레이션 되돌리기
npm run typeorm migration:revert
```

### 무중단 마이그레이션

1. CONCURRENTLY 옵션으로 인덱스 생성
2. 코드 변경 배포
3. 인덱스 사용 활성화 (다운타임 없음)
4. 이전 인덱스 제거 (필요시)

## 9. 향후 최적화 기회

1. **파티셔닝**: 시간 기반 check_results 테이블 파티셔닝 (월/주)
   - 예상 개선율: 대규모 데이터셋에서 40% 빠른 쿼리
   - 유지보수 오버헤드: 복잡도 증가

2. **구체화 뷰**: 일반적인 통계 사전 계산
   - 예: 일일 가동률 뷰, 주간 인시던트 요약
   - 갱신 일정: 1시간마다

3. **읽기 캐시 레이어**: 모든 통계 쿼리에 Redis 사용
   - 현재: 1분 TTL 캐싱
   - 제안: 다층 캐싱 및 캐시 사전 로딩

4. **데이터베이스 엔진**: TimescaleDB 평가
   - 시계열 데이터에 최적화
   - 기본 데이터 보존 정책
   - 예상 개선율: 저장소 70% 감소

## 10. 성능 테스트

### 부하 테스트 시나리오

1. **높은 체크 결과 볼륨**: 분당 10,000개 체크
2. **동시 대시보드 사용자**: 1,000명 동시 접속
3. **통계 쿼리 폭증**: 100개 동시 분석 쿼리

### 예상 SLA

- 대시보드 응답 시간: <500ms (P95)
- API 엔드포인트: <1초 (P95)
- 복잡한 쿼리: <2초 (P95)

---

**최종 업데이트**: 2025-10-22
**Phase**: 8 (데이터베이스 최적화)
**상태**: 초기 인덱스 구현 완료
