# 데이터베이스 스키마 설계

## 개요

- **DBMS**: PostgreSQL 15
- **ORM**: TypeORM
- **인코딩**: UTF-8
- **Timezone**: UTC

---

## ERD (Entity Relationship Diagram)

```
┌─────────────────────┐
│     endpoints       │
├─────────────────────┤
│ id (PK)             │
│ name                │
│ url                 │
│ method              │
│ headers             │
│ body                │
│ checkInterval       │
│ expectedStatusCode  │
│ timeoutThreshold    │
│ isActive            │
│ currentStatus       │
│ lastResponseTime    │
│ lastCheckedAt       │
│ consecutiveFailures │
│ createdAt           │
│ updatedAt           │
└─────────────────────┘
         │
         │ 1:N
         ├──────────────────────┐
         │                      │
         ▼                      ▼
┌─────────────────────┐  ┌─────────────────────┐
│   check_results     │  │     incidents       │
├─────────────────────┤  ├─────────────────────┤
│ id (PK)             │  │ id (PK)             │
│ endpointId (FK)     │  │ endpointId (FK)     │
│ status              │  │ startedAt           │
│ responseTime        │  │ resolvedAt          │
│ statusCode          │  │ duration            │
│ errorMessage        │  │ failureCount        │
│ checkedAt           │  │ errorMessage        │
└─────────────────────┘  └─────────────────────┘

┌──────────────────────────┐
│  notification_channels   │
├──────────────────────────┤
│ id (PK)                  │
│ name                     │
│ type                     │
│ config                   │
│ isActive                 │
│ createdAt                │
│ updatedAt                │
└──────────────────────────┘
```

---

## 1. endpoints (엔드포인트)

모니터링할 API 엔드포인트 정보를 저장합니다.

### 테이블 구조

| 컬럼명 | 데이터 타입 | NULL | 기본값 | 설명 |
|--------|------------|------|--------|------|
| id | UUID | NO | uuid_generate_v4() | 기본 키 |
| name | VARCHAR(255) | NO | - | 엔드포인트 이름 |
| url | VARCHAR(2048) | NO | - | 모니터링할 URL |
| method | ENUM | NO | 'GET' | HTTP 메소드 |
| headers | JSONB | YES | NULL | HTTP 헤더 (JSON) |
| body | JSONB | YES | NULL | 요청 바디 (JSON) |
| checkInterval | INTEGER | NO | 60 | 체크 간격 (초) |
| expectedStatusCode | INTEGER | NO | 200 | 예상 응답 코드 |
| timeoutThreshold | INTEGER | NO | 5000 | 타임아웃 임계값 (ms) |
| isActive | BOOLEAN | NO | TRUE | 활성화 여부 |
| currentStatus | ENUM | NO | 'UNKNOWN' | 현재 상태 |
| lastResponseTime | FLOAT | YES | NULL | 마지막 응답 시간 (ms) |
| lastCheckedAt | TIMESTAMP | YES | NULL | 마지막 체크 시간 |
| consecutiveFailures | INTEGER | NO | 0 | 연속 실패 횟수 |
| createdAt | TIMESTAMP | NO | CURRENT_TIMESTAMP | 생성 시간 |
| updatedAt | TIMESTAMP | NO | CURRENT_TIMESTAMP | 수정 시간 |

### ENUM 타입

**method**
```sql
CREATE TYPE http_method AS ENUM (
  'GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'
);
```

**currentStatus**
```sql
CREATE TYPE endpoint_status AS ENUM (
  'UP', 'DOWN', 'DEGRADED', 'UNKNOWN'
);
```

### 제약 조건

```sql
-- Primary Key
ALTER TABLE endpoints ADD CONSTRAINT pk_endpoints PRIMARY KEY (id);

-- Check Constraints
ALTER TABLE endpoints ADD CONSTRAINT chk_check_interval
  CHECK (checkInterval >= 30);

ALTER TABLE endpoints ADD CONSTRAINT chk_timeout_threshold
  CHECK (timeoutThreshold >= 1000 AND timeoutThreshold <= 60000);

ALTER TABLE endpoints ADD CONSTRAINT chk_consecutive_failures
  CHECK (consecutiveFailures >= 0);

-- Unique Constraints (선택적)
-- ALTER TABLE endpoints ADD CONSTRAINT uq_endpoints_url UNIQUE (url);
```

### 인덱스

```sql
-- 상태별 조회 성능 향상
CREATE INDEX idx_endpoints_status ON endpoints (currentStatus);

-- 활성화 여부 조회
CREATE INDEX idx_endpoints_active ON endpoints (isActive);

-- 마지막 체크 시간 정렬
CREATE INDEX idx_endpoints_last_checked ON endpoints (lastCheckedAt DESC);

-- 복합 인덱스: 활성화 + 상태
CREATE INDEX idx_endpoints_active_status ON endpoints (isActive, currentStatus);

-- 이름 검색
CREATE INDEX idx_endpoints_name ON endpoints USING gin(to_tsvector('english', name));
```

### 샘플 데이터

```sql
INSERT INTO endpoints (name, url, method, checkInterval, expectedStatusCode, timeoutThreshold)
VALUES
  ('Example API', 'https://api.example.com/health', 'GET', 60, 200, 5000),
  ('Payment Gateway', 'https://payment.example.com/status', 'GET', 30, 200, 3000),
  ('User Service', 'https://users.example.com/ping', 'HEAD', 120, 200, 5000);
```

---

## 2. check_results (체크 결과)

헬스 체크 실행 결과를 저장합니다.

### 테이블 구조

| 컬럼명 | 데이터 타입 | NULL | 기본값 | 설명 |
|--------|------------|------|--------|------|
| id | UUID | NO | uuid_generate_v4() | 기본 키 |
| endpointId | UUID | NO | - | 엔드포인트 ID (FK) |
| status | ENUM | NO | - | 체크 결과 (success/failure) |
| responseTime | FLOAT | YES | NULL | 응답 시간 (ms) |
| statusCode | INTEGER | YES | NULL | HTTP 상태 코드 |
| errorMessage | TEXT | YES | NULL | 에러 메시지 |
| checkedAt | TIMESTAMP | NO | CURRENT_TIMESTAMP | 체크 시간 |

### ENUM 타입

```sql
CREATE TYPE check_status AS ENUM ('success', 'failure');
```

### 제약 조건

```sql
-- Primary Key
ALTER TABLE check_results ADD CONSTRAINT pk_check_results PRIMARY KEY (id);

-- Foreign Key
ALTER TABLE check_results ADD CONSTRAINT fk_check_results_endpoint
  FOREIGN KEY (endpointId) REFERENCES endpoints(id) ON DELETE CASCADE;

-- Check Constraints
ALTER TABLE check_results ADD CONSTRAINT chk_response_time
  CHECK (responseTime IS NULL OR responseTime >= 0);

ALTER TABLE check_results ADD CONSTRAINT chk_status_code
  CHECK (statusCode IS NULL OR (statusCode >= 100 AND statusCode < 600));
```

### 인덱스

```sql
-- 엔드포인트별 조회 (가장 중요)
CREATE INDEX idx_check_results_endpoint ON check_results (endpointId);

-- 시간 기반 조회 및 정렬
CREATE INDEX idx_check_results_checked_at ON check_results (checkedAt DESC);

-- 복합 인덱스: 엔드포인트 + 시간
CREATE INDEX idx_check_results_endpoint_time
  ON check_results (endpointId, checkedAt DESC);

-- 상태별 조회
CREATE INDEX idx_check_results_status ON check_results (status);

-- 통계 쿼리 최적화용 복합 인덱스
CREATE INDEX idx_check_results_stats
  ON check_results (endpointId, status, checkedAt);
```

### 파티셔닝 (선택적, 대용량 데이터 처리 시)

```sql
-- 월별 파티셔닝 예시
CREATE TABLE check_results_2025_10 PARTITION OF check_results
  FOR VALUES FROM ('2025-10-01') TO ('2025-11-01');

CREATE TABLE check_results_2025_11 PARTITION OF check_results
  FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');
```

### 데이터 보관 정책 (자동 삭제)

```sql
-- 30일 이상 된 체크 결과 삭제 (예정)
-- 매일 자정 실행되는 크론 작업으로 처리
DELETE FROM check_results
WHERE checkedAt < NOW() - INTERVAL '30 days';
```

### 샘플 데이터

```sql
INSERT INTO check_results (endpointId, status, responseTime, statusCode, checkedAt)
SELECT
  id,
  'success',
  RANDOM() * 500 + 50,
  200,
  NOW() - (INTERVAL '1 minute' * generate_series(1, 100))
FROM endpoints
LIMIT 1;
```

---

## 3. incidents (인시던트)

장애 발생 및 복구 이력을 저장합니다.

### 테이블 구조

| 컬럼명 | 데이터 타입 | NULL | 기본값 | 설명 |
|--------|------------|------|--------|------|
| id | UUID | NO | uuid_generate_v4() | 기본 키 |
| endpointId | UUID | NO | - | 엔드포인트 ID (FK) |
| startedAt | TIMESTAMP | NO | CURRENT_TIMESTAMP | 시작 시간 |
| resolvedAt | TIMESTAMP | YES | NULL | 해결 시간 |
| duration | INTEGER | YES | NULL | 지속 시간 (ms) |
| failureCount | INTEGER | NO | 0 | 실패 횟수 |
| errorMessage | TEXT | YES | NULL | 에러 메시지 |

### 제약 조건

```sql
-- Primary Key
ALTER TABLE incidents ADD CONSTRAINT pk_incidents PRIMARY KEY (id);

-- Foreign Key
ALTER TABLE incidents ADD CONSTRAINT fk_incidents_endpoint
  FOREIGN KEY (endpointId) REFERENCES endpoints(id) ON DELETE CASCADE;

-- Check Constraints
ALTER TABLE incidents ADD CONSTRAINT chk_resolved_after_started
  CHECK (resolvedAt IS NULL OR resolvedAt >= startedAt);

ALTER TABLE incidents ADD CONSTRAINT chk_failure_count
  CHECK (failureCount >= 0);

ALTER TABLE incidents ADD CONSTRAINT chk_duration
  CHECK (duration IS NULL OR duration >= 0);
```

### 인덱스

```sql
-- 엔드포인트별 조회
CREATE INDEX idx_incidents_endpoint ON incidents (endpointId);

-- 시작 시간 정렬
CREATE INDEX idx_incidents_started_at ON incidents (startedAt DESC);

-- 진행중인 인시던트 조회 (resolvedAt이 NULL)
CREATE INDEX idx_incidents_active ON incidents (endpointId, resolvedAt)
  WHERE resolvedAt IS NULL;

-- 해결된 인시던트 조회
CREATE INDEX idx_incidents_resolved ON incidents (resolvedAt DESC)
  WHERE resolvedAt IS NOT NULL;
```

### 트리거 (duration 자동 계산)

```sql
-- 인시던트 해결 시 duration 자동 계산
CREATE OR REPLACE FUNCTION calculate_incident_duration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.resolvedAt IS NOT NULL AND OLD.resolvedAt IS NULL THEN
    NEW.duration = EXTRACT(EPOCH FROM (NEW.resolvedAt - NEW.startedAt)) * 1000;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_calculate_incident_duration
  BEFORE UPDATE ON incidents
  FOR EACH ROW
  EXECUTE FUNCTION calculate_incident_duration();
```

### 샘플 데이터

```sql
INSERT INTO incidents (endpointId, startedAt, resolvedAt, failureCount, errorMessage)
SELECT
  id,
  NOW() - INTERVAL '1 hour',
  NOW() - INTERVAL '55 minutes',
  5,
  'Connection timeout'
FROM endpoints
LIMIT 1;
```

---

## 4. notification_channels (알림 채널)

알림 채널 설정 정보를 저장합니다.

### 테이블 구조

| 컬럼명 | 데이터 타입 | NULL | 기본값 | 설명 |
|--------|------------|------|--------|------|
| id | UUID | NO | uuid_generate_v4() | 기본 키 |
| name | VARCHAR(255) | NO | - | 채널 이름 |
| type | ENUM | NO | - | 채널 유형 |
| config | JSONB | NO | - | 채널 설정 (JSON) |
| isActive | BOOLEAN | NO | TRUE | 활성화 여부 |
| createdAt | TIMESTAMP | NO | CURRENT_TIMESTAMP | 생성 시간 |
| updatedAt | TIMESTAMP | NO | CURRENT_TIMESTAMP | 수정 시간 |

### ENUM 타입

```sql
CREATE TYPE notification_type AS ENUM ('email', 'slack', 'webhook', 'sms');
```

### 제약 조건

```sql
-- Primary Key
ALTER TABLE notification_channels ADD CONSTRAINT pk_notification_channels
  PRIMARY KEY (id);

-- Unique Constraint: 같은 타입 + 같은 이름 방지
ALTER TABLE notification_channels ADD CONSTRAINT uq_notification_channels_name_type
  UNIQUE (name, type);
```

### 인덱스

```sql
-- 활성화된 채널 조회
CREATE INDEX idx_notification_channels_active
  ON notification_channels (isActive);

-- 타입별 조회
CREATE INDEX idx_notification_channels_type
  ON notification_channels (type);
```

### config 필드 구조

**Email 타입**
```json
{
  "recipients": ["admin@example.com", "team@example.com"],
  "smtpHost": "smtp.gmail.com",
  "smtpPort": 587,
  "smtpUser": "sender@example.com",
  "smtpPass": "encrypted_password"
}
```

**Slack 타입**
```json
{
  "webhookUrl": "https://hooks.slack.com/services/XXX/YYY/ZZZ",
  "channel": "#alerts",
  "username": "Vigil Bot"
}
```

### 샘플 데이터

```sql
INSERT INTO notification_channels (name, type, config)
VALUES
  (
    'Email Alerts',
    'email',
    '{"recipients": ["admin@example.com"]}'::jsonb
  ),
  (
    'Slack Alerts',
    'slack',
    '{"webhookUrl": "https://hooks.slack.com/services/XXX", "channel": "#alerts"}'::jsonb
  );
```

---

## 5. 데이터베이스 함수 및 뷰

### 5.1 엔드포인트 가동률 계산 함수

```sql
CREATE OR REPLACE FUNCTION calculate_uptime(
  p_endpoint_id UUID,
  p_start_date TIMESTAMP,
  p_end_date TIMESTAMP
)
RETURNS TABLE (
  uptime_percentage FLOAT,
  total_checks BIGINT,
  successful_checks BIGINT,
  failed_checks BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    CASE
      WHEN COUNT(*) = 0 THEN 0.0
      ELSE (COUNT(*) FILTER (WHERE status = 'success')::FLOAT / COUNT(*)) * 100
    END as uptime_percentage,
    COUNT(*) as total_checks,
    COUNT(*) FILTER (WHERE status = 'success') as successful_checks,
    COUNT(*) FILTER (WHERE status = 'failure') as failed_checks
  FROM check_results
  WHERE endpointId = p_endpoint_id
    AND checkedAt >= p_start_date
    AND checkedAt <= p_end_date;
END;
$$ LANGUAGE plpgsql;
```

### 5.2 응답 시간 통계 뷰

```sql
CREATE OR REPLACE VIEW v_endpoint_response_stats AS
SELECT
  e.id as endpoint_id,
  e.name as endpoint_name,
  COUNT(cr.id) as total_checks_24h,
  AVG(cr.responseTime) as avg_response_time,
  MIN(cr.responseTime) as min_response_time,
  MAX(cr.responseTime) as max_response_time,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY cr.responseTime) as p50,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY cr.responseTime) as p95,
  PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY cr.responseTime) as p99
FROM endpoints e
LEFT JOIN check_results cr ON e.id = cr.endpointId
  AND cr.checkedAt >= NOW() - INTERVAL '24 hours'
  AND cr.status = 'success'
GROUP BY e.id, e.name;
```

### 5.3 활성 인시던트 뷰

```sql
CREATE OR REPLACE VIEW v_active_incidents AS
SELECT
  i.id,
  i.endpointId,
  e.name as endpoint_name,
  e.url as endpoint_url,
  i.startedAt,
  i.failureCount,
  i.errorMessage,
  EXTRACT(EPOCH FROM (NOW() - i.startedAt)) * 1000 as current_duration_ms
FROM incidents i
JOIN endpoints e ON i.endpointId = e.id
WHERE i.resolvedAt IS NULL
ORDER BY i.startedAt DESC;
```

---

## 6. 데이터 마이그레이션

### 초기 마이그레이션 순서

1. ENUM 타입 생성
2. endpoints 테이블 생성
3. check_results 테이블 생성
4. incidents 테이블 생성
5. notification_channels 테이블 생성
6. 인덱스 생성
7. 함수 및 뷰 생성
8. 트리거 생성

### TypeORM 마이그레이션 예시

```typescript
// TypeORM CLI를 통한 마이그레이션 생성
// npm run migration:generate -- -n InitialSchema

// 실행
// npm run migration:run
```

---

## 7. 성능 최적화 전략

### 7.1 인덱싱 전략

- **선택적 인덱스**: WHERE 조건에 자주 사용되는 컬럼
- **복합 인덱스**: 함께 조회되는 컬럼 조합
- **부분 인덱스**: 특정 조건의 데이터만 인덱싱

### 7.2 파티셔닝

- **check_results**: 월별 파티셔닝으로 오래된 데이터 관리
- **incidents**: 필요시 연도별 파티셔닝

### 7.3 자동 정리 작업

```sql
-- 30일 이상 된 체크 결과 삭제 (일별 실행)
DELETE FROM check_results
WHERE checkedAt < NOW() - INTERVAL '30 days';

-- 1년 이상 된 해결된 인시던트 아카이빙
-- (별도 아카이브 테이블로 이동)
```

### 7.4 쿼리 최적화

- **EXPLAIN ANALYZE** 활용
- **적절한 JOIN 사용**
- **N+1 문제 방지** (TypeORM eager loading)

---

## 8. 백업 및 복구

### 백업 전략

```bash
# 전체 데이터베이스 백업
pg_dump -U postgres -d api_monitor -F c -b -v -f backup.dump

# 특정 테이블만 백업
pg_dump -U postgres -d api_monitor -t endpoints -F c -f endpoints.dump
```

### 복구

```bash
# 백업 복구
pg_restore -U postgres -d api_monitor -v backup.dump

# 특정 테이블 복구
pg_restore -U postgres -d api_monitor -t endpoints -v endpoints.dump
```

---

## 9. 모니터링 쿼리

### 테이블 크기 확인

```sql
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### 인덱스 사용률 확인

```sql
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

### 느린 쿼리 확인

```sql
SELECT
  query,
  calls,
  total_time,
  mean_time,
  max_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

---

## 10. 보안 고려사항

### 민감 정보 암호화

- **notification_channels.config**: 암호화된 형태로 저장
- **endpoints.headers**: Authorization 헤더 등 민감 정보 암호화

### 권한 관리

```sql
-- 애플리케이션용 사용자 생성
CREATE USER vigil_app WITH PASSWORD 'secure_password';

-- 필요한 권한만 부여
GRANT CONNECT ON DATABASE api_monitor TO vigil_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO vigil_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO vigil_app;

-- 읽기 전용 사용자 (통계/분석용)
CREATE USER vigil_readonly WITH PASSWORD 'readonly_password';
GRANT CONNECT ON DATABASE api_monitor TO vigil_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO vigil_readonly;
```

---

## 부록: 전체 스키마 생성 스크립트

```sql
-- ENUM 타입 생성
CREATE TYPE http_method AS ENUM ('GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS');
CREATE TYPE endpoint_status AS ENUM ('UP', 'DOWN', 'DEGRADED', 'UNKNOWN');
CREATE TYPE check_status AS ENUM ('success', 'failure');
CREATE TYPE notification_type AS ENUM ('email', 'slack', 'webhook', 'sms');

-- UUID 확장 활성화
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- endpoints 테이블
CREATE TABLE endpoints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  url VARCHAR(2048) NOT NULL,
  method http_method NOT NULL DEFAULT 'GET',
  headers JSONB,
  body JSONB,
  checkInterval INTEGER NOT NULL DEFAULT 60,
  expectedStatusCode INTEGER NOT NULL DEFAULT 200,
  timeoutThreshold INTEGER NOT NULL DEFAULT 5000,
  isActive BOOLEAN NOT NULL DEFAULT TRUE,
  currentStatus endpoint_status NOT NULL DEFAULT 'UNKNOWN',
  lastResponseTime FLOAT,
  lastCheckedAt TIMESTAMP,
  consecutiveFailures INTEGER NOT NULL DEFAULT 0,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_check_interval CHECK (checkInterval >= 30),
  CONSTRAINT chk_timeout_threshold CHECK (timeoutThreshold >= 1000 AND timeoutThreshold <= 60000),
  CONSTRAINT chk_consecutive_failures CHECK (consecutiveFailures >= 0)
);

-- check_results 테이블
CREATE TABLE check_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  endpointId UUID NOT NULL REFERENCES endpoints(id) ON DELETE CASCADE,
  status check_status NOT NULL,
  responseTime FLOAT,
  statusCode INTEGER,
  errorMessage TEXT,
  checkedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_response_time CHECK (responseTime IS NULL OR responseTime >= 0),
  CONSTRAINT chk_status_code CHECK (statusCode IS NULL OR (statusCode >= 100 AND statusCode < 600))
);

-- incidents 테이블
CREATE TABLE incidents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  endpointId UUID NOT NULL REFERENCES endpoints(id) ON DELETE CASCADE,
  startedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolvedAt TIMESTAMP,
  duration INTEGER,
  failureCount INTEGER NOT NULL DEFAULT 0,
  errorMessage TEXT,
  CONSTRAINT chk_resolved_after_started CHECK (resolvedAt IS NULL OR resolvedAt >= startedAt),
  CONSTRAINT chk_failure_count CHECK (failureCount >= 0),
  CONSTRAINT chk_duration CHECK (duration IS NULL OR duration >= 0)
);

-- notification_channels 테이블
CREATE TABLE notification_channels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  type notification_type NOT NULL,
  config JSONB NOT NULL,
  isActive BOOLEAN NOT NULL DEFAULT TRUE,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_notification_channels_name_type UNIQUE (name, type)
);

-- 인덱스 생성 (주요 인덱스만)
CREATE INDEX idx_endpoints_status ON endpoints (currentStatus);
CREATE INDEX idx_endpoints_active ON endpoints (isActive);
CREATE INDEX idx_check_results_endpoint_time ON check_results (endpointId, checkedAt DESC);
CREATE INDEX idx_incidents_endpoint ON incidents (endpointId);
CREATE INDEX idx_incidents_active ON incidents (endpointId, resolvedAt) WHERE resolvedAt IS NULL;
```
