# Phase 7 완료 보고서: 데이터베이스 마이그레이션 및 시딩

**작성일**: 2025-12-04
**상태**: ✅ 완료
**소요 시간**: 약 1시간

---

## 📊 완료 항목

### 1. TypeORM 마이그레이션 설정 ✅

**완료된 작업:**
- [src/data-source.ts](../../backend/src/data-source.ts) - TypeORM DataSource 설정 파일 생성
- [package.json](../../backend/package.json) - 마이그레이션 스크립트 추가
  - `npm run migration:generate` - 스키마 변경 자동 감지 및 마이그레이션 생성
  - `npm run migration:create` - 빈 마이그레이션 파일 생성
  - `npm run migration:run` - 대기 중인 마이그레이션 실행
  - `npm run migration:revert` - 마지막 마이그레이션 롤백
  - `npm run migration:show` - 마이그레이션 상태 확인
  - `npm run migration:test` - 마이그레이션 테스트 (clean database)
  - `npm run seed:run` - 시드 데이터 실행

**의존성 추가:**
- `dotenv` ^17.2.3 - 환경 변수 로드

---

### 2. 초기 스키마 마이그레이션 생성 ✅

**파일**: [src/database/migrations/1733328000000-InitialSchema.ts](../../backend/src/database/migrations/1733328000000-InitialSchema.ts)

**포함된 내용:**

#### 테이블 (4개)
1. **notification_channels** - 알림 채널 설정
   - 컬럼: id, name, type, config, isActive, createdAt, updatedAt
   - 인덱스: type, isActive, unique(name, type)

2. **endpoints** - 모니터링 엔드포인트
   - 컬럼: id, name, url, method, headers, body, checkInterval, expectedStatusCode, timeoutThreshold, isActive, currentStatus, lastResponseTime, lastCheckedAt, consecutiveFailures, createdAt, updatedAt
   - 인덱스: isActive+currentStatus (복합), currentStatus, isActive, createdAt, updatedAt, lastCheckedAt

3. **check_results** - 헬스 체크 결과 이력
   - 컬럼: id, endpointId, status, responseTime, statusCode, errorMessage, checkedAt
   - 인덱스: endpointId, checkedAt, endpointId+checkedAt (복합)
   - 외래 키: endpointId → endpoints(id) ON DELETE CASCADE

4. **incidents** - 장애 이력
   - 컬럼: id, endpointId, startedAt, resolvedAt, duration, failureCount, errorMessage
   - 인덱스: endpointId, startedAt, resolvedAt, endpointId+resolvedAt (복합)
   - 외래 키: endpointId → endpoints(id) ON DELETE CASCADE

#### Enum 타입 (4개)
- `notification_channels_type_enum`: email, slack, webhook, sms
- `endpoints_method_enum`: GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS
- `endpoints_currentstatus_enum`: UP, DOWN, DEGRADED, UNKNOWN
- `check_results_status_enum`: success, failure

#### 외래 키 제약
- check_results.endpointId → endpoints.id (CASCADE)
- incidents.endpointId → endpoints.id (CASCADE)

**기존 마이그레이션 정리:**
- `1729596000000-AddEndpointIndices.ts` 삭제 (InitialSchema에 이미 포함됨)

---

### 3. 시드 데이터 파일 작성 ✅

#### 3.1 엔드포인트 시드 ([endpoint.seed.ts](../../backend/src/database/seeds/endpoint.seed.ts))

**샘플 데이터 (5개)**:
1. **Google Homepage**
   - URL: https://www.google.com
   - Method: GET
   - Check Interval: 60초

2. **JSONPlaceholder API**
   - URL: https://jsonplaceholder.typicode.com/posts/1
   - Method: GET
   - Check Interval: 120초

3. **HTTPBin GET Test**
   - URL: https://httpbin.org/get
   - Method: GET
   - Check Interval: 180초

4. **HTTPBin POST Test**
   - URL: https://httpbin.org/post
   - Method: POST
   - Headers: Content-Type: application/json
   - Body: {"test": "data"}
   - Check Interval: 300초

5. **GitHub API Status**
   - URL: https://api.github.com/status
   - Method: GET
   - Headers: User-Agent: Vigil-Monitor
   - Check Interval: 300초

**기능:**
- 중복 방지: 기존 데이터가 있으면 건너뜀
- 기본 상태: currentStatus = UNKNOWN
- 모두 활성화: isActive = true

#### 3.2 알림 채널 시드 ([notification-channel.seed.ts](../../backend/src/database/seeds/notification-channel.seed.ts))

**샘플 데이터 (3개)**:
1. **Default Email Channel**
   - Type: email
   - Recipients: admin@example.com, ops@example.com
   - Active: true

2. **Slack Alerts**
   - Type: slack
   - Config: webhookUrl, channel (#alerts), username (Vigil Bot)
   - Active: false (설정 필요)

3. **Critical Alerts Email**
   - Type: email
   - Recipients: critical@example.com
   - Active: true

**기능:**
- 중복 방지: 기존 데이터가 있으면 건너뜀
- 환경 변수 지원: SLACK_WEBHOOK_URL 사용

#### 3.3 시드 실행 스크립트 ([run-seeds.ts](../../backend/src/database/seeds/run-seeds.ts))

**기능:**
- DataSource 초기화
- 모든 시드 순차 실행
- 연결 정리 및 에러 처리
- 실행 로그 출력

---

### 4. 마이그레이션 실행 및 검증 ✅

#### 4.1 마이그레이션 테스트 스크립트 ([test-migration.ts](../../backend/src/database/test-migration.ts))

**테스트 과정:**
1. ✅ DataSource 초기화
2. ✅ 기존 테이블 삭제 (clean slate)
3. ✅ 마이그레이션 실행
4. ✅ 테이블 존재 검증
5. ✅ 연결 정리

**실행 결과:**
```bash
npm run migration:test

🧪 Starting migration test...
1️⃣ Initializing data source...
✅ Data source initialized

2️⃣ Dropping all tables for clean test...
✅ All tables dropped

3️⃣ Running migrations...
✅ Migrations completed

4️⃣ Verifying tables...
Tables created:
  - check_results
  - endpoints
  - incidents
  - migrations
  - notification_channels

✅ All expected tables exist
🎉 Migration test completed successfully!
```

**검증 항목:**
- ✅ 4개 테이블 + migrations 테이블 생성
- ✅ 모든 인덱스 생성
- ✅ 외래 키 제약 설정
- ✅ Enum 타입 생성

---

### 5. 마이그레이션 롤백 테스트 ✅

**실행 명령:**
```bash
npm run migration:revert
```

**롤백 과정:**
1. ✅ 외래 키 제약 삭제
   - FK_incidents_endpoint
   - FK_check_results_endpoint

2. ✅ 테이블 삭제 (역순)
   - incidents
   - check_results
   - endpoints
   - notification_channels

3. ✅ Enum 타입 삭제
   - check_results_status_enum
   - endpoints_currentstatus_enum
   - endpoints_method_enum
   - notification_channels_type_enum

4. ✅ 마이그레이션 기록 삭제

**검증:**
- ✅ 모든 테이블 완전 삭제
- ✅ 에러 없이 정상 롤백
- ✅ 재실행 가능 (멱등성)

---

### 6. 시드 데이터 실행 및 검증 ✅

**실행 명령:**
```bash
npm run migration:run  # 테이블 재생성
npm run seed:run       # 시드 데이터 삽입
```

**실행 결과:**
```bash
🌱 Starting database seeding...
✅ Data source initialized
✅ Seeded 5 endpoints
✅ Seeded 3 notification channels
🎉 Database seeding completed successfully!
```

**데이터 검증:**

**Endpoints (5개):**
```sql
SELECT name, url, method, "checkInterval" FROM endpoints;
```
| name | url | method | checkInterval |
|------|-----|--------|---------------|
| Google Homepage | https://www.google.com | GET | 60 |
| JSONPlaceholder API | https://jsonplaceholder.typicode.com/posts/1 | GET | 120 |
| HTTPBin GET Test | https://httpbin.org/get | GET | 180 |
| HTTPBin POST Test | https://httpbin.org/post | POST | 300 |
| GitHub API Status | https://api.github.com/status | GET | 300 |

**Notification Channels (3개):**
```sql
SELECT name, type, "isActive" FROM notification_channels;
```
| name | type | isActive |
|------|------|----------|
| Default Email Channel | email | true |
| Slack Alerts | slack | false |
| Critical Alerts Email | email | true |

**검증 항목:**
- ✅ 모든 레코드 정상 삽입
- ✅ JSON 데이터 (headers, body, config) 정상 저장
- ✅ Enum 값 정상 설정
- ✅ 기본값 (isActive, currentStatus) 정상 적용
- ✅ UUID 자동 생성
- ✅ Timestamp 자동 생성

---

## 📝 생성된 파일 목록

### 마이그레이션 관련
1. [backend/src/data-source.ts](../../backend/src/data-source.ts) - TypeORM DataSource 설정
2. [backend/src/database/migrations/1733328000000-InitialSchema.ts](../../backend/src/database/migrations/1733328000000-InitialSchema.ts) - 초기 스키마 마이그레이션
3. [backend/src/database/test-migration.ts](../../backend/src/database/test-migration.ts) - 마이그레이션 테스트 스크립트

### 시드 데이터 관련
4. [backend/src/database/seeds/endpoint.seed.ts](../../backend/src/database/seeds/endpoint.seed.ts) - 엔드포인트 시드
5. [backend/src/database/seeds/notification-channel.seed.ts](../../backend/src/database/seeds/notification-channel.seed.ts) - 알림 채널 시드
6. [backend/src/database/seeds/run-seeds.ts](../../backend/src/database/seeds/run-seeds.ts) - 시드 실행 스크립트

---

## 🚀 사용 방법

### 프로덕션 배포 시

```bash
# 1. 마이그레이션 실행
npm run migration:run

# 2. (선택) 시드 데이터 삽입
npm run seed:run

# 3. 애플리케이션 시작
npm run start:prod
```

### 개발 환경

```bash
# 마이그레이션 상태 확인
npm run migration:show

# 새 마이그레이션 생성 (스키마 변경 후)
npm run migration:generate -- src/database/migrations/YourMigrationName

# 마이그레이션 테스트
npm run migration:test

# 롤백
npm run migration:revert
```

---

## ⚠️ 주의사항

1. **프로덕션 환경**
   - `database.config.ts`에서 `synchronize: false` 설정 필수
   - 마이그레이션으로만 스키마 관리
   - 백업 후 마이그레이션 실행

2. **롤백 주의**
   - 데이터 손실 가능
   - 프로덕션에서는 신중히 사용
   - 롤백 전 데이터 백업 필수

3. **시드 데이터**
   - 중복 실행 방지 로직 포함
   - 기존 데이터가 있으면 건너뜀
   - 테스트 환경에서만 사용 권장

4. **환경 변수**
   - `.env` 파일에 데이터베이스 설정 필수
   - `SLACK_WEBHOOK_URL` 설정 권장

---

## ✅ 검증 완료

- ✅ 마이그레이션 설정 완료
- ✅ 초기 스키마 마이그레이션 생성
- ✅ 시드 데이터 파일 작성
- ✅ 마이그레이션 실행 및 검증
- ✅ 롤백 테스트 성공
- ✅ 시드 데이터 실행 및 검증
- ✅ 모든 테이블 및 데이터 정상

---

## 📈 다음 단계

**Phase 8: Docker 이미지 빌드 및 배포**
- Docker 이미지 빌드
- Docker Compose 전체 스택 테스트
- 환경 변수 설정
- 헬스 체크 엔드포인트 확인

---

**Phase 7 완료**: 2025-12-04
**담당**: Claude
**상태**: ✅ 성공
