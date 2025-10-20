# Step 8: 테스트 & 배포

**목표**: 통합 테스트 및 배포 준비
**기간**: Day 13-14
**상태**: ⏳ 대기

---

## 📋 워크플로우

### 1. 백엔드 유닛 테스트

**목표**: 개별 모듈 및 서비스의 단위 테스트 작성

- [ ] Jest 설정 확인
  - NestJS 프로젝트에 기본 포함됨
  - jest.config.js 확인

- [ ] 테스트 파일 구조
  ```
  src/modules/endpoint/
  ├── endpoint.service.ts
  ├── endpoint.service.spec.ts      # 테스트 파일
  └── endpoint.controller.ts
  ```

- [ ] Endpoint Service 테스트
  - `src/modules/endpoint/endpoint.service.spec.ts`
  - createEndpoint() 테스트
  - getEndpoints() 테스트
  - updateEndpoint() 테스트
  - deleteEndpoint() 테스트

- [ ] HealthCheck Service 테스트
  - `src/modules/health-check/health-check.service.spec.ts`
  - performHealthCheck() 테스트
  - 상태 판정 로직 테스트 (UP, DOWN, DEGRADED)

- [ ] Notification Service 테스트
  - `src/modules/notification/notification.service.spec.ts`
  - 이메일 전송 테스트 (Mock)
  - Slack 전송 테스트 (Mock)
  - 중복 방지 로직 테스트

- [ ] Statistics Service 테스트
  - `src/modules/statistics/statistics.service.spec.ts`
  - 가동률 계산 테스트
  - 응답 시간 통계 테스트
  - 백분위수 계산 테스트

- [ ] 테스트 커버리지 목표
  - 최소 80% 커버리지
  - 중요 비즈니스 로직: 90% 이상

---

### 2. 프론트엔드 컴포넌트 테스트

**목표**: React 컴포넌트의 기능 테스트

- [ ] Vitest 또는 Jest + React Testing Library 설정
  ```bash
  npm install --save-dev vitest @testing-library/react @testing-library/jest-dom
  ```

- [ ] 컴포넌트 테스트 작성
  - `src/components/Endpoints/EndpointList.test.tsx`
    - 목록 렌더링 테스트
    - 필터링 기능 테스트
    - 정렬 기능 테스트

  - `src/components/Dashboard/StatusCard.test.tsx`
    - 데이터 표시 테스트
    - 값 포맷팅 테스트

  - `src/components/Common/Toast.test.tsx`
    - 토스트 표시 테스트
    - 자동 닫힘 테스트

- [ ] Mock 데이터 설정
  - `src/__mocks__/endpoints.ts`
  - `src/__mocks__/incidents.ts`

- [ ] 테스트 커버리지 목표
  - 주요 컴포넌트: 80% 이상
  - 공통 컴포넌트: 90% 이상

---

### 3. API 통합 테스트

**목표**: 전체 API 엔드포인트의 통합 테스트

- [ ] E2E 테스트 프레임워크 선택
  - Supertest 또는 Test DB 활용

- [ ] API 엔드포인트 테스트
  - `test/endpoints.e2e-spec.ts`
    - POST /api/endpoints (엔드포인트 생성)
    - GET /api/endpoints (목록 조회)
    - GET /api/endpoints/:id (상세 조회)
    - PATCH /api/endpoints/:id (수정)
    - DELETE /api/endpoints/:id (삭제)

  - `test/statistics.e2e-spec.ts`
    - GET /api/endpoints/:id/uptime
    - GET /api/endpoints/:id/response-time
    - GET /api/statistics/overview

  - `test/health-check.e2e-spec.ts`
    - POST /api/endpoints/:id/check (수동 체크)
    - 결과 검증

- [ ] 에러 케이스 테스트
  - 400: 잘못된 요청
  - 404: 리소스 없음
  - 500: 서버 에러

- [ ] 테스트 DB 설정
  - 각 테스트마다 독립적인 DB 사용
  - 테스트 완료 후 정리

---

### 4. 프론트엔드 E2E 테스트

**목표**: 사용자 시나리오에 따른 엔드 투 엔드 테스트

- [ ] Playwright 또는 Cypress 설정
  ```bash
  npm install --save-dev playwright
  ```

- [ ] E2E 테스트 시나리오
  - `e2e/endpoints.spec.ts`
    1. 대시보드 페이지 접속
    2. "엔드포인트 추가" 버튼 클릭
    3. 폼 작성 및 제출
    4. 목록에 추가된 엔드포인트 확인
    5. 상세 페이지 접속
    6. 수정/삭제 기능 테스트

  - `e2e/dashboard.spec.ts`
    1. 대시보드 페이지 접속
    2. 상태 카드 데이터 확인
    3. 차트 렌더링 확인
    4. 필터 기능 테스트

  - `e2e/realtime.spec.ts`
    1. 페이지 접속
    2. WebSocket 연결 확인
    3. 상태 변경 시 실시간 업데이트 확인
    4. 토스트 알림 표시 확인

- [ ] 테스트 환경 설정
  - 테스트용 서버 실행
  - 테스트용 데이터베이스

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

## ✅ 최종 완료 체크리스트

프로젝트 완료 확인:

- [ ] 모든 유닛 테스트가 통과하는가?
  ```bash
  npm run test
  ```

- [ ] 모든 E2E 테스트가 통과하는가?
  ```bash
  npm run test:e2e
  ```

- [ ] 테스트 커버리지가 목표를 달성했는가?
  ```bash
  npm run test:cov
  ```

- [ ] 성능 목표를 달성했는가?
  - API 응답 시간: < 200ms
  - 대시보드 로딩: < 2초

- [ ] 버그가 모두 수정되었는가?
  - 우선순위별로 모두 해결
  - 회귀 테스트 완료

- [ ] Docker로 전체 스택이 정상 작동하는가?
  ```bash
  docker-compose up
  ```

- [ ] 모든 API 엔드포인트가 작동하는가?
  - Swagger 문서 확인
  - 수동 테스트 완료

- [ ] 실시간 기능 (WebSocket)이 작동하는가?
  - 상태 변경 즉시 반영
  - 토스트 알림 표시

- [ ] 모든 문서가 작성되었는가?
  - README.md
  - API 문서 (Swagger)
  - 운영 가이드
  - 개발자 가이드

- [ ] 코드 품질이 양호한가?
  - 린트 에러 없음
  - 타입스크립트 에러 없음
  - 보안 취약점 없음

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
