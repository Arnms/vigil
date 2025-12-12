# Step 10: 데모 버전 배포 (Render.com + Upstash Redis)

**목표**: Vigil 애플리케이션을 무료 플랫폼에 배포하여 데모 가능한 상태로 만들기
**플랫폼**: Render.com (Web Services + PostgreSQL) + Upstash Redis
**상태**: ⏳ 준비 중

---

## 📋 배포 전략

### 선택한 플랫폼

**Render.com**
- ✅ **완전 무료** (Free tier)
- ✅ GitHub 자동 배포 지원
- ✅ 무료 PostgreSQL 데이터베이스 (90일 후 만료, 재생성 가능)
- ✅ 자동 HTTPS 제공
- ✅ 환경 변수 관리 UI
- ⚠️ **제한사항**: 15분 비활성화 시 스핀다운, 콜드 스타트 발생

**Upstash Redis**
- ✅ **완전 무료** (Free tier)
- ✅ 10,000 commands/day
- ✅ 256MB 스토리지
- ✅ REST API 지원
- ✅ Bull Queue 및 캐싱에 충분

---

## 🚀 배포 단계

### Phase 1: Upstash Redis 설정

#### 1.1 Upstash 계정 생성
1. [Upstash Console](https://console.upstash.com/) 접속
2. GitHub 계정으로 로그인
3. 무료 계정 생성

#### 1.2 Redis 데이터베이스 생성
1. Console에서 "Create Database" 클릭
2. 설정:
   - **Name**: vigil-redis-demo
   - **Type**: Regional
   - **Region**: 가장 가까운 지역 선택 (예: Asia-Pacific - Seoul)
   - **Eviction**: No eviction (캐시 유지)
3. "Create" 클릭

#### 1.3 연결 정보 확인
생성된 데이터베이스 페이지에서 다음 정보 복사:
```
UPSTASH_REDIS_REST_URL=https://[your-id].upstash.io
UPSTASH_REDIS_REST_TOKEN=[your-token]
```

**Note**: Render.com에서는 REST API 방식 대신 일반 Redis 연결도 가능합니다.
- **Host**: `[your-id].upstash.io`
- **Port**: `6379`
- **Password**: REST Token과 동일

---

### Phase 2: Render.com 설정

#### 2.1 Render 계정 생성
1. [Render.com](https://render.com/) 접속
2. "Get Started for Free" 클릭
3. GitHub 계정으로 로그인
4. Repository 접근 권한 허용

#### 2.2 PostgreSQL 데이터베이스 생성
1. Dashboard에서 "New +" → "PostgreSQL" 선택
2. 설정:
   - **Name**: vigil-postgres-demo
   - **Database**: vigil
   - **User**: vigil_user (자동 생성)
   - **Region**: 백엔드와 동일한 지역 선택 (Singapore 권장)
   - **Plan**: Free
3. "Create Database" 클릭
4. 생성 완료 후 "Internal Database URL" 복사:
   ```
   postgresql://vigil_user:[password]@[host]/vigil
   ```

#### 2.3 백엔드 Web Service 생성

1. Dashboard에서 "New +" → "Web Service" 선택
2. GitHub Repository 연결:
   - Repository: `your-username/vigil`
   - Branch: `main`
3. 설정:
   - **Name**: vigil-backend-demo
   - **Region**: Singapore (또는 가까운 지역)
   - **Branch**: main
   - **Root Directory**: `backend`
   - **Runtime**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start:prod`
   - **Plan**: Free
4. "Advanced" → Environment Variables 설정:

```bash
NODE_ENV=production
PORT=3000

# Database (Render PostgreSQL)
DATABASE_URL=[Render PostgreSQL Internal URL]
DATABASE_HOST=[추출: host]
DATABASE_PORT=5432
DATABASE_USER=[추출: user]
DATABASE_PASSWORD=[추출: password]
DATABASE_NAME=vigil

# Redis (Upstash)
REDIS_HOST=[Upstash Redis Host]
REDIS_PORT=6379
REDIS_PASSWORD=[Upstash Redis Password/Token]
REDIS_TLS=true

# SMTP (데모용 - 실제 이메일 발송 비활성화 가능)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=demo@example.com
SMTP_PASS=demo-password
SMTP_FROM=noreply@vigil-demo.com

# Slack (선택사항 - 데모용)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL

# CORS
CORS_ORIGIN=https://vigil-frontend-demo.onrender.com
```

5. "Create Web Service" 클릭

#### 2.4 프론트엔드 Static Site 생성

**Option 1: Static Site (권장)**
1. Dashboard에서 "New +" → "Static Site" 선택
2. GitHub Repository 연결 (동일 저장소)
3. 설정:
   - **Name**: vigil-frontend-demo
   - **Branch**: main
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
4. Environment Variables:
```bash
VITE_API_BASE_URL=https://vigil-backend-demo.onrender.com
VITE_WS_URL=https://vigil-backend-demo.onrender.com
```
5. "Create Static Site" 클릭

**Option 2: Web Service (Docker Nginx - 현재 설정 유지)**
1. Dashboard에서 "New +" → "Web Service" 선택
2. 설정:
   - **Name**: vigil-frontend-demo
   - **Root Directory**: `frontend`
   - **Runtime**: Docker
   - **Dockerfile Path**: `frontend/Dockerfile`
3. Environment Variables: 동일

---

### Phase 3: 환경 변수 설정 세부사항

#### 백엔드 필수 환경 변수

```bash
# ===== 기본 설정 =====
NODE_ENV=production
PORT=3000

# ===== 데이터베이스 (Render PostgreSQL) =====
# Internal Database URL에서 추출
DATABASE_URL=postgresql://vigil_user:password@hostname/vigil
DATABASE_HOST=hostname.oregon-postgres.render.com
DATABASE_PORT=5432
DATABASE_USER=vigil_user
DATABASE_PASSWORD=your-password
DATABASE_NAME=vigil

# ===== Redis (Upstash) =====
REDIS_HOST=your-id.upstash.io
REDIS_PORT=6379
REDIS_PASSWORD=your-upstash-token
REDIS_TLS=true  # Upstash는 TLS 필수

# ===== CORS =====
CORS_ORIGIN=https://vigil-frontend-demo.onrender.com

# ===== SMTP (선택사항 - 데모에서는 비활성화 가능) =====
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@vigil-demo.com

# ===== Slack (선택사항) =====
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/XXX/YYY/ZZZ
```

#### 프론트엔드 필수 환경 변수

```bash
VITE_API_BASE_URL=https://vigil-backend-demo.onrender.com
VITE_WS_URL=https://vigil-backend-demo.onrender.com
```

---

### Phase 4: 배포 후 검증

#### 4.1 백엔드 Health Check
```bash
curl https://vigil-backend-demo.onrender.com/health
# 예상 응답: {"status":"ok","database":"connected","redis":"connected"}
```

#### 4.2 프론트엔드 접속
1. 브라우저에서 `https://vigil-frontend-demo.onrender.com` 접속
2. 대시보드 표시 확인
3. WebSocket 연결 상태 "연결됨" 확인

#### 4.3 기능 테스트
1. **엔드포인트 생성**:
   - "엔드포인트" 메뉴 → "새 엔드포인트" 클릭
   - 테스트 엔드포인트 추가 (예: `https://httpstat.us/200`)
   - 저장 후 목록에 표시 확인

2. **자동 헬스 체크**:
   - 1분 대기 후 체크 결과 확인
   - 상태 변경 시 WebSocket 실시간 업데이트 확인

3. **통계 확인**:
   - 대시보드에서 응답시간 차트 확인
   - 가동률 차트 확인

---

## 🔧 코드 수정 사항

### 백엔드 코드 수정

#### redis.config.ts - Upstash TLS 지원
```typescript
// backend/src/config/redis.config.ts
import { ConfigService } from '@nestjs/config';

export const redisConfig = (configService: ConfigService) => ({
  host: configService.get<string>('REDIS_HOST', 'localhost'),
  port: configService.get<number>('REDIS_PORT', 6379),
  password: configService.get<string>('REDIS_PASSWORD'),
  // Upstash는 TLS 필수
  tls: configService.get<string>('REDIS_TLS') === 'true'
    ? {}
    : undefined,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});
```

#### database.config.ts - SSL 설정
```typescript
// backend/src/config/database.config.ts
export const databaseConfig = (configService: ConfigService): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: configService.get<string>('DATABASE_HOST'),
  port: configService.get<number>('DATABASE_PORT', 5432),
  username: configService.get<string>('DATABASE_USER'),
  password: configService.get<string>('DATABASE_PASSWORD'),
  database: configService.get<string>('DATABASE_NAME'),
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  synchronize: configService.get<string>('NODE_ENV') === 'development',
  // Render PostgreSQL은 SSL 필요
  ssl: configService.get<string>('NODE_ENV') === 'production'
    ? { rejectUnauthorized: false }
    : false,
  logging: configService.get<string>('NODE_ENV') === 'development',
});
```

### 프론트엔드 코드 수정

#### vite.config.ts - 환경 변수 처리
```typescript
// frontend/vite.config.ts
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: mode === 'development' ? {
        '/api': {
          target: env.VITE_API_BASE_URL || 'http://localhost:3000',
          changeOrigin: true,
        },
      } : undefined,
    },
    define: {
      'process.env.VITE_API_BASE_URL': JSON.stringify(
        env.VITE_API_BASE_URL || 'http://localhost:3000'
      ),
      'process.env.VITE_WS_URL': JSON.stringify(
        env.VITE_WS_URL || 'http://localhost:3000'
      ),
    },
  }
})
```

---

## 📝 배포 체크리스트

### 준비 단계
- [ ] Upstash Redis 데이터베이스 생성 완료
- [ ] Upstash 연결 정보 확인 (Host, Port, Password)
- [ ] Render 계정 생성 및 GitHub 연동 완료
- [ ] 코드에 Redis TLS 설정 추가
- [ ] 코드에 PostgreSQL SSL 설정 추가

### 데이터베이스 설정
- [ ] Render PostgreSQL 데이터베이스 생성
- [ ] Internal Database URL 복사
- [ ] 연결 정보 추출 (Host, User, Password, Database)

### 백엔드 배포
- [ ] Render Web Service 생성 (backend)
- [ ] Build/Start 명령어 설정
- [ ] 모든 환경 변수 입력
- [ ] 배포 완료 및 로그 확인
- [ ] Health check API 테스트 성공

### 프론트엔드 배포
- [ ] Render Static Site 생성 (frontend)
- [ ] Build 명령어 및 Publish Directory 설정
- [ ] 환경 변수 입력 (API URL, WS URL)
- [ ] 배포 완료 확인
- [ ] 브라우저에서 접속 테스트

### 통합 테스트
- [ ] 프론트엔드에서 백엔드 API 호출 성공
- [ ] WebSocket 연결 "연결됨" 상태 확인
- [ ] 엔드포인트 생성 테스트
- [ ] 자동 헬스 체크 동작 확인
- [ ] 실시간 업데이트 확인
- [ ] 대시보드 차트 표시 확인

---

## ⚠️ 알려진 제한사항 및 해결책

### Free Tier 제한사항

**Render.com**
1. **15분 비활성화 시 스핀다운**
   - 문제: 첫 요청 시 콜드 스타트 (30초~1분 소요)
   - 해결: 데모 시작 전 미리 접속하여 웜업

2. **PostgreSQL 90일 제한**
   - 문제: 90일 후 데이터베이스 만료
   - 해결: 만료 전 새 데이터베이스 생성 및 마이그레이션

3. **동시 빌드 제한**
   - 문제: 프론트엔드/백엔드 동시 배포 시 대기
   - 해결: 순차적 배포 (백엔드 먼저 → 프론트엔드)

**Upstash Redis**
1. **10,000 commands/day 제한**
   - 영향: 헬스 체크 1분 간격 시 충분 (약 1,440 checks/day)
   - 모니터: Upstash Console에서 사용량 확인

### 성능 최적화

1. **Redis 캐싱 활성화**
   - 통계 API 결과 5분 캐싱
   - 반복 조회 시 성능 향상

2. **헬스 체크 간격 조정**
   - 개발: 30초
   - 데모: 1~2분 (리소스 절약)

3. **데이터베이스 연결 풀**
   - 최대 10 연결 (Free tier 제한)

---

## 🔗 유용한 링크

- [Render.com Documentation](https://render.com/docs)
- [Upstash Redis Documentation](https://docs.upstash.com/redis)
- [Render PostgreSQL Guide](https://render.com/docs/databases)
- [Deploying Node.js Apps on Render](https://render.com/docs/deploy-node-express-app)

---

## 📊 예상 배포 URL

배포 완료 후 다음 URL로 접속 가능:

- **Frontend**: `https://vigil-frontend-demo.onrender.com`
- **Backend API**: `https://vigil-backend-demo.onrender.com`
- **Health Check**: `https://vigil-backend-demo.onrender.com/health`

---

## ➡️ 다음 단계

1. Upstash Redis 설정 완료
2. 코드에 TLS/SSL 설정 추가
3. Render.com에서 서비스 생성
4. 환경 변수 설정
5. 배포 및 테스트
6. 데모 URL 공유

---

**작성일**: 2025-12-12
**상태**: 준비 중
**담당**: Claude Code
