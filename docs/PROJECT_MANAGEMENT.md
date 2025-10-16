# API 모니터링 대시보드 프로젝트 계획서

## 프로젝트 개요

여러 API 엔드포인트의 건강 상태를 실시간으로 모니터링하고, 장애 발생 시 즉시 알림을 제공하는 서비스

**목표 기간:** 2주  
**난이도:** 중급-고급

---

## 기술 스택

### 백엔드

- **Framework:** NestJS + TypeScript
- **Database:** PostgreSQL + TypeORM
- **Cache/Queue:** Redis + Bull
- **Real-time:** @nestjs/websockets (Socket.io)
- **HTTP Client:** @nestjs/axios
- **Validation:** class-validator
- **Notifications:** Nodemailer, Slack Webhook

### 프론트엔드

- **Framework:** React + Vite + TypeScript
- **Styling:** TailwindCSS
- **Charts:** Recharts
- **WebSocket:** Socket.io-client
- **State:** Zustand

### DevOps

- **Container:** Docker + Docker Compose
- **Config:** @nestjs/config

---

## 핵심 기능

### 1. 엔드포인트 관리

- API 엔드포인트 등록/수정/삭제
- URL, HTTP 메소드, 헤더, 바디 설정
- 체크 간격 설정 (30초, 1분, 5분 등)
- 예상 응답 코드 및 타임아웃 임계값 설정

### 2. 자동 헬스 체크

- Bull Queue를 이용한 주기적 체크 스케줄링
- 각 엔드포인트에 실제 HTTP 요청 전송
- 응답 시간, 상태 코드, 성공/실패 기록
- 연속 실패 시 인시던트 생성

### 3. 실시간 모니터링

- WebSocket을 통한 실시간 상태 업데이트
- 현재 상태 표시 (UP/DOWN/DEGRADED)
- 최근 24시간 가동률 표시
- 평균 응답 시간 차트
- 인시던트 타임라인

### 4. 알림 시스템

- 다운 감지 시 즉시 알림
- 복구 시에도 알림
- 알림 채널: 이메일, Slack
- 중복 알림 방지 (5분 내 같은 알림은 1회만)

### 5. 통계 및 분석

- 일/주/월별 가동률 통계
- 응답 시간 트렌드 분석
- 인시던트 히스토리
- 엔드포인트별 성능 비교

---

## 프로젝트 구조

```
api-monitor/
├── backend/
│   ├── src/
│   │   ├── common/              # 공통 유틸리티
│   │   ├── config/              # 설정 파일
│   │   ├── modules/
│   │   │   ├── endpoint/        # 엔드포인트 CRUD
│   │   │   ├── health-check/    # 헬스 체크 로직
│   │   │   ├── incident/        # 인시던트 관리
│   │   │   ├── notification/    # 알림 전송
│   │   │   ├── statistics/      # 통계 API
│   │   │   └── websocket/       # 실시간 통신
│   │   ├── app.module.ts
│   │   └── main.ts
│   ├── test/
│   ├── package.json
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Dashboard/
│   │   │   ├── EndpointList/
│   │   │   ├── EndpointForm/
│   │   │   ├── StatusCard/
│   │   │   └── Chart/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── stores/
│   │   └── types/
│   ├── package.json
│   └── vite.config.ts
├── docker-compose.yml
└── README.md
```

---

## 데이터베이스 설계

### Endpoints (엔드포인트)

- id, name, url, method
- headers (JSON), body (JSON)
- checkInterval, expectedStatusCode, timeoutThreshold
- isActive, currentStatus
- createdAt, updatedAt

### CheckResults (체크 결과)

- id, endpointId
- status (success/failure)
- responseTime, statusCode
- errorMessage
- checkedAt

### Incidents (인시던트)

- id, endpointId
- startedAt, resolvedAt, duration
- failureCount, errorMessage

### NotificationChannels (알림 채널)

- id, name, type (email/slack)
- config (JSON - 이메일, 웹훅 URL 등)
- isActive, createdAt

---

## 주요 구현 포인트

### 헬스 체크 시스템

- Bull Queue로 각 엔드포인트마다 반복 작업 등록
- Processor에서 실제 HTTP 요청 수행
- 결과에 따라 상태 업데이트 및 알림 트리거

### 알림 전략 패턴

- 이메일, Slack 등 여러 알림 방식을 Strategy Pattern으로 구현
- Redis를 이용한 중복 알림 방지 (캐싱)

### 실시간 업데이트

- WebSocket Gateway에서 상태 변경 시 클라이언트에 브로드캐스트
- 프론트엔드는 Socket.io로 연결하여 실시간 수신

### 통계 계산

- TypeORM QueryBuilder로 집계 쿼리 작성
- 가동률, 평균 응답 시간 등 계산
- Redis에 자주 조회되는 통계 캐싱

---

## 2주 개발 일정

### Week 1: 백엔드 핵심 기능

**Day 1-2: 프로젝트 셋업**

- NestJS 프로젝트 생성 및 모듈 구조 설계
- Docker Compose 설정 (PostgreSQL, Redis)
- TypeORM 설정 및 Entity 정의
- 환경 변수 및 설정 모듈

**Day 3-4: 엔드포인트 & 헬스 체크**

- Endpoint CRUD API 구현
- Bull Queue 설정 및 Processor 구현
- 헬스 체크 로직 작성
- 체크 결과 저장 및 상태 업데이트

**Day 5-6: 알림 시스템**

- Notification 모듈 구현
- 이메일 전송 (Nodemailer)
- Slack 웹훅 통합
- 중복 알림 방지 로직 (Redis)

**Day 7: 통계 API & 최적화**

- Statistics 모듈 구현
- 가동률, 응답 시간 통계 API
- 인시던트 히스토리 API
- 쿼리 최적화 및 인덱스 추가

### Week 2: 프론트엔드 & 통합

**Day 8-9: 기본 UI 구현**

- 프로젝트 셋업 (Vite + React + TS)
- 레이아웃 및 라우팅
- 엔드포인트 목록 및 등록 폼
- API 서비스 연결

**Day 10-11: 대시보드 & 차트**

- 상태 카드 컴포넌트
- 응답 시간 차트 (Recharts)
- 가동률 표시
- 인시던트 타임라인

**Day 12: WebSocket 실시간 기능**

- Socket.io 클라이언트 연결
- 실시간 상태 업데이트
- 알림 토스트
- 전역 상태 관리 (Zustand)

**Day 13: 테스트 & 버그 수정**

- 엔드 투 엔드 테스트
- 버그 수정 및 에러 핸들링
- 성능 최적화

**Day 14: 배포 & 문서화**

- Docker 이미지 빌드
- Docker Compose로 전체 스택 실행
- README 작성
- API 문서화 (Swagger)

---

## 환경 변수 설정 (.env.example)

```env
# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=api_monitor

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Application
PORT=3000
NODE_ENV=development

# Notifications
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

---

## Docker Compose 구성

```yaml
version: "3.8"

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: api_monitor
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  backend:
    build: ./backend
    ports:
      - "3000:3000"
    depends_on:
      - postgres
      - redis
    environment:
      DATABASE_HOST: postgres
      REDIS_HOST: redis

  frontend:
    build: ./frontend
    ports:
      - "5173:5173"
    depends_on:
      - backend

volumes:
  postgres_data:
```

---

## 확장 아이디어

프로젝트 완성 후 추가할 수 있는 기능:

- **멀티 유저 지원**: 인증 시스템 추가
- **팀 기능**: 여러 사람이 함께 모니터링
- **커스텀 알림 규칙**: 응답 시간 임계값 초과 시 알림 등
- **SSL 인증서 체크**: 만료일 추적
- **Public Status Page**: 외부 공개용 상태 페이지
- **API 키 인증**: API를 통한 외부 통합
- **멀티 리전 체크**: 여러 지역에서 동시 체크

---

## 학습 목표

이 프로젝트를 통해 다음을 경험할 수 있습니다:

- NestJS 모듈 아키텍처 설계
- Bull Queue를 이용한 백그라운드 작업 처리
- WebSocket을 통한 실시간 통신
- Redis 캐싱 및 분산 작업 큐
- TypeORM을 이용한 복잡한 쿼리 작성
- Strategy Pattern을 이용한 확장 가능한 알림 시스템
- Docker를 이용한 멀티 컨테이너 환경 구성

---

## 참고 자료

- [NestJS 공식 문서](https://docs.nestjs.com/)
- [Bull Queue 문서](https://github.com/OptimalBits/bull)
- [Socket.io 문서](https://socket.io/docs/v4/)
- [TypeORM 문서](https://typeorm.io/)

---

**프로젝트 시작 전 체크리스트:**

- [ ] Node.js 18+ 설치
- [ ] Docker & Docker Compose 설치
- [ ] PostgreSQL 클라이언트 (DBeaver, pgAdmin 등)
- [ ] Redis 클라이언트 (RedisInsight 등)
- [ ] 코드 에디터 (VS Code 추천)
- [ ] Postman 또는 Thunder Client (API 테스트용)

**프로젝트 완료 기준:**

- [ ] 엔드포인트 등록/수정/삭제 가능
- [ ] 자동 헬스 체크 동작
- [ ] 실시간 상태 업데이트 작동
- [ ] 알림 전송 (최소 1개 채널)
- [ ] 통계 대시보드 표시
- [ ] Docker Compose로 전체 실행 가능
- [ ] README 문서 작성 완료
