# Step 3 통합 테스트 가이드 (Phase 6)

**작성일**: 2025-10-21
**상태**: 테스트 가이드
**대상**: NotificationChannel API 및 알림 기능 검증

---

## 📋 테스트 항목 체크리스트

### 1️⃣ NotificationChannel CRUD API 테스트

#### 1.1 채널 생성 (POST /api/notification-channels)

**이메일 채널 생성:**
```bash
curl -X POST http://localhost:3000/api/notification-channels \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Email Alert Channel",
    "type": "email",
    "config": {
      "recipients": ["admin@example.com", "ops@example.com"]
    }
  }'
```

**기대 결과:**
- ✅ Status: 201 Created
- ✅ Response: channel ID, name, type, isActive: true

**Slack 채널 생성:**
```bash
curl -X POST http://localhost:3000/api/notification-channels \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Slack Alert Channel",
    "type": "slack",
    "config": {
      "webhookUrl": "https://hooks.slack.com/services/YOUR/WEBHOOK/URL",
      "channel": "#alerts",
      "username": "Vigil Bot"
    }
  }'
```

**기대 결과:**
- ✅ Status: 201 Created
- ✅ isActive: true

---

#### 1.2 채널 목록 조회 (GET /api/notification-channels)

**기본 조회:**
```bash
curl http://localhost:3000/api/notification-channels
```

**기대 결과:**
- ✅ Status: 200 OK
- ✅ data: 채널 배열
- ✅ meta: { total, page, limit, totalPages }

**필터링 테스트:**
```bash
# 이메일 채널만 조회
curl "http://localhost:3000/api/notification-channels?type=email"

# 활성화된 채널만 조회
curl "http://localhost:3000/api/notification-channels?isActive=true"

# 페이지네이션
curl "http://localhost:3000/api/notification-channels?page=1&limit=10"
```

**기대 결과:**
- ✅ 필터 조건에 맞는 채널만 반환
- ✅ 페이지네이션 적용

---

#### 1.3 채널 상세 조회 (GET /api/notification-channels/:id)

```bash
curl http://localhost:3000/api/notification-channels/{channel-id}
```

**기대 결과:**
- ✅ Status: 200 OK
- ✅ 채널의 전체 정보 반환

**에러 케이스:**
```bash
curl http://localhost:3000/api/notification-channels/invalid-id
```

**기대 결과:**
- ✅ Status: 404 Not Found
- ✅ 에러 메시지: "Notification channel not found"

---

#### 1.4 채널 수정 (PATCH /api/notification-channels/:id)

```bash
curl -X PATCH http://localhost:3000/api/notification-channels/{channel-id} \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Channel Name",
    "config": {
      "recipients": ["newemail@example.com"]
    }
  }'
```

**기대 결과:**
- ✅ Status: 200 OK
- ✅ 수정된 채널 정보 반환

---

#### 1.5 채널 삭제 (DELETE /api/notification-channels/:id)

```bash
curl -X DELETE http://localhost:3000/api/notification-channels/{channel-id}
```

**기대 결과:**
- ✅ Status: 200 OK
- ✅ 성공 메시지 반환
- ✅ isActive: false로 변경 (Soft Delete)

---

### 2️⃣ 테스트 알림 전송 (POST /api/notification-channels/:id/test)

#### 2.1 이메일 테스트 알림

```bash
curl -X POST http://localhost:3000/api/notification-channels/{email-channel-id}/test
```

**기대 결과:**
- ✅ Status: 200 OK
- ✅ Response: { success: true, message: "Test notification sent successfully" }
- ✅ 실제 이메일이 설정된 수신자에게 전송됨

**환경 변수 확인:**
```bash
# .env 파일에 다음이 설정되어 있는지 확인
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

#### 2.2 Slack 테스트 알림

```bash
curl -X POST http://localhost:3000/api/notification-channels/{slack-channel-id}/test
```

**기대 결과:**
- ✅ Status: 200 OK
- ✅ Response: { success: true, message: "Test notification sent successfully" }
- ✅ Slack 채널에 테스트 메시지가 나타남
- ✅ 메시지 포맷: Header + 엔드포인트명 + 상태 + 세부정보

---

### 3️⃣ 중복 알림 방지 테스트

**시나리오:**
1. 첫 번째 알림 전송 (시간: T=0초)
2. 5초 후 같은 상태 변경 시도 (시간: T=5초)
3. 5분 이후 재전송 시도 (시간: T=300초)

**기대 결과:**
- ✅ T=0초: 알림 전송 ✅
- ✅ T=5초: 알림 스킵 (중복 방지)
- ✅ T=300초: 알림 재전송 ✅ (캐시 만료)

---

### 4️⃣ 엔드포인트 상태 변경 알림 통합 테스트

#### 4.1 테스트 엔드포인트 생성

```bash
curl -X POST http://localhost:3000/api/endpoints \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test API for Alerts",
    "url": "https://httpstat.us/200",
    "method": "GET",
    "checkInterval": 30,
    "expectedStatusCode": 200,
    "timeoutThreshold": 5000
  }'
```

**기대 결과:**
- ✅ 엔드포인트 생성 성공
- ✅ currentStatus: UNKNOWN

#### 4.2 DOWN 감지 시 알림 발송 테스트

**단계 1: 실패하는 엔드포인트 생성**
```bash
curl -X POST http://localhost:3000/api/endpoints \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Failing API",
    "url": "https://httpstat.us/500",
    "method": "GET",
    "checkInterval": 30,
    "expectedStatusCode": 200,
    "timeoutThreshold": 5000
  }'
```

**단계 2: 헬스 체크 대기**
- 약 30초 대기 (checkInterval: 30초)

**단계 3: 알림 확인**
- ✅ 이메일: admin@example.com에 받음
  - 제목: "🔴 [Vigil] Failing API - DOWN"
  - 내용: 엔드포인트명, 상태, URL, 에러 메시지 포함

- ✅ Slack: 설정된 채널에 나타남
  - Header: "🔴 API 장애 발생"
  - 엔드포인트명, 상태, 세부정보 포함

#### 4.3 복구 시 알림 발송 테스트

**단계 1: 성공하는 엔드포인트로 복구**
```bash
curl -X PATCH http://localhost:3000/api/endpoints/{endpoint-id} \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://httpstat.us/200"
  }'
```

**단계 2: 헬스 체크 대기**
- 약 30초 대기

**단계 3: 복구 알림 확인**
- ✅ 이메일: admin@example.com에 받음
  - 제목: "🟢 [Vigil] Failing API - UP"
  - 내용: 복구 상태 확인

- ✅ Slack: 설정된 채널에 나타남
  - Header: "🟢 API 복구됨"
  - 복구 상태 확인

---

### 5️⃣ 에러 처리 테스트

#### 5.1 설정되지 않은 SMTP로 이메일 전송

**시나리오:** SMTP 설정이 없는 상태에서 테스트 알림 전송

```bash
curl -X POST http://localhost:3000/api/notification-channels/{email-channel-id}/test
```

**기대 결과:**
- ✅ Status: 200 OK
- ✅ Response: { success: false, message: "Failed to send test notification: ..." }
- ❌ 알림 전송 실패 (SMTP 에러)

#### 5.2 잘못된 Slack 웹훅 URL

**시나리오:** 유효하지 않은 웹훅 URL로 테스트 알림 전송

**기대 결과:**
- ✅ Status: 200 OK
- ✅ Response: { success: false, message: "Failed to send test notification: ..." }

#### 5.3 채널 설정 누락

**잘못된 이메일 채널:**
```bash
curl -X POST http://localhost:3000/api/notification-channels \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Invalid Email",
    "type": "email",
    "config": {}
  }'
```

**테스트 전송:**
```bash
curl -X POST http://localhost:3000/api/notification-channels/{channel-id}/test
```

**기대 결과:**
- ✅ 알림 전송 실패 (recipients 누락)
- ✅ 에러 로그에 "No email recipients configured" 메시지

---

## 📊 테스트 결과 기록

### 테스트 환경
- **Server**: http://localhost:3000
- **Database**: PostgreSQL (docker-compose)
- **Redis**: Redis (docker-compose)
- **Node Version**: v18+
- **Date**: 2025-10-21

### 테스트 체크리스트

- [ ] 1.1 채널 생성 (이메일)
- [ ] 1.2 채널 생성 (Slack)
- [ ] 1.3 채널 목록 조회
- [ ] 1.4 채널 필터링 (type)
- [ ] 1.5 채널 필터링 (isActive)
- [ ] 1.6 채널 페이지네이션
- [ ] 1.7 채널 상세 조회
- [ ] 1.8 채널 상세 조회 (404 에러)
- [ ] 1.9 채널 수정
- [ ] 1.10 채널 삭제
- [ ] 2.1 이메일 테스트 알림
- [ ] 2.2 Slack 테스트 알림
- [ ] 3.1 중복 방지 (5분 TTL)
- [ ] 4.1 DOWN 감지 알림 (이메일)
- [ ] 4.2 DOWN 감지 알림 (Slack)
- [ ] 4.3 UP 복구 알림 (이메일)
- [ ] 4.4 UP 복구 알림 (Slack)
- [ ] 5.1 SMTP 에러 처리
- [ ] 5.2 Slack 웹훅 에러 처리
- [ ] 5.3 채널 설정 누락 처리

---

## 🔧 로컬 테스트 환경 세팅

### .env 파일 설정 (이메일)

```env
# Gmail 기준
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
MAIL_FROM_NAME=Vigil
MAIL_FROM_ADDRESS=alerts@vigil.com

# 또는 Mailtrap 등 테스트 SMTP 서비스 사용
```

### .env 파일 설정 (Slack)

```env
# Slack Incoming Webhook
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

### Docker 서비스 실행

```bash
cd d:\Workspace\vigil
docker-compose up -d
```

### 애플리케이션 실행

```bash
cd backend
npm run start:dev
```

---

## 📝 주의사항

1. **Gmail 앱 비밀번호**: 2단계 인증 활성화 후 앱 비밀번호 생성 필요
2. **Slack 웹훅**: 테스트 완료 후 웹훅 URL 비활성화 권장
3. **중복 방지 TTL**: 현재 메모리 기반 (500ms 주기로 만료된 키 정리)
4. **테스트 이메일**: 실제 메일박스 사용 (Gmail 등)

---

## ✅ 검증 기준

모든 항목이 완료되면 **Step 3 (알림 시스템)이 성공적으로 구현**된 것입니다.

**다음 단계**: Step 4 (통계 API & 최적화)

---

**최종 업데이트**: 2025-10-21
**상태**: 테스트 가이드 완성
