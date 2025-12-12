# Vigil - API 모니터링 대시보드

여러 API 엔드포인트의 건강 상태를 실시간으로 모니터링하고, 장애 발생 시 즉시 알림을 제공하는 서비스입니다.

## 📊 프로젝트 현황

**개발 진행도**: 2주차 완료 (테스트 단계)

### 테스트 커버리지

- ✅ **백엔드 유닛 테스트**: 82.08% 커버리지 (394개 테스트 통과)
- ✅ **프론트엔드 컴포넌트 테스트**: 100% 커버리지 (90개 테스트 통과)
- ✅ **백엔드 API 통합 테스트**: 100% 통과 (45/45)
- ✅ **프론트엔드 E2E 테스트**: 100% 통과 (76/76)

**전체 테스트**: 605개 테스트, 99.5% 이상 성공률

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
- Frontend: http://localhost:5173
- API Documentation: http://localhost:3000/api (예정)

## 배포하기 (Render.com + Upstash Redis)

무료 플랫폼을 사용하여 데모 버전을 배포할 수 있습니다.

### 배포 플랫폼

- **Render.com**: 백엔드, 프론트엔드, PostgreSQL (Free tier)
- **Upstash**: Redis 캐싱 및 큐 (Free tier, 10,000 commands/day)

### 빠른 배포 가이드

1. **Upstash Redis 설정**
   - [Upstash Console](https://console.upstash.com/)에서 계정 생성
   - Regional Redis 데이터베이스 생성
   - 연결 정보 저장 (Host, Port, Password)

2. **Render.com 설정**
   - [Render.com](https://render.com/)에서 GitHub 계정으로 로그인
   - 저장소 연결 권한 부여

3. **Blueprint로 자동 배포** (권장)
   ```bash
   # 저장소 루트의 render.yaml 파일 사용
   # Render Dashboard에서 "New" -> "Blueprint" 선택
   # 저장소 선택 시 자동으로 설정 적용
   ```

4. **환경 변수 설정**
   - Render Dashboard에서 각 서비스의 Environment 탭 이동
   - Upstash Redis 연결 정보 입력:
     - `REDIS_HOST`: Upstash Redis Host
     - `REDIS_PASSWORD`: Upstash Redis Token
     - `REDIS_TLS`: `true`
   - 기타 필요한 환경 변수 설정 (SMTP, Slack 등)

5. **배포 확인**
   - 백엔드 Health Check: `https://your-backend.onrender.com/health`
   - 프론트엔드 접속: `https://your-frontend.onrender.com`

### 상세 배포 가이드

자세한 배포 절차는 [workflows/10-demo-deployment.md](workflows/10-demo-deployment.md) 문서를 참고하세요.

**포함 내용:**
- 단계별 배포 프로세스
- 환경 변수 설정 가이드
- 배포 후 검증 방법
- 문제 해결 팁
- Free tier 제한사항 및 해결책

### 배포 체크리스트

- [ ] Upstash Redis 데이터베이스 생성 완료
- [ ] Render PostgreSQL 데이터베이스 생성 완료
- [ ] 백엔드 Web Service 배포 완료
- [ ] 프론트엔드 Static Site 배포 완료
- [ ] 모든 환경 변수 설정 완료
- [ ] Health Check API 정상 응답 확인
- [ ] WebSocket 연결 "연결됨" 상태 확인
- [ ] 엔드포인트 생성 및 자동 헬스 체크 동작 확인

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

## 🎓 Learning Journey

### 프로젝트 배경

이 프로젝트는 AI 도구를 활용한 체계적인 소프트웨어 개발 방법론을 실험하고 검증하기 위해 시작되었습니다.

### 이전 시도 (Real-time Collaboration Tool)

**경험한 문제점:**

- AI 도구를 활용한 빠른 프로토타이핑 시도
- 명확한 컨텍스트 부재로 인한 할루시네이션 발생
- 일관성 없는 코드 구조와 패턴
- 테스트 커버리지 부족으로 인한 품질 저하
- 유지보수 어려움과 기술 부채 누적

**얻은 교훈:**

- 체계적인 접근의 필요성 인식
- 명확한 요구사항 정의의 중요성
- AI 도구의 한계와 올바른 활용 방법 학습

### 현재 프로젝트 (Vigil)

**Context Engineering 방법론 적용:**

1. **구조화된 문서 작성**
   - `docs/requirements.md`: 명확한 기능 요구사항
   - `docs/architecture.md`: 시스템 아키텍처 설계
   - `workflows/`: 단계별 구현 계획

2. **체계적인 개발 프로세스**
   - 워크플로우 기반 단계별 구현
   - 각 단계별 검증 및 테스트 작성
   - 코드 리뷰 및 리팩토링 사이클

3. **명확한 컨벤션 및 가이드**
   - `CLAUDE.md`: AI 도구를 위한 프로젝트 가이드
   - 코딩 스타일 가이드 및 네이밍 규칙
   - Git 커밋 메시지 규칙

**성과:**

- ✅ 안정적이고 유지보수 가능한 코드베이스
- ✅ 높은 테스트 커버리지 (99.5% 이상)
- ✅ 일관된 코드 품질 및 구조
- ✅ 명확한 개발 히스토리 및 문서화
- ✅ AI 할루시네이션 최소화

## ✨ Key Learnings

### Context Engineering의 핵심 원칙

1. **명확한 요구사항 문서화**
   - 기능 명세를 구체적으로 작성
   - Use Case 및 시나리오 정의
   - 성공 기준 및 검증 방법 명시

2. **프로젝트 구조 사전 정의**
   - 디렉토리 구조 및 모듈 분리
   - 네이밍 컨벤션 및 코딩 스타일
   - 아키텍처 패턴 및 설계 원칙

3. **단계별 구현 계획**
   - 워크플로우 기반 점진적 개발
   - 각 단계별 목표 및 완료 조건
   - 의존성 및 선후 관계 고려

4. **지속적인 검증**
   - 단위 테스트, 통합 테스트, E2E 테스트
   - 각 단계 완료 후 품질 확인
   - 리팩토링 및 개선 사이클

### AI 도구 활용 Best Practices

**효과적인 컨텍스트 제공:**

- 전체 프로젝트 구조 및 목표 공유
- 현재 작업의 위치 및 맥락 제공
- 기존 코드 패턴 및 컨벤션 참조

**할루시네이션 최소화 전략:**

- 명확하고 구체적인 요청
- 단계별로 나누어 작업 진행
- 생성된 코드의 즉각적인 검증
- 테스트 코드 우선 작성

**생산성 극대화:**

- 반복적인 작업 자동화
- 보일러플레이트 코드 생성
- 테스트 케이스 작성 지원
- 문서화 및 주석 개선

**품질 유지:**

- 코드 리뷰 프로세스 유지
- 테스트 커버리지 목표 설정
- 리팩토링 기회 식별 및 적용
- 기술 부채 관리

### 프로젝트를 통해 검증된 사실

1. **Context Engineering은 AI 도구의 효과를 극대화한다**
   - 명확한 컨텍스트 → 일관된 코드 생성
   - 구조화된 문서 → 할루시네이션 감소
   - 단계별 계획 → 예측 가능한 진행

2. **테스트 주도 개발은 AI와 잘 결합된다**
   - 테스트 케이스를 먼저 작성
   - AI가 테스트를 통과하는 코드 생성
   - 자동화된 품질 검증

3. **문서화는 투자 대비 높은 효과를 낸다**
   - 초기 문서 작성 시간 투자
   - 개발 과정에서 지속적인 참조
   - 유지보수 단계에서 큰 도움

4. **AI 도구는 보조 도구이지 대체재가 아니다**
   - 개발자의 설계 및 의사결정 필수
   - AI는 구현 및 반복 작업 지원
   - 최종 품질 책임은 개발자에게

---

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
