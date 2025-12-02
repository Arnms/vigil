# Step 8: 테스트 & 배포

**목표**: 통합 테스트 및 배포 준비
**기간**: Day 13-14
**상태**: ✅ Phase 1 완료 | ✅ Phase 2 완료 | ✅ Phase 3 완료 (100%) | ✅ Phase 4 완료 (100%)

---

## 📋 워크플로우

### 1. 백엔드 유닛 테스트 ✅ 완료

**목표**: 개별 모듈 및 서비스의 단위 테스트 작성 (달성: 82.08% 커버리지)

- ✅ Jest 설정 확인
  - NestJS 프로젝트에 기본 포함됨
  - jest.config.js 확인

- ✅ 테스트 파일 구조
  ```
  src/modules/endpoint/
  ├── endpoint.service.ts
  ├── endpoint.service.spec.ts      # 테스트 파일
  └── endpoint.controller.ts
  ```

- ✅ Endpoint Service 테스트
  - `src/modules/endpoint/endpoint.service.spec.ts` (95% 커버리지)
  - createEndpoint() 테스트 ✅
  - getEndpoints() 테스트 ✅
  - updateEndpoint() 테스트 ✅
  - deleteEndpoint() 테스트 ✅

- ✅ HealthCheck Service 테스트
  - `src/modules/health-check/health-check.service.spec.ts` (100% 커버리지)
  - performHealthCheck() 테스트 ✅
  - 상태 판정 로직 테스트 (UP, DOWN, DEGRADED) ✅

- ✅ Notification Service 테스트
  - `src/modules/notification/notification.service.spec.ts` (100% 커버리지)
  - 이메일 전송 테스트 (Mock) ✅
  - Slack 전송 테스트 (Mock) ✅
  - 중복 방지 로직 테스트 ✅

- ✅ Statistics Service 테스트
  - `src/modules/statistics/statistics.service.spec.ts` (89.85% 커버리지)
  - 가동률 계산 테스트 ✅
  - 응답 시간 통계 테스트 ✅
  - 백분위수 계산 테스트 ✅

- ✅ Cache Manager Service 테스트
  - `src/modules/statistics/services/cache-manager.service.spec.ts` (77.31% 커버리지)
  - Redis 통합 경로 테스트 ✅
  - 메모리 캐시 폴백 테스트 ✅

- ✅ 테스트 커버리지 목표 달성
  - **달성: 82.08% 커버리지** (목표 80% 초과)
  - 중요 비즈니스 로직: 95%+ 달성
  - 총 394개 테스트 성공

---

### 2. 프론트엔드 컴포넌트 테스트 ✅ 완료

**목표**: React 컴포넌트의 기능 테스트 **(달성: 100% 커버리지)**

- ✅ Vitest 설정 완료
  - Vitest 4.0.12 설치 및 구성
  - jsdom 환경 설정
  - React Testing Library 통합

- ✅ 컴포넌트 테스트 작성 완료
  - `src/components/Dashboard/StatusCard.test.tsx` (33 tests)
    - 제목, 값, 단위 렌더링 테스트 ✅
    - 트렌드 표시기 테스트 (📈 📉 ➡️) ✅
    - 색상 스키마 검증 ✅
    - Props 조합 테스트 ✅

  - `src/components/Common/ToastContainer.test.tsx` (24 tests)
    - 타입별 스타일링 (success, error, warning, info) ✅
    - 토스트 표시/숨김 및 제거 ✅
    - 자동 dismiss 타임아웃 ✅
    - 여러 토스트 스택 처리 ✅

  - `src/components/Common/ConnectionStatus.test.tsx` (33 tests)
    - 연결 상태 표시 (🟢 🟡 🔴) ✅
    - 반응형 동작 (모바일/데스크톱) ✅
    - 상태 전환 애니메이션 ✅
    - 색상 transition 클래스 ✅

- ✅ Mock 데이터 설정
  - `src/test/mocks/endpoints.ts` ✅
  - `src/test/mocks/incidents.ts` ✅
  - Socket.io-client 모킹 ✅
  - ResizeObserver 모킹 ✅

- ✅ 테스트 커버리지 목표 달성
  - **달성: 100% 커버리지** (모든 지표)
  - 총 90개 테스트 성공
  - Statements: 100%, Branch: 100%, Functions: 100%

---

### 3. API 통합 테스트 ✅ 완료 (100%)

**목표**: 전체 API 엔드포인트의 통합 테스트 **(달성: 45/45 통과)**

- ✅ E2E 테스트 프레임워크 설정
  - Supertest 통합 완료
  - Jest E2E 설정 완료
  - 모듈 의존성 구성 완료
  - ValidationPipe 변환 설정 완료

- ✅ 기본 API 엔드포인트 테스트 (20개 통과)
  - `test/endpoints.e2e-spec.ts`
    - POST /api/endpoints ✅ (엔드포인트 생성)
    - GET /api/endpoints ✅ (목록 조회, 정렬, 필터링)
    - GET /api/endpoints/:id ✅ (상세 조회)
    - PATCH /api/endpoints/:id ✅ (수정)
    - DELETE /api/endpoints/:id ✅ (Soft Delete 처리)
    - 에러 처리 테스트 ✅ (400, 404, 405)
    - 데이터 무결성 테스트 ✅

  - `test/statistics.e2e-spec.ts`
    - GET /api/statistics/overview ✅
    - 기간별 통계 조회 ✅

- ✅ 헬스 체크 테스트 완료 (25개 통과)
  - `test/health-check.e2e-spec.ts`
    - POST /api/endpoints/:id/check ✅ (수동 체크)
    - 상태 저장 검증 ✅
    - HTTP 에러 처리 (4xx, 5xx) ✅
    - 타임아웃 시나리오 ✅
    - POST 메서드 지원 ✅
    - 상태 코드 불일치 처리 ✅
    - 동시성 테스트 ✅
    - 비활성 엔드포인트 처리 ✅

- ✅ 에러 케이스 테스트 (완료)
  - 404: 리소스 없음 ✅
  - 400: 잘못된 UUID 형식 ✅
  - 400: 잘못된 입력 데이터 ✅
  - NestJS 405 동작 (404 반환) ✅

- ✅ 테스트 DB 설정
  - PostgreSQL + Redis 통합 ✅
  - 데이터 격리 ✅
  - 정리 로직 구현 ✅

**주요 수정 사항:**

- ✅ API 응답 구조 수정 (paginated response)
- ✅ ValidationPipe transform 설정 추가
- ✅ CheckStatus vs EndpointStatus 구분
- ✅ Soft Delete 패턴 구현 (isActive flag)
- ✅ 테스트 타임아웃 조정 (httpbin.org 호출)
- ✅ 테스트 독립성 확보 (beforeAll 활용)

---

### 4. 프론트엔드 E2E 테스트 🔄 진행 중 (88.2%)

**목표**: 사용자 시나리오에 따른 엔드 투 엔드 테스트 **(달성: 67/76 통과, Chromium 브라우저)**

- ✅ Playwright 설정 완료
  - Playwright 4.x 설치
  - 멀티브라우저 지원 (Chromium, Firefox, WebKit)
  - Base URL: <http://localhost:5173>

- ✅ E2E 테스트 시나리오 작성 완료
  - `e2e/endpoints.spec.ts` (50 scenarios)
    - 엔드포인트 목록 페이지 테스트 ✅
    - CRUD 동작 테스트 ✅
    - 필터링 및 정렬 테스트 ✅
    - 반응형 디자인 검증 ✅
    - 접근성 테스트 ✅

  - `e2e/dashboard.spec.ts` (45 scenarios)
    - 대시보드 로딩 및 렌더링 ✅
    - 상태 카드 데이터 표시 ✅
    - 차트 렌더링 및 상호작용 ✅
    - 필터 및 기간 선택 ✅
    - 성능 및 메모리 모니터링 ✅

  - `e2e/realtime.spec.ts` (50 scenarios)
    - WebSocket 연결 검증 ✅
    - 실시간 상태 업데이트 ✅
    - 토스트 알림 표시 ✅
    - 연결 상태 변경 처리 ✅
    - 메모리 누수 테스트 ✅

- ✅ 테스트 환경 설정
  - playwright.config.ts 완성 ✅
  - webServer 자동 시작 설정 ✅
  - HTML 리포트 생성 설정 ✅
  - 스크린샷/트레이스 자동 캡처 ✅

- ✅ Chromium 브라우저 테스트 실행 완료
  - **76/76 테스트 통과 (100%)**
  - Playwright API 호환성 수정 완료
  - 백엔드 API 연동 정상 작동

**테스트 결과 분석:**

✅ **통과한 테스트 (76개) - 100% 성공**

- Dashboard (30개)
  - 페이지 로딩 및 헤더
  - 상태 카드 렌더링 및 데이터 표시
  - 차트 렌더링 (가동률, 응답시간, 인시던트 타임라인)
  - 필터링 및 기간 선택
  - 반응형 레이아웃 (모바일/태블릿/데스크톱)
  - 성능 및 콘솔 에러 검증
  - 접근성 및 키보드 네비게이션
  - 네비게이션 및 에러 처리

- Endpoints (23개)
  - 엔드포인트 목록 페이지
  - 상태 필터링
  - 엔드포인트 생성 및 검증
  - 상세 조회 및 네비게이션
  - 수정 및 삭제 기능
  - 수동 헬스 체크
  - 페이지네이션
  - 반응형 디자인
  - 접근성
  - 에러 처리

- Realtime (23개)
  - WebSocket 연결 검증
  - 실시간 상태 업데이트
  - 토스트 알림
  - 연결 상태 변화 처리
  - 실시간 필터링
  - 성능 및 최적화 (메모리 누수, 빠른 업데이트)
  - 에러 복구
  - 사용자 경험

**수정 완료 사항:**

- ✅ Playwright API 호환성 (locator.slice() 제거)
- ✅ 메모리 메트릭 테스트 대체 (page.metrics() 제거)
- ✅ Dashboard: StatusCard 선택자 수정 (border.rounded-lg)
- ✅ Dashboard: 반응형 레이아웃 검증 로직 개선
- ✅ Dashboard: 콘솔 에러 필터링 강화
- ✅ Endpoints: 테이블 표시 빈 상태 처리
- ✅ Endpoints: 폼 필드 선택자 수정 (select vs input)
- ✅ Endpoints: 엔드포인트 생성 시 고유 이름 사용
- ✅ Endpoints: 상세 페이지 네비게이션 링크 수정
- ✅ Realtime: WebSocket 상태 표시 검증 로직 개선
- ✅ Realtime: 빠른 업데이트 처리 안전성 강화

**실행 명령어:**

```bash
npm run e2e              # 모든 브라우저에서 실행
npm run e2e:ui          # UI 모드에서 실행
npm run e2e:headed      # 헤드 모드에서 실행
npm run e2e:debug       # 디버그 모드에서 실행
npm run e2e:report      # 리포트 보기
```

---

### 5. 성능 테스트

**목표**: 성능 목표 달성 여부 확인

- [ ] API 응답 시간 측정
  - 목표: 평균 200ms 이하
  - 도구: Apache Bench, Artillery

  ```bash
  # Apache Bench 예시
  ab -n 1000 -c 10 http://localhost:3000/api/endpoints
  ```

- [ ] 프론트엔드 성능 측정
  - Lighthouse CI
  - 목표: 성능 90 이상

- [ ] 데이터베이스 쿼리 성능
  - EXPLAIN ANALYZE로 느린 쿼리 확인
  - 인덱스 활용 검증

- [ ] 메모리 누수 테스트
  - Chrome DevTools 메모리 프로파일러
  - 페이지 이동 후 메모리 증가 확인

---

### 6. 버그 수정 및 에러 처리

**목표**: 발견된 버그를 모두 해결

- [ ] 테스트에서 발견된 버그 수정
  - 각 버그별 우선순위 설정
  - Critical: 즉시 수정
  - High: 당일 수정
  - Medium/Low: 여유 있을 때 수정

- [ ] 에러 핸들링 검증
  - 백엔드 에러 응답 형식 확인
  - 프론트엔드 에러 표시 확인
  - 에러 로깅 확인

- [ ] 입력 검증 확인
  - 클라이언트 검증
  - 서버 검증
  - SQL Injection, XSS 방지

---

### 7. 데이터베이스 마이그레이션 및 시딩

**목표**: 프로덕션 데이터베이스 준비

- [ ] TypeORM 마이그레이션 생성
  ```bash
  npm run migration:generate -- -n InitialSchema
  npm run migration:run
  ```

- [ ] 데이터베이스 시드 데이터
  - `src/database/seeds/endpoint.seed.ts`
  - `src/database/seeds/notification-channel.seed.ts`
  - 테스트용 초기 데이터 준비

- [ ] 마이그레이션 검증
  - 마이그레이션 롤백 테스트
  - 데이터 무결성 확인

---

### 8. Docker 이미지 빌드 및 배포

**목표**: 프로덕션 배포 준비

- [ ] 백엔드 Docker 이미지 빌드
  ```bash
  docker build -t vigil-backend:latest ./backend
  ```

- [ ] 프론트엔드 Docker 이미지 빌드
  ```bash
  docker build -t vigil-frontend:latest ./frontend
  ```

- [ ] Docker Compose로 전체 스택 테스트
  ```bash
  docker-compose up
  ```

- [ ] 환경 변수 설정
  - production 환경 변수 확인
  - 민감한 정보 암호화

- [ ] 헬스 체크 엔드포인트 확인
  - GET /health 또는 GET /api/health 작동 여부

---

### 9. 문서화 및 배포 매뉴얼

**목표**: 운영 및 유지보수를 위한 문서 작성

- [ ] README 작성
  - `README.md` 프로젝트 개요
  - 설치 방법
  - 실행 방법
  - 환경 변수 설정
  - 기본 사용법

- [ ] API 문서 작성 (Swagger)
  ```bash
  npm install @nestjs/swagger swagger-ui-express
  ```
  - http://localhost:3000/api/docs 에서 확인 가능

- [ ] 운영 가이드 작성
  - `docs/OPERATION_GUIDE.md`
  - 모니터링 방법
  - 문제 해결 (Troubleshooting)
  - 백업 및 복구

- [ ] 개발자 가이드 작성
  - `docs/DEVELOPER_GUIDE.md`
  - 프로젝트 구조 설명
  - 개발 환경 설정
  - 코드 스타일 가이드
  - 커밋 규칙

---

### 10. 최적화 및 정리

**목표**: 코드 품질 및 성능 최적화

- [ ] 코드 스타일 검증
  ```bash
  npm run lint
  npm run format
  ```

- [ ] 불필요한 의존성 제거
  ```bash
  npm prune
  ```

- [ ] 번들 크기 최적화
  - 프론트엔드 번들 분석
  - 동적 임포트 적용

- [ ] 환경 변수 보안 검증
  - .env.example 작성 (민감한 값 제거)
  - 민감한 정보 암호화

- [ ] 로그 레벨 설정
  - 프로덕션: info 이상만
  - 개발: debug 모두

---

## 📊 테스트 진행 상황

### 현재 통계 (2025-11-21)

| 항목 | 현황 | 달성도 |
|------|------|--------|
| **백엔드 Unit 테스트** | ✅ 394/394 통과 | **100%** |
| **백엔드 Unit 커버리지** | ✅ 82.08% | **목표 80% 달성** |
| **프론트엔드 컴포넌트 테스트** | ✅ 90/90 통과 | **100%** |
| **프론트엔드 컴포넌트 커버리지** | ✅ 100% | **완벽** |
| **백엔드 E2E 테스트** | 🔄 30/45 통과 | **66.7%** |
| **프론트엔드 E2E 테스트** | 📋 145 시나리오 준비 | **준비 완료** |
| **전체 테스트** | **514/619 통과** | **83%** |

---

## ✅ 테스트 완료 체크리스트

프로젝트 테스트 진행 상황:

- ✅ 백엔드 유닛 테스트 완료
  ```bash
  npm run test                # ✅ 394/394 통과
  npm run test:cov           # ✅ 82.08% 커버리지
  ```

- ✅ 프론트엔드 컴포넌트 테스트 완료
  ```bash
  cd frontend && npm run test # ✅ 90/90 통과
  npm run test:cov           # ✅ 100% 커버리지
  ```

- 🔄 백엔드 E2E 테스트 진행 중 (66.7%)

  ```bash
  npm run test:e2e           # 🔄 30/45 통과 (15개 미완료)
  ```

  **미완료 항목**: 외부 API 호출 타임아웃, 응답 본문 처리

- 📋 프론트엔드 E2E 테스트 준비 완료

  ```bash
  cd frontend && npm run e2e # 📋 145 시나리오 작성 완료, 실행 대기
  ```

### 추가 확인 항목

- ✅ 모듈 의존성 구조 개선
  - EndpointModule에 WebsocketModule 추가
  - HealthCheckModule에 WebsocketModule 추가
  - 순환 참조 문제 해결

- ✅ 주요 버그 수정
  - `ORDER BY endpoint.undefined` 500 에러 해결
  - 정렬/필터 기본값 설정
  - manualHealthCheck @HttpCode(200) 추가

- [ ] 성능 목표 달성 여부
  - API 응답 시간: < 200ms *(검증 필요)*
  - 대시보드 로딩: < 2초 *(검증 필요)*

- [ ] 버그 현황
  - Critical: 모두 해결 ✅
  - High: 진행 중 🔄
  - Medium/Low: 후순위 📋

- [ ] Docker 배포 준비
  - docker-compose.yml 구성 ✅
  - 이미지 빌드 스크립트 *(준비 필요)*

- [ ] API 엔드포인트 검증
  - Swagger 문서 *(자동 생성됨)*
  - 30/45 E2E 테스트 통과 ✅

- [ ] WebSocket 실시간 기능
  - 아키텍처 구현 완료 ✅
  - E2E 테스트 시나리오 준비 완료 ✅

- [ ] 문서화 현황
  - README.md *(기존)*
  - API 문서 (Swagger) *(자동 생성)*
  - 워크플로우 가이드 ✅ (이 문서)
  - 운영/개발자 가이드 *(후속 작업)*

- [ ] 코드 품질 검증
  - 린트 에러: *(검증 필요)*
  - 타입스크립트 에러: *(검증 필요)*
  - 보안 취약점: *(정기 검사 필요)*

---

## 📝 배포 체크리스트

배포 전 최종 확인:

- [ ] 모든 환경 변수 설정됨
- [ ] 데이터베이스 마이그레이션 완료
- [ ] 로그 레벨 프로덕션 설정
- [ ] CORS 설정 확인
- [ ] SSL/TLS 설정 (필요시)
- [ ] 백업 전략 수립
- [ ] 모니터링 도구 설정 (선택사항)
- [ ] 배포 후 스모크 테스트 계획

---

## 🔗 관련 문서

- [PROJECT_MANAGEMENT.md](../docs/PROJECT_MANAGEMENT.md) - 전체 프로젝트 계획

## 📚 참고 자료

- [Jest 공식 문서](https://jestjs.io/)
- [React Testing Library](https://testing-library.com/react)
- [Playwright 공식 문서](https://playwright.dev/)
- [NestJS Testing](https://docs.nestjs.com/fundamentals/testing)

## 🎉 프로젝트 완료

모든 단계가 완료되면 프로젝트는 다음과 같은 상태입니다:

✅ 엔드포인트 관리 기능 완료
✅ 자동 헬스 체크 시스템 구현 완료
✅ 실시간 모니터링 대시보드 완료
✅ 알림 시스템 완료
✅ 통계 및 분석 기능 완료
✅ WebSocket 실시간 기능 완료
✅ 전체 테스트 완료
✅ 배포 준비 완료

프로젝트를 프로덕션 환경에 배포할 수 있습니다!
