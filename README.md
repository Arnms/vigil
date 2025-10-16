# Vigil - API 모니터링 대시보드

여러 API 엔드포인트의 건강 상태를 실시간으로 모니터링하고, 장애 발생 시 즉시 알림을 제공하는 서비스입니다.

## 주요 기능

- ⚡ **실시간 모니터링**: WebSocket 기반 실시간 상태 업데이트
- 🔄 **자동 헬스 체크**: 설정한 간격으로 자동 API 상태 확인
- 📧 **다채널 알림**: 이메일, Slack 알림 지원
- 📊 **통계 및 분석**: 가동률, 응답 시간 트렌드 분석
- 🎯 **인시던트 관리**: 장애 이력 추적 및 관리

## 기술 스택

### Backend
- **Framework**: NestJS + TypeScript
- **Database**: PostgreSQL + TypeORM
- **Cache/Queue**: Redis + Bull
- **Real-time**: WebSocket (Socket.io)
- **Notifications**: Nodemailer, Slack Webhook

### Frontend
- **Framework**: React + Vite + TypeScript
- **Styling**: TailwindCSS
- **Charts**: Recharts
- **State Management**: Zustand

### DevOps
- **Container**: Docker + Docker Compose

## 시작하기

### 사전 요구사항

- Node.js 18+
- Docker & Docker Compose
- Git

### 설치 및 실행

1. **저장소 클론**
```bash
git clone git@github.com:Arnms/vigil.git
cd vigil
```

2. **환경 변수 설정**
```bash
cp .env.example backend/.env
# backend/.env 파일을 편집하여 필요한 값 설정
```

3. **Docker 컨테이너 실행**
```bash
docker-compose up -d
```

4. **백엔드 실행**
```bash
cd backend
npm install
npm run start:dev
```

5. **애플리케이션 접속**
- Backend API: http://localhost:3000
- API Documentation: http://localhost:3000/api (예정)

## 프로젝트 구조

```
vigil/
├── backend/                 # NestJS 백엔드
│   ├── src/
│   │   ├── common/         # 공통 유틸리티
│   │   ├── config/         # 설정 파일
│   │   └── modules/        # 기능 모듈
│   │       ├── endpoint/   # 엔드포인트 관리
│   │       ├── health-check/  # 헬스 체크
│   │       ├── incident/   # 인시던트 관리
│   │       ├── notification/  # 알림 시스템
│   │       ├── statistics/ # 통계
│   │       └── websocket/  # 실시간 통신
│   └── test/
├── frontend/               # React 프론트엔드 (예정)
├── docs/                   # 프로젝트 문서
├── docker-compose.yml      # Docker 구성
└── README.md
```

## 데이터베이스 스키마

### Endpoints
엔드포인트 정보 및 설정

### CheckResults
헬스 체크 결과 이력

### Incidents
장애 발생 및 복구 이력

### NotificationChannels
알림 채널 설정

## 개발 일정

- **Week 1**: 백엔드 핵심 기능 개발
  - 프로젝트 셋업 ✅
  - 엔드포인트 & 헬스 체크
  - 알림 시스템
  - 통계 API

- **Week 2**: 프론트엔드 & 통합
  - 기본 UI 구현
  - 대시보드 & 차트
  - WebSocket 실시간 기능
  - 테스트 & 배포

## 환경 변수

주요 환경 변수는 `.env.example` 파일을 참고하세요.

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

## 개발 명령어

### Backend
```bash
# 개발 모드 실행
npm run start:dev

# 프로덕션 빌드
npm run build

# 테스트 실행
npm run test

# E2E 테스트
npm run test:e2e
```

## 라이선스

MIT

## 참고 자료

- [NestJS Documentation](https://docs.nestjs.com/)
- [TypeORM Documentation](https://typeorm.io/)
- [Bull Queue Documentation](https://github.com/OptimalBits/bull)
- [Socket.io Documentation](https://socket.io/docs/v4/)
