# CLAUDE.md

이 파일은 Claude Code(claude.ai/code)가 이 저장소에서 코드 작업을 할 때 참고할 지침을 제공합니다.

## 프로젝트 개요

**Vigil**은 여러 API 엔드포인트를 실시간으로 모니터링하고, 문제 발생 시 즉시 알림을 보내는 API 모니터링 대시보드입니다.

- **진행 상태**: 초기 개발 중 (1주차 백엔드 핵심 기능)
- **주요 언어**: TypeScript
- **백엔드 프레임워크**: NestJS
- **데이터베이스**: PostgreSQL
- **캐시/큐**: Redis + Bull
- **실시간 통신**: WebSocket (Socket.io)

## 기술 스택

### 백엔드
- **프레임워크**: NestJS 11 + TypeScript 5.7
- **데이터베이스**: PostgreSQL 15 + TypeORM 0.3
- **캐시/큐**: Redis 7 + Bull 4 (백그라운드 작업 처리)
- **HTTP 클라이언트**: Axios (@nestjs/axios 경유)
- **WebSocket**: Socket.io 4 (@nestjs/websockets 경유)
- **검증**: class-validator 0.14
- **알림**: Nodemailer 7 (이메일), Slack 웹훅

### DevOps
- **컨테이너화**: Docker + Docker Compose
- **포트 매핑**:
  - 백엔드 API: 3000
  - PostgreSQL: 5432
  - Redis: 6379

## 개발 명령어

### 백엔드 개발 (`backend/` 디렉토리에서)

**설치 및 실행**
```bash
npm install
npm run start:dev           # 개발 모드 (자동 새로고침)
docker-compose up -d        # PostgreSQL & Redis 서비스 시작
```

**빌드 및 프로덕션**
```bash
npm run build              # TypeScript를 dist/로 컴파일
npm run start:prod         # 컴파일된 JavaScript 실행
npm start                  # 감시 모드 없이 실행
```

**테스트**
```bash
npm run test              # 단위 테스트 1회 실행
npm run test:watch       # 테스트 감시 모드
npm run test:cov         # 테스트 커버리지 리포트 생성
npm run test:e2e         # E2E 테스트 실행
npm run test:debug       # 디버거로 테스트 실행
```

**코드 품질**
```bash
npm run lint              # ESLint 위반 사항 수정
npm run format            # Prettier로 코드 포맷팅
```

### Docker & 서비스

```bash
# 모든 서비스 시작 (PostgreSQL, Redis)
docker-compose up -d

# 서비스 중지
docker-compose down

# 로그 확인
docker-compose logs -f [service_name]

# 볼륨 제거 (데이터베이스 초기화)
docker-compose down -v
```

## 프로젝트 아키텍처

### 디렉토리 구조
```
backend/
├── src/
│   ├── common/               # 공통 유틸리티, 데코레이터, 파이프
│   ├── config/               # 설정 파일
│   │   ├── app.config.ts
│   │   ├── database.config.ts
│   │   ├── redis.config.ts
│   │   └── notification.config.ts
│   ├── modules/              # 기능 모듈
│   │   ├── endpoint/         # 엔드포인트 CRUD 작업
│   │   ├── health-check/     # 헬스 체크 스케줄링 및 실행
│   │   ├── incident/         # 인시던트 추적 및 관리
│   │   ├── notification/     # 알림 발송 (이메일/Slack)
│   │   ├── statistics/       # 분석 및 리포팅
│   │   └── websocket/        # Socket.io를 통한 실시간 업데이트
│   ├── app.module.ts         # 루트 모듈
│   └── main.ts               # 애플리케이션 진입점
├── test/                     # E2E 테스트
├── Dockerfile
└── package.json
```

### 핵심 모듈 및 책임

**Endpoint 모듈**
- 모니터링되는 API 엔드포인트에 대한 CRUD 작업
- 엔티티: `Endpoint` (id, name, url, method, headers, body, checkInterval, expectedStatusCode, timeoutThreshold, isActive, currentStatus)

**Health Check 모듈**
- 정기적인 엔드포인트 체크를 위한 Bull Queue 프로세서
- 모니터링되는 엔드포인트로의 HTTP 요청
- `CheckResult` 엔티티에 결과 저장
- 실패 시 인시던트 생성 트리거

**Incident 모듈**
- 장애 발생 및 상태 변경 추적
- 엔티티: `Incident` (endpointId, startedAt, resolvedAt, failureCount, errorMessage)
- 알림 시스템과 통합

**Notification 모듈**
- 여러 알림 채널을 위한 전략 패턴 구현
- 구현: 이메일 (Nodemailer), Slack 웹훅
- Redis 캐싱을 통한 중복 알림 방지 (5분 윈도우)

**Statistics 모듈**
- 가동 시간 계산 (일간/주간/월간)
- 응답 시간 분석
- TypeORM QueryBuilder를 통한 쿼리 성능 최적화
- 자주 접근하는 통계는 Redis 캐싱

**WebSocket 모듈**
- 실시간 업데이트를 위한 Socket.io 게이트웨이
- 연결된 클라이언트에 상태 변경 브로드캐스트
- 이벤트 주도 아키텍처

### 설정 시스템

모든 설정은 NestJS ConfigModule을 사용하는 팩토리 패턴으로 구현:
- **app.config.ts**: 애플리케이션 설정 (포트, node_env)
- **database.config.ts**: PostgreSQL 연결 정보
- **redis.config.ts**: Redis 연결 설정
- **notification.config.ts**: SMTP, Slack 설정

설정은 `.env` 파일에서 로드됩니다. 필요한 변수는 `.env.example`을 참고하세요.

## 데이터베이스 스키마

### 핵심 엔티티
- **Endpoint**: 모니터링되는 API 설정 저장
- **CheckResult**: 헬스 체크 결과 이력
- **Incident**: 장애 기록 및 복구 이벤트
- **NotificationChannel**: 설정된 알림 대상

스키마 변경 시 TypeORM 마이그레이션 사용:
```bash
npm run typeorm migration:generate -- -n [MigrationName]
npm run typeorm migration:run
```

## 주요 구현 패턴

### Bull Queue를 통한 백그라운드 작업
- 각 엔드포인트마다 정기적인 작업 (설정 가능한 간격)
- 작업은 헬스 체크 실행 및 엔드포인트 상태 업데이트
- 실패한 체크는 인시던트 및 알림 트리거 가능

### WebSocket 브로드캐스팅
- 상태 변경 시 연결된 모든 클라이언트에 브로드캐스트
- 폴링 없이 실시간 대시보드 업데이트
- WebSocket 사용 불가 시 HTTP 폴링으로 폴백

### 알림 전략 패턴
- 추상 `NotificationStrategy` 인터페이스
- 구체적 구현: `EmailNotificationStrategy`, `SlackNotificationStrategy`
- 전략 인터페이스를 구현하여 새로운 채널 추가

### 엔티티 관계
- Endpoint → CheckResults (1:다)
- Endpoint → Incidents (1:다)
- Endpoint → NotificationChannels (다:다 관계를 통해)

## 테스트 전략

- **단위 테스트**: Jest와 spec 파일 (`*.spec.ts`)
- **E2E 테스트**: `test/jest-e2e.json`에 설정
- **커버리지**: `npm run test:cov`로 커버리지 리포트 생성
- **목 데이터**: NestJS `@nestjs/testing` 모듈 팩토리 사용

## 성능 고려사항

1. **데이터베이스 인덱싱**: 자주 조회되는 필드에 인덱스 추가 (endpointId, checkedAt)
2. **Redis 캐싱**: TTL과 함께 집계 통계 캐싱
3. **페이지네이션**: 큰 결과 세트 구현 (체크 결과, 인시던트)
4. **배치 작업**: Bull Queue 패턴을 사용한 간격별 벌크 체크 그룹화
5. **연결 풀링**: TypeORM 풀 설정을 통해 구성

## 일반적인 개발 작업

### 새 모듈 추가
1. `src/modules/[name]` 아래 모듈 디렉토리 생성
2. 컨트롤러/서비스 생성: `nest generate resource modules/[name]`
3. 엔티티 파일 생성: `src/modules/[name]/[name].entity.ts`
4. `app.module.ts`에서 새 모듈 임포트
5. 데이터베이스 사용 시 모듈에 TypeORM 임포트 추가

### 새 엔드포인트 추가
1. 모듈에 DTO (Data Transfer Object) 생성
2. 컨트롤러 메소드 구현
3. NestJS Swagger가 있으면 라우트 문서 추가
4. 해당 `.spec.ts` 테스트 파일 작성

### 데이터베이스 마이그레이션
- 스키마 변경 시 항상 TypeORM CLI 사용, 엔티티 직접 수정 금지
- 프로덕션 배포를 위해 마이그레이션 이력 유지

### 헬스 체크 수동 실행
- 헬스 체크는 간격 설정에 따라 Bull Queue를 통해 스케줄됨
- API 엔드포인트를 통해 수동으로 트리거 가능 (구현 시)
- 체크 결과는 데이터베이스에 저장되어 이력 분석 가능

## 디버깅 및 문제 해결

**포트 충돌**
- 백엔드: 3000
- PostgreSQL: 5432
- Redis: 6379
- 필요하면 `.env`에서 포트 변경 가능

**데이터베이스 연결 문제**
```bash
# PostgreSQL이 실행 중인지 확인
docker-compose logs postgres
# .env의 연결 문자열 확인
```

**Redis 연결 문제**
```bash
# Redis가 실행 중인지 확인
docker-compose logs redis
# Redis CLI로 테스트
redis-cli ping
```

**WebSocket 업데이트 안 됨**
- 프론트엔드에서 Socket.io가 제대로 초기화되었는지 확인
- 브라우저 콘솔에서 연결 오류 확인
- WebSocket 게이트웨이가 app.module에 등록되었는지 확인

## 환경 변수

필수 `.env` 변수 (`.env.example` 참고):
```
DATABASE_HOST, DATABASE_PORT, DATABASE_USER, DATABASE_PASSWORD, DATABASE_NAME
REDIS_HOST, REDIS_PORT
PORT, NODE_ENV
SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
SLACK_WEBHOOK_URL
```

## 중요 파일 및 진입점

- **메인 진입점**: `src/main.ts` - NestJS 애플리케이션 부트스트랩
- **루트 모듈**: `src/app.module.ts` - 설정 및 모듈 임포트
- **Docker 설정**: `docker-compose.yml` - 서비스 오케스트레이션
- **패키지 설정**: `backend/package.json` - 의존성 및 스크립트
- **TS 설정**: `backend/tsconfig.json` - TypeScript 컴파일 설정

## 배포

애플리케이션은 컨테이너화되어 Docker를 통해 배포 가능:
1. 백엔드 이미지 빌드 (backend/ 디렉토리의 Dockerfile)
2. 전체 스택 배포를 위해 docker-compose.yml 사용
3. 프로덕션을 위해 모든 환경 변수 설정 확인
4. 서비스 시작 전 마이그레이션 실행

## 코딩 스타일 가이드

### 명명 규칙

- **변수/함수/메서드**: camelCase

  ```typescript
  const userId = 123;
  function getUserData() { }
  async createEndpoint() { }
  ```

- **클래스/인터페이스**: PascalCase

  ```typescript
  class EndpointService { }
  interface CreateEndpointDto { }
  ```

- **상수**: UPPER_SNAKE_CASE

  ```typescript
  const MAX_RETRIES = 3;
  const DEFAULT_TIMEOUT = 5000;
  ```

- **파일명**:
  - 엔티티: `*.entity.ts` (예: `endpoint.entity.ts`)
  - DTO: `*.dto.ts` (예: `create-endpoint.dto.ts`)
  - 서비스: `*.service.ts` (예: `endpoint.service.ts`)
  - 컨트롤러: `*.controller.ts` (예: `endpoint.controller.ts`)
  - 테스트: `*.spec.ts` (예: `endpoint.service.spec.ts`)

### SOLID 원칙 준수

- **Single Responsibility**: 각 클래스/함수는 하나의 책임만 가짐
- **Open/Closed**: 확장에는 열려있고 수정에는 닫혀있음
- **Interface Segregation**: 불필요한 인터페이스 의존 금지
- **Dependency Inversion**: 구체화가 아닌 추상화에 의존

### 코드 품질 원칙

- **DRY (Don't Repeat Yourself)**: 중복 코드 제거
- **KISS (Keep It Simple, Stupid)**: 단순한 설계 우선
- **YAGNI (You Aren't Gonna Need It)**: 필요한 것만 구현

### 구현 완결성

- ❌ 부분 기능 구현 금지 (시작하면 완성하기)
- ❌ TODO 주석 금지 (핵심 기능에 대해서는 구현 필수)
- ❌ Mock/Stub 구현 금지 (실제 동작하는 코드만)
- ❌ Not implemented 에러 금지 (모든 함수는 동작 가능해야 함)

### 코드 조직화

- 관련 기능끼리 모듈로 묶기
- 파일은 기능 중심으로 구성 (폴더 타입 중심 ❌)
- 계층적 구조 명확히 (models → services → controllers)
- 공통 로직은 `common/` 디렉토리에 배치

### TypeScript 타입 안정성

```typescript
// ✅ 좋음: 명시적 타입 지정
function processEndpoint(endpoint: Endpoint): CheckResult {
  // ...
}

// ❌ 피하기: any 타입 사용
function processEndpoint(endpoint: any) {
  // ...
}
```

### 에러 처리

- 모든 에러는 명확한 메시지와 함께 throw
- try-catch 사용 시 구체적인 에러 핸들링
- NestJS Exception Filters 활용하여 일관된 에러 응답

### 테스트 작성

- 모든 서비스/컨트롤러는 `.spec.ts` 테스트 파일 필수
- 양성/음성 케이스 모두 테스트
- Mock 데이터는 명확하고 재사용 가능하게 구성

## Git 워크플로우

### 커밋 메시지 규칙

```bash
커밋 제목 (한 줄 요약)

- 세부 변경사항 1
- 세부 변경사항 2
- 세부 변경사항 3
```

**주의사항:**

- ✅ 기능별로 구분하여 별도 커밋 작성
- ✅ 한국어로 작성
- ✅ 커밋 메시지에 구체적인 예시 포함
- ❌ Claude Code 관련 내용 포함 금지 (예: "Generated with Claude Code", "Co-Authored-By: Claude")
- ❌ 로봇 이모지 사용 금지 (🤖)

---

**최종 업데이트**: 2025-10-20
**상태**: 백엔드 핵심 설정 완료, 모듈 개발 중
**다음 단계**: endpoint/health-check/notification 모듈 완성, 프론트엔드 통합
