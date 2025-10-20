# Step 1: 프로젝트 셋업

**목표**: NestJS 프로젝트 생성 및 기본 인프라 구축
**기간**: Day 1-2
**상태**: ✅ 완료

---

## 📋 워크플로우

### 1. NestJS 프로젝트 생성 및 모듈 구조 설계

**목표**: 기본 NestJS 프로젝트 생성 및 디렉토리 구조 설정

- [x] NestJS CLI를 통한 프로젝트 초기화
  - 프로젝트명: vigil
  - 패키지 매니저: npm

- [x] 기본 디렉토리 구조 생성
  ```
  src/
  ├── common/
  ├── config/
  ├── modules/
  ├── app.module.ts
  └── main.ts
  ```

- [x] 코드 스타일 설정
  - ESLint 설정
  - Prettier 설정
  - .gitignore 업데이트

- [x] package.json 의존성 확인
  - TypeScript
  - NestJS core 모듈들

---

### 2. Docker Compose 설정

**목표**: 개발 환경에 필요한 서비스 컨테이너화

- [x] PostgreSQL 컨테이너 설정
  - 이미지: postgres:15
  - 환경 변수 설정
  - 포트: 5432

- [x] Redis 컨테이너 설정
  - 이미지: redis:7-alpine
  - 포트: 6379

- [x] docker-compose.yml 작성
  - 서비스 정의
  - 의존성 설정

- [ ] 네트워크 및 볼륨 설정
  - Named volumes 정의
  - 컨테이너 간 통신 설정

---

### 3. TypeORM 설정 및 Entity 정의

**목표**: 데이터베이스 ORM 설정 및 엔티티 정의

- [x] TypeORM 의존성 설치
  ```
  npm install typeorm pg
  ```

- [x] TypeORM 설정 파일 작성
  - ormconfig.ts 또는 app.module 설정
  - 데이터베이스 연결 정보
  - 마이그레이션 경로 설정

- [x] Entity 생성
  - [x] Endpoint Entity
    - 위치: `src/modules/endpoint/entities/endpoint.entity.ts`
    - 필드: id, name, url, method, headers, body, checkInterval, expectedStatusCode, timeoutThreshold, isActive, currentStatus, lastResponseTime, lastCheckedAt, consecutiveFailures, createdAt, updatedAt

  - [x] CheckResult Entity
    - 위치: `src/modules/health-check/entities/check-result.entity.ts`
    - 필드: id, endpointId, status, responseTime, statusCode, errorMessage, checkedAt

  - [x] Incident Entity
    - 위치: `src/modules/incident/entities/incident.entity.ts`
    - 필드: id, endpointId, startedAt, resolvedAt, duration, failureCount, errorMessage

  - [x] NotificationChannel Entity
    - 위치: `src/modules/notification/entities/notification-channel.entity.ts`
    - 필드: id, name, type, config, isActive, createdAt, updatedAt

- [x] 관계 설정
  - Endpoint 1:N CheckResult
  - Endpoint 1:N Incident

---

### 4. 환경 변수 및 설정 모듈

**목표**: 환경 변수 관리 및 설정 모듈화

- [x] @nestjs/config 설치
  ```
  npm install @nestjs/config
  ```

- [x] .env.example 파일 작성
  ```env
  DATABASE_HOST=localhost
  DATABASE_PORT=5432
  DATABASE_USER=postgres
  DATABASE_PASSWORD=postgres
  DATABASE_NAME=api_monitor

  REDIS_HOST=localhost
  REDIS_PORT=6379

  PORT=3000
  NODE_ENV=development
  ```

- [ ] 환경 변수 validation 설정
  - Joi를 통한 스키마 validation
  - 필수 변수 검증

- [ ] ConfigModule 전역 설정
  - app.module에 ConfigModule 등록
  - 다른 모듈에서 사용 가능하도록 설정

---

## ✅ 완료 체크리스트

작업이 완료되었는지 확인합니다:

- [x] NestJS 프로젝트가 정상적으로 실행되는가?
  ```bash
  npm run start:dev
  # 결과: http://localhost:3000 에서 응답 확인
  ```

- [x] TypeORM 데이터베이스 연결이 정상적으로 동작하는가?
  - Docker 컨테이너 실행 후 엔티티 동기화 확인

- [ ] Docker Compose로 전체 스택이 실행되는가?
  ```bash
  docker-compose up
  # PostgreSQL과 Redis 컨테이너가 정상 실행되는지 확인
  ```

- [ ] 환경 변수가 올바르게 로드되는가?
  - 콘솔에서 config 값 확인
  - 다양한 환경(dev, prod)에서 테스트

---

## 📝 추가 참고사항

### 생성된 주요 파일

```
src/
├── config/
│   └── typeorm.config.ts
├── modules/
│   ├── endpoint/
│   │   └── entities/
│   │       └── endpoint.entity.ts
│   ├── health-check/
│   │   └── entities/
│   │       └── check-result.entity.ts
│   ├── incident/
│   │   └── entities/
│   │       └── incident.entity.ts
│   └── notification/
│       └── entities/
│           └── notification-channel.entity.ts
├── app.module.ts
└── main.ts

docker-compose.yml
.env.example
```

### 의존성

```json
{
  "typeorm": "^0.3.x",
  "pg": "^8.x",
  "@nestjs/config": "^3.x",
  "joi": "^17.x"
}
```

---

## 🔗 관련 문서

- [DATABASE_SCHEMA.md](../docs/DATABASE_SCHEMA.md) - Entity 설계 참고
- [PROJECT_MANAGEMENT.md](../docs/PROJECT_MANAGEMENT.md) - 전체 프로젝트 계획

## ➡️ 다음 단계

→ [02-endpoint-healthcheck.md](./02-endpoint-healthcheck.md)

**다음 단계 내용**:
- Endpoint CRUD API 구현
- Bull Queue 설정 및 헬스 체크 프로세서 구현
- 헬스 체크 로직 작성
