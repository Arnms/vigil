# Step 8 상세 설계 문서: 테스트 & 배포

**작성일**: 2025-11-17
**상태**: 설계 중
**기간**: Day 13-14

---

## 📋 목차

1. [개요](#개요)
2. [전체 아키텍처](#전체-아키텍처)
3. [Phase 1: 백엔드 유닛 테스트](#phase-1-백엔드-유닛-테스트)
4. [Phase 2: 프론트엔드 컴포넌트 테스트](#phase-2-프론트엔드-컴포넌트-테스트)
5. [Phase 3: API 통합 테스트](#phase-3-api-통합-테스트)
6. [Phase 4: 프론트엔드 E2E 테스트](#phase-4-프론트엔드-e2e-테스트)
7. [Phase 5: 성능 테스트](#phase-5-성능-테스트)
8. [Phase 6: 버그 수정 및 에러 처리](#phase-6-버그-수정-및-에러-처리)
9. [Phase 7: 데이터베이스 마이그레이션 및 시딩](#phase-7-데이터베이스-마이그레이션-및-시딩)
10. [Phase 8: Docker 이미지 빌드 및 배포](#phase-8-docker-이미지-빌드-및-배포)
11. [Phase 9: 문서화 및 배포 매뉴얼](#phase-9-문서화-및-배포-매뉴얼)
12. [Phase 10: 최적화 및 정리](#phase-10-최적화-및-정리)
13. [구현 체크리스트](#구현-체크리스트)

---

## 개요

### 목표
- ✅ 전체 백엔드 서비스 유닛 테스트 (최소 80% 커버리지)
- ✅ 프론트엔드 핵심 컴포넌트 테스트 (90% 커버리지)
- ✅ API 통합 테스트 (모든 엔드포인트)
- ✅ 프론트엔드 E2E 테스트 (주요 사용자 시나리오)
- ✅ 성능 테스트 (API <200ms, 대시보드 <2s)
- ✅ 버그 수정 및 보안 검증
- ✅ 프로덕션 배포 준비
- ✅ 운영 및 개발 문서 작성

### 기대 효과
- 코드 품질 보증 (테스트 커버리지)
- 회귀 버그 방지
- 성능 최적화 검증
- 프로덕션 배포 준비 완료
- 운영 및 유지보수 가능성 향상

---

## 전체 아키텍처

### 테스트 계층

```
┌────────────────────────────────────────────────────┐
│              프론트엔드 E2E 테스트                  │
│   (Playwright: 사용자 시나리오 전체 검증)          │
└────────────────────────────────────────────────────┘
                        ↓
┌────────────────────────────────────────────────────┐
│         프론트엔드 컴포넌트 테스트                   │
│  (Vitest/Jest: 개별 컴포넌트 기능)                 │
└────────────────────────────────────────────────────┘
                        ↓
┌────────────────────────────────────────────────────┐
│            API 통합 테스트 (E2E)                   │
│    (Supertest: 전체 API 엔드포인트)                │
└────────────────────────────────────────────────────┘
                        ↓
┌────────────────────────────────────────────────────┐
│           백엔드 유닛 테스트 (Jest)                │
│   (Service/Controller 단위 테스트)                 │
└────────────────────────────────────────────────────┘
```

### 배포 파이프라인

```
┌─────────────────────────────────────────────────────────┐
│  1. 로컬 테스트 완료                                     │
│     - 모든 테스트 통과 (유닛/통합/E2E)                  │
│     - 성능 목표 달성                                    │
│     - 보안 검증 완료                                    │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│  2. Docker 이미지 빌드                                  │
│     - 백엔드 이미지 빌드                                │
│     - 프론트엔드 이미지 빌드                            │
│     - Docker Compose 테스트                            │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│  3. 문서화                                              │
│     - README.md (설치 및 실행 방법)                    │
│     - API 문서 (Swagger)                               │
│     - 운영 가이드 (모니터링, 문제 해결)                |
│     - 개발자 가이드 (구조, 스타일 가이드)              │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│  4. 배포 준비                                           │
│     - 환경 변수 설정                                    │
│     - 데이터베이스 마이그레이션                        │
│     - 스모크 테스트                                    │
└─────────────────────────────────────────────────────────┘
```

---

## Phase 1: 백엔드 유닛 테스트

### 목표
Jest를 이용하여 각 서비스와 컨트롤러의 단위 테스트 작성 (최소 80% 커버리지)

### 구현 범위

#### 1.1 Endpoint Service 테스트
**파일**: `backend/src/modules/endpoint/endpoint.service.spec.ts`

```typescript
describe('EndpointService', () => {
  describe('create', () => {
    it('should create a new endpoint with valid input')
    it('should throw error if URL is invalid')
    it('should schedule health check job')
  })

  describe('getAll', () => {
    it('should return all endpoints with pagination')
    it('should filter by status if provided')
    it('should sort by specified field')
  })

  describe('getById', () => {
    it('should return endpoint by id')
    it('should throw 404 if endpoint not found')
  })

  describe('update', () => {
    it('should update endpoint with valid input')
    it('should reschedule health check if interval changed')
    it('should trigger WebSocket update event')
  })

  describe('delete', () => {
    it('should soft delete endpoint')
    it('should unschedule health check job')
    it('should trigger WebSocket delete event')
  })

  describe('updateStatus', () => {
    it('should update endpoint status correctly')
    it('should emit status change event')
  })
})
```

#### 1.2 Health Check Service 테스트
**파일**: `backend/src/modules/health-check/health-check.service.spec.ts`

```typescript
describe('HealthCheckService', () => {
  describe('performHealthCheck', () => {
    it('should return UP for successful request')
    it('should return DOWN for failed request')
    it('should return DEGRADED for slow response')
    it('should measure response time correctly')
    it('should handle network errors')
    it('should handle timeout')
  })

  describe('determineStatus', () => {
    it('should return UP if status code is 2xx')
    it('should return DOWN if status code is not 2xx')
    it('should return DEGRADED if response time > threshold')
  })
})
```

#### 1.3 Notification Service 테스트
**파일**: `backend/src/modules/notification/notification.service.spec.ts`

```typescript
describe('NotificationService', () => {
  describe('sendIncidentNotification', () => {
    it('should send email notification')
    it('should send Slack notification')
    it('should prevent duplicate notifications within 5 minutes')
    it('should handle notification failures gracefully')
  })

  describe('EmailNotificationStrategy', () => {
    it('should send email with correct format')
    it('should handle SMTP errors')
  })

  describe('SlackNotificationStrategy', () => {
    it('should send Slack message with Block Kit')
    it('should handle webhook errors')
  })
})
```

#### 1.4 Statistics Service 테스트
**파일**: `backend/src/modules/statistics/statistics.service.spec.ts`

```typescript
describe('StatisticsService', () => {
  describe('getUptimeStats', () => {
    it('should calculate uptime percentage correctly')
    it('should handle edge cases (0 checks)')
    it('should work with date ranges')
  })

  describe('getResponseTimeStats', () => {
    it('should calculate average response time')
    it('should calculate percentiles (p50, p95, p99)')
    it('should handle no data gracefully')
  })

  describe('getIncidentStats', () => {
    it('should count total incidents')
    it('should calculate average incident duration')
    it('should return incident timeline')
  })
})
```

#### 1.5 Incident Service 테스트
**파일**: `backend/src/modules/incident/incident.service.spec.ts`

```typescript
describe('IncidentService', () => {
  describe('createIncident', () => {
    it('should create incident when endpoint goes down')
    it('should prevent duplicate incidents')
  })

  describe('resolveIncident', () => {
    it('should mark incident as resolved')
    it('should calculate incident duration')
    it('should trigger WebSocket event')
  })

  describe('getActiveIncidents', () => {
    it('should return only unresolved incidents')
  })
})
```

### 테스트 실행

```bash
# 모든 유닛 테스트 실행
npm run test

# 테스트 감시 모드 (개발 중)
npm run test:watch

# 커버리지 리포트 생성
npm run test:cov

# 특정 파일만 테스트
npm run test -- endpoint.service.spec.ts
```

### 커버리지 목표
- **전체**: 80% 이상
- **주요 비즈니스 로직**: 90% 이상
- **Critical Path**: 100%

---

## Phase 2: 프론트엔드 컴포넌트 테스트

### 목표
Vitest + React Testing Library를 이용하여 프론트엔드 컴포넌트 테스트 (90% 커버리지)

### 설정

```bash
# 패키지 설치
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

### 구현 범위

#### 2.1 EndpointList 컴포넌트 테스트
**파일**: `frontend/src/pages/Endpoints/EndpointList.test.tsx`

```typescript
describe('EndpointList Component', () => {
  it('should render endpoint list')
  it('should display correct number of endpoints')
  it('should filter endpoints by status')
  it('should sort endpoints by column')
  it('should paginate correctly')
  it('should handle empty state')
  it('should call subscribeAll on mount')
  it('should call unsubscribeAll on unmount')
})
```

#### 2.2 EndpointDetail 컴포넌트 테스트
**파일**: `frontend/src/pages/Endpoints/EndpointDetail.test.tsx`

```typescript
describe('EndpointDetail Component', () => {
  it('should fetch and display endpoint details')
  it('should subscribe to specific endpoint')
  it('should display check results')
  it('should handle update action')
  it('should handle delete action')
  it('should show loading state while fetching')
  it('should show error state on failure')
})
```

#### 2.3 Dashboard 컴포넌트 테스트
**파일**: `frontend/src/pages/Dashboard/Dashboard.test.tsx`

```typescript
describe('Dashboard Component', () => {
  it('should render status cards')
  it('should display charts')
  it('should show incident timeline')
  it('should update in real-time when data changes')
  it('should handle date range filter')
})
```

#### 2.4 Common 컴포넌트 테스트
**파일**: `frontend/src/components/Common/`

```typescript
describe('ToastContainer', () => {
  it('should render all active toasts')
  it('should remove toast on dismiss')
  it('should auto-dismiss after duration')
})

describe('ConnectionStatus', () => {
  it('should show connected status')
  it('should show connecting status')
  it('should show disconnected status')
})
```

### 테스트 실행

```bash
# 프론트엔드 테스트 실행
npm run test

# 감시 모드
npm run test:watch

# 커버리지 리포트
npm run test:coverage
```

### 커버리지 목표
- **주요 컴포넌트**: 90% 이상
- **공통 컴포넌트**: 90% 이상
- **Utility 함수**: 85% 이상

---

## Phase 3: API 통합 테스트

### 목표
Supertest를 이용하여 모든 API 엔드포인트 통합 테스트

### 설정

```bash
# Supertest 설치
npm install --save-dev supertest @types/supertest
```

### 구현 범위

#### 3.1 Endpoint API 테스트
**파일**: `backend/test/endpoints.e2e-spec.ts`

```typescript
describe('Endpoint API (e2e)', () => {
  describe('POST /api/endpoints', () => {
    it('should create endpoint with valid data')
    it('should return 400 with invalid URL')
    it('should return 400 with missing required fields')
    it('should trigger WebSocket event on creation')
  })

  describe('GET /api/endpoints', () => {
    it('should return paginated list')
    it('should filter by status')
    it('should sort by field')
  })

  describe('GET /api/endpoints/:id', () => {
    it('should return endpoint details')
    it('should return 404 if not found')
  })

  describe('PATCH /api/endpoints/:id', () => {
    it('should update endpoint')
    it('should trigger WebSocket event')
  })

  describe('DELETE /api/endpoints/:id', () => {
    it('should delete endpoint')
    it('should return 404 on second delete')
  })
})
```

#### 3.2 Health Check API 테스트
**파일**: `backend/test/health-check.e2e-spec.ts`

```typescript
describe('Health Check API (e2e)', () => {
  describe('POST /api/endpoints/:id/check', () => {
    it('should perform manual health check')
    it('should return check result')
    it('should save result to database')
  })

  describe('GET /api/endpoints/:id/check-results', () => {
    it('should return check results')
    it('should paginate results')
  })
})
```

#### 3.3 Statistics API 테스트
**파일**: `backend/test/statistics.e2e-spec.ts`

```typescript
describe('Statistics API (e2e)', () => {
  describe('GET /api/statistics/uptime/:endpointId', () => {
    it('should return uptime stats')
    it('should accept date range parameters')
  })

  describe('GET /api/statistics/response-time/:endpointId', () => {
    it('should return response time stats')
  })

  describe('GET /api/statistics/overview', () => {
    it('should return overall statistics')
  })
})
```

### 테스트 실행

```bash
# E2E 테스트 실행
npm run test:e2e

# 특정 E2E 테스트만
npm run test:e2e -- endpoints.e2e-spec.ts
```

---

## Phase 4: 프론트엔드 E2E 테스트

### 목표
Playwright를 이용하여 사용자 시나리오 기반 E2E 테스트

### 설정

```bash
# Playwright 설치
npm install --save-dev @playwright/test
npx playwright install
```

### 구현 범위

#### 4.1 엔드포인트 관리 E2E 테스트
**파일**: `frontend/e2e/endpoints.spec.ts`

```typescript
test.describe('Endpoint Management', () => {
  test('should create new endpoint', async ({ page }) => {
    // 1. Navigate to endpoints page
    // 2. Click "Add Endpoint" button
    // 3. Fill form with valid data
    // 4. Submit form
    // 5. Verify endpoint appears in list
  })

  test('should update endpoint', async ({ page }) => {
    // 1. Navigate to endpoint detail
    // 2. Click edit button
    // 3. Change endpoint properties
    // 4. Save changes
    // 5. Verify changes are reflected
  })

  test('should delete endpoint', async ({ page }) => {
    // 1. Navigate to endpoint list
    // 2. Click delete button
    // 3. Confirm deletion
    // 4. Verify endpoint is removed
  })
})
```

#### 4.2 대시보드 E2E 테스트
**파일**: `frontend/e2e/dashboard.spec.ts`

```typescript
test.describe('Dashboard', () => {
  test('should display dashboard with data', async ({ page }) => {
    // 1. Navigate to dashboard
    // 2. Verify status cards are rendered
    // 3. Verify charts are displayed
    // 4. Verify data is loaded correctly
  })

  test('should update data in real-time', async ({ page }) => {
    // 1. Open dashboard
    // 2. Simulate endpoint status change
    // 3. Verify real-time update
  })
})
```

#### 4.3 실시간 기능 E2E 테스트
**파일**: `frontend/e2e/realtime.spec.ts`

```typescript
test.describe('Real-time Features', () => {
  test('should establish WebSocket connection', async ({ page }) => {
    // 1. Navigate to page
    // 2. Verify connection status shows "Connected"
  })

  test('should receive real-time updates', async ({ page, context }) => {
    // 1. Open two browser contexts
    // 2. Change endpoint status in one context
    // 3. Verify change appears immediately in other context
  })

  test('should show toast notifications', async ({ page }) => {
    // 1. Trigger status change
    // 2. Verify toast appears
    // 3. Verify toast auto-dismisses
  })

  test('should handle disconnection', async ({ page }) => {
    // 1. Simulate network disconnection
    // 2. Verify status shows "Disconnected"
    // 3. Simulate network reconnection
    // 4. Verify connection is restored
  })
})
```

### 테스트 실행

```bash
# E2E 테스트 실행
npm run test:e2e

# 특정 E2E 테스트
npm run test:e2e -- endpoints

# 헤드리스 모드
npx playwright test

# UI 모드로 실행 (디버깅)
npx playwright test --ui
```

---

## Phase 5: 성능 테스트

### 목표
성능 목표 달성 여부 확인 및 최적화

### 구현 범위

#### 5.1 API 응답 시간 테스트
**목표**: 평균 200ms 이하

```bash
# Apache Bench 설치 (macOS)
brew install httpd

# GET /api/endpoints 성능 테스트
ab -n 1000 -c 10 http://localhost:3000/api/endpoints

# POST /api/endpoints 성능 테스트
ab -n 100 -c 5 -p data.json -T application/json http://localhost:3000/api/endpoints
```

#### 5.2 프론트엔드 성능 테스트
**목표**: Lighthouse 성능 90 이상

```bash
# Lighthouse CI 설치
npm install -g @lhci/cli@latest

# 성능 테스트
lhci autorun
```

#### 5.3 데이터베이스 쿼리 성능
**목표**: 복잡한 쿼리도 100ms 이하

```sql
-- EXPLAIN ANALYZE로 쿼리 성능 확인
EXPLAIN ANALYZE SELECT * FROM endpoints WHERE current_status = 'DOWN';

-- 인덱스 확인
EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM check_results WHERE endpoint_id = $1 ORDER BY checked_at DESC LIMIT 10;
```

#### 5.4 메모리 누수 테스트
**목표**: 메모리 누수 없음

- Chrome DevTools로 메모리 프로파일링
- 페이지 이동 후 메모리 증가 확인
- WebSocket 연결/해제 시 메모리 정리 확인

---

## Phase 6: 버그 수정 및 에러 처리

### 목표
테스트에서 발견된 모든 버그를 해결하고 에러 처리를 검증

### 구현 범위

#### 6.1 버그 분류 및 우선순위
- **Critical**: 데이터 손상, 보안 취약점 → 즉시 수정
- **High**: 주요 기능 불능 → 당일 수정
- **Medium**: 부분적 기능 이상 → 여유 있을 때 수정
- **Low**: 사용자 경험 개선 → 선택사항

#### 6.2 에러 핸들링 검증

**백엔드**
- ✅ 잘못된 입력에 대한 400 에러
- ✅ 리소스 없음에 대한 404 에러
- ✅ 서버 에러에 대한 500 에러
- ✅ 에러 메시지 명확성
- ✅ 에러 로깅

**프론트엔드**
- ✅ API 에러 표시
- ✅ 네트워크 에러 처리
- ✅ WebSocket 연결 에러 처리
- ✅ 사용자 친화적 에러 메시지

#### 6.3 보안 검증
- ✅ SQL Injection 방지 (TypeORM 사용)
- ✅ XSS 방지 (React 자동 escape)
- ✅ CSRF 방지 (필요시 토큰 추가)
- ✅ 인증/인가 검증 (필요시)

---

## Phase 7: 데이터베이스 마이그레이션 및 시딩

### 목표
프로덕션 데이터베이스 준비

### 구현 범위

#### 7.1 TypeORM 마이그레이션

```bash
# 마이그레이션 자동 생성
npm run typeorm migration:generate -- -n InitialSchema

# 마이그레이션 실행
npm run typeorm migration:run

# 마이그레이션 되돌리기
npm run typeorm migration:revert
```

#### 7.2 데이터베이스 시딩

**파일**: `backend/src/database/seeds/endpoint.seed.ts`

```typescript
export class EndpointSeed implements Seeder {
  async run(dataSource: DataSource): Promise<void> {
    const endpoints = [
      { name: 'Google API', url: 'https://www.google.com', method: 'GET', checkInterval: 60 },
      { name: 'GitHub API', url: 'https://api.github.com', method: 'GET', checkInterval: 120 },
      // ...
    ]
    await dataSource.getRepository(Endpoint).save(endpoints)
  }
}
```

#### 7.3 마이그레이션 검증
- ✅ 마이그레이션 롤백 테스트
- ✅ 데이터 무결성 확인
- ✅ 인덱스 생성 확인

---

## Phase 8: Docker 이미지 빌드 및 배포

### 목표
프로덕션 배포 준비 완료

### 구현 범위

#### 8.1 백엔드 Docker 이미지 빌드

```bash
# 이미지 빌드
docker build -t vigil-backend:latest ./backend

# 이미지 실행
docker run -p 3000:3000 vigil-backend:latest

# 이미지 태그
docker tag vigil-backend:latest vigil-backend:1.0.0
```

#### 8.2 프론트엔드 Docker 이미지 빌드

```bash
# 이미지 빌드
docker build -t vigil-frontend:latest ./frontend

# 이미지 실행
docker run -p 3001:3001 vigil-frontend:latest
```

#### 8.3 Docker Compose 전체 스택 테스트

```bash
# 전체 스택 시작
docker-compose up -d

# 로그 확인
docker-compose logs -f

# 서비스 상태 확인
docker-compose ps

# 전체 스택 종료
docker-compose down
```

#### 8.4 환경 변수 설정
- ✅ 프로덕션 `.env` 파일 생성
- ✅ 민감한 정보 암호화 (선택사항)
- ✅ 데이터베이스 연결 문자열 확인

---

## Phase 9: 문서화 및 배포 매뉴얼

### 목표
운영 및 유지보수를 위한 완전한 문서 작성

### 구현 범위

#### 9.1 README.md 작성

```markdown
# Vigil - API Monitoring Dashboard

## 개요
...

## 설치 방법
...

## 실행 방법
...

## 환경 변수
...

## API 문서
...

## 기본 사용법
...
```

#### 9.2 API 문서 (Swagger)

```bash
# Swagger 패키지 설치
npm install @nestjs/swagger swagger-ui-express

# 브라우저에서 확인
http://localhost:3000/api/docs
```

#### 9.3 운영 가이드
**파일**: `docs/OPERATION_GUIDE.md`

- 모니터링 방법
- 문제 해결 (Troubleshooting)
- 백업 및 복구
- 성능 튜닝

#### 9.4 개발자 가이드
**파일**: `docs/DEVELOPER_GUIDE.md`

- 프로젝트 구조
- 개발 환경 설정
- 코드 스타일 가이드
- 커밋 규칙

---

## Phase 10: 최적화 및 정리

### 목표
코드 품질 및 성능 최종 최적화

### 구현 범위

#### 10.1 코드 스타일 검증

```bash
# ESLint 실행
npm run lint

# Prettier 포맷팅
npm run format

# 타입스크립트 검증
npm run type-check
```

#### 10.2 불필요한 의존성 제거

```bash
# 사용하지 않는 의존성 제거
npm prune

# 의존성 업데이트 확인
npm outdated
```

#### 10.3 번들 크기 최적화

- 프론트엔드 번들 분석
- 동적 임포트 적용
- Lazy loading 설정

#### 10.4 환경 변수 보안

```bash
# .env.example 작성 (민감한 값 제거)
DATABASE_HOST=localhost
DATABASE_PORT=5432
# PASSWORD는 .env에만 포함
```

#### 10.5 로그 레벨 설정

- **프로덕션**: info 이상만
- **개발**: debug 모두

---

## 구현 체크리스트

### Phase 1: 백엔드 유닛 테스트
- [ ] Endpoint Service 테스트 (90% 커버리지)
- [ ] Health Check Service 테스트 (85% 커버리지)
- [ ] Notification Service 테스트 (80% 커버리지)
- [ ] Statistics Service 테스트 (85% 커버리지)
- [ ] Incident Service 테스트 (80% 커버리지)
- [ ] 전체 커버리지 80% 이상 달성
- [ ] Git 커밋: "Phase 1: 백엔드 유닛 테스트 완료"

### Phase 2: 프론트엔드 컴포넌트 테스트
- [ ] Vitest/Jest 설정
- [ ] EndpointList 컴포넌트 테스트
- [ ] EndpointDetail 컴포넌트 테스트
- [ ] Dashboard 컴포넌트 테스트
- [ ] Common 컴포넌트 테스트
- [ ] 전체 커버리지 90% 달성
- [ ] Git 커밋: "Phase 2: 프론트엔드 컴포넌트 테스트 완료"

### Phase 3: API 통합 테스트
- [ ] Supertest 설정
- [ ] Endpoint API E2E 테스트
- [ ] Health Check API E2E 테스트
- [ ] Statistics API E2E 테스트
- [ ] 모든 E2E 테스트 통과
- [ ] Git 커밋: "Phase 3: API 통합 테스트 완료"

### Phase 4: 프론트엔드 E2E 테스트
- [ ] Playwright 설정
- [ ] 엔드포인트 관리 E2E 테스트
- [ ] 대시보드 E2E 테스트
- [ ] 실시간 기능 E2E 테스트
- [ ] 모든 E2E 테스트 통과
- [ ] Git 커밋: "Phase 4: 프론트엔드 E2E 테스트 완료"

### Phase 5: 성능 테스트
- [ ] API 응답 시간 측정 (<200ms)
- [ ] 프론트엔드 Lighthouse 테스트 (90 이상)
- [ ] 데이터베이스 쿼리 성능 검증
- [ ] 메모리 누수 테스트
- [ ] 성능 목표 달성 확인
- [ ] Git 커밋: "Phase 5: 성능 테스트 및 최적화 완료"

### Phase 6: 버그 수정 및 에러 처리
- [ ] 테스트에서 발견된 버그 수정 (우선순위순)
- [ ] 에러 핸들링 검증 (400/404/500)
- [ ] 보안 검증 (SQL Injection, XSS, CSRF)
- [ ] 회귀 테스트 완료
- [ ] Git 커밋: "Phase 6: 버그 수정 및 에러 처리 완료"

### Phase 7: 데이터베이스 마이그레이션 및 시딩
- [ ] TypeORM 마이그레이션 생성
- [ ] 마이그레이션 실행 및 검증
- [ ] 데이터베이스 시드 데이터 작성
- [ ] 마이그레이션 롤백 테스트
- [ ] Git 커밋: "Phase 7: 데이터베이스 마이그레이션 및 시딩 완료"

### Phase 8: Docker 이미지 빌드 및 배포
- [ ] 백엔드 Docker 이미지 빌드 및 테스트
- [ ] 프론트엔드 Docker 이미지 빌드 및 테스트
- [ ] Docker Compose 전체 스택 테스트
- [ ] 프로덕션 환경 변수 설정
- [ ] 헬스 체크 엔드포인트 확인
- [ ] Git 커밋: "Phase 8: Docker 이미지 빌드 및 배포 준비 완료"

### Phase 9: 문서화 및 배포 매뉴얼
- [ ] README.md 작성 (설치, 실행, 환경변수)
- [ ] Swagger API 문서 설정
- [ ] 운영 가이드 작성
- [ ] 개발자 가이드 작성
- [ ] 문서 링크 확인
- [ ] Git 커밋: "Phase 9: 문서화 및 배포 매뉴얼 완료"

### Phase 10: 최적화 및 정리
- [ ] ESLint 및 Prettier 실행
- [ ] 불필요한 의존성 제거
- [ ] 프론트엔드 번들 크기 최적화
- [ ] 환경 변수 보안 검증 (.env.example)
- [ ] 로그 레벨 설정
- [ ] 최종 빌드 및 테스트
- [ ] Git 커밋: "Phase 10: 최적화 및 정리 완료"

### 최종 확인
- [ ] 모든 유닛 테스트 통과 (90%+ 커버리지)
- [ ] 모든 E2E 테스트 통과 (API + Frontend)
- [ ] 성능 목표 달성 (API <200ms, Frontend <2s)
- [ ] 버그 0개 (또는 Low priority만)
- [ ] Docker Compose 정상 작동
- [ ] 문서 완결성 확인
- [ ] 코드 품질 검증 (린트, 타입스크립트, 보안)
- [ ] 배포 준비 완료

---

## 예상 일정

| Phase | 작업 | 예상 소요 | 완료일 |
|-------|------|---------|--------|
| Phase 1 | 백엔드 유닛 테스트 | 3-4시간 | - |
| Phase 2 | 프론트엔드 컴포넌트 테스트 | 3-4시간 | - |
| Phase 3 | API 통합 테스트 | 2-3시간 | - |
| Phase 4 | 프론트엔드 E2E 테스트 | 2-3시간 | - |
| Phase 5 | 성능 테스트 | 1-2시간 | - |
| Phase 6 | 버그 수정 및 에러 처리 | 2-3시간 | - |
| Phase 7 | DB 마이그레이션 및 시딩 | 1-2시간 | - |
| Phase 8 | Docker 이미지 빌드 및 배포 | 1-2시간 | - |
| Phase 9 | 문서화 및 배포 매뉴얼 | 2-3시간 | - |
| Phase 10 | 최적화 및 정리 | 1-2시간 | - |

**총 예상**: 18-24시간 (2일)

---

## 참고 자료

- [Jest 공식 문서](https://jestjs.io/)
- [React Testing Library](https://testing-library.com/react)
- [Vitest](https://vitest.dev/)
- [Playwright 공식 문서](https://playwright.dev/)
- [NestJS Testing](https://docs.nestjs.com/fundamentals/testing)
- [TypeORM Migrations](https://typeorm.io/migrations)
- [Docker Documentation](https://docs.docker.com/)

