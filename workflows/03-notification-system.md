# Step 3: 알림 시스템

**목표**: 다양한 채널을 통한 알림 전송 시스템 구현
**기간**: Day 5-6
**상태**: ⏳ 대기

---

## 📋 워크플로우

### 1. Notification 모듈 구현

**목표**: 알림 시스템의 기본 구조 구성

- [ ] Notification 모듈 생성
  - `src/modules/notification/notification.module.ts`
  - `src/modules/notification/notification.service.ts`
  - `src/modules/notification/notification.controller.ts`

- [ ] NotificationChannel 관리 API
  - POST /api/notification-channels (채널 등록)
  - GET /api/notification-channels (채널 목록)
  - PATCH /api/notification-channels/:id (채널 수정)
  - DELETE /api/notification-channels/:id (채널 삭제)

- [ ] Strategy Pattern 구현
  - `src/modules/notification/strategies/notification.strategy.ts`
  - `src/modules/notification/strategies/email.strategy.ts`
  - `src/modules/notification/strategies/slack.strategy.ts`

---

### 2. 이메일 알림 구현

**목표**: Nodemailer를 이용한 이메일 알림 전송

- [ ] Nodemailer 의존성 설치
  ```
  npm install nodemailer
  npm install --save-dev @types/nodemailer
  ```

- [ ] 이메일 설정
  - `src/config/mail.config.ts`
  - SMTP 설정 (환경 변수에서 로드)
  - 발신자 정보 설정

- [ ] EmailNotificationStrategy 구현
  - 이메일 템플릿 생성 또는 간단한 HTML 구성
  - 이메일 제목 생성 (예: "[Vigil] API서버 - DOWN")
  - 이메일 본문 작성 (엔드포인트명, 발생시간, 상태, 에러 메시지)
  - 수신자 관리

- [ ] 이메일 전송 로직
  - 동기/비동기 전송 고려
  - 재시도 로직 (최대 3회)
  - 전송 실패 로깅

---

### 3. Slack 웹훅 통합

**목표**: Slack을 통한 알림 전송

- [ ] Slack API 클라이언트 설정
  - 웹훅 URL 관리
  - HTTP 클라이언트 사용

- [ ] SlackNotificationStrategy 구현
  - 메시지 포맷 정의 (Block Kit 사용)
  - 상태에 따른 색상 구분 (🔴 DOWN, 🟢 UP, 🟡 DEGRADED)
  - 엔드포인트 정보 포함
  - 대시보드 링크 포함

- [ ] Slack 메시지 전송 로직
  - POST 요청 수행
  - 응답 코드 확인 (200, 201)
  - 실패 시 재시도 또는 로깅

---

### 4. 중복 알림 방지

**목표**: Redis를 이용한 중복 알림 방지

- [ ] Redis 캐싱 전략 설계
  - 키 형식: `alert:{endpointId}:{status}`
  - TTL: 300초 (5분)

- [ ] 알림 전송 전 확인 로직
  ```
  1. Redis에서 키 확인
  2. 키가 존재하면 알림 스킵
  3. 키가 없으면 알림 전송
  4. 알림 전송 후 Redis에 키 저장 (TTL 설정)
  ```

- [ ] 중복 방지 서비스 구현
  - `src/modules/notification/services/duplicate-prevention.service.ts`
  - check 메서드 (이미 알림 전송 여부 확인)
  - mark 메서드 (알림 전송 기록)

---

### 5. 알림 트리거 연결

**목표**: 상태 변경 시 자동으로 알림 전송

- [ ] Endpoint 상태 변경 감지
  - DOWN 상태 전환 시 알림
  - UP 상태로 복구 시 알림
  - DEGRADED 상태 감지 시 알림 (선택사항)

- [ ] 이벤트 기반 알림 발송
  - 상태 변경 이벤트 구독
  - NotificationService.send() 호출
  - 여러 채널로 동시 전송

- [ ] 알림 기록 저장 (선택사항)
  - `src/modules/notification/entities/notification-log.entity.ts`
  - 전송 시간, 채널, 성공/실패 기록

---

## ✅ 완료 체크리스트

작업이 완료되었는지 확인합니다:

- [ ] NotificationChannel API가 정상 작동하는가?
  ```bash
  POST /api/notification-channels
  GET /api/notification-channels
  ```

- [ ] 이메일 알림이 정상 작동하는가?
  - 테스트 이메일 주소로 전송
  - 제목, 본문 형식 확인

- [ ] Slack 알림이 정상 작동하는가?
  - Slack 채널에서 메시지 수신
  - 메시지 형식 확인

- [ ] 중복 알림 방지가 작동하는가?
  - 5분 내에 같은 알림이 여러 번 전송되지 않음
  - 5분 후에는 새로운 알림 전송됨

- [ ] 상태 변경 시 알림이 자동 전송되는가?
  - 엔드포인트가 DOWN 상태로 변경 시 알림
  - DOWN에서 UP으로 복구 시 알림
  - 모든 설정된 채널로 알림 전송

- [ ] 알림 실패 시 로깅이 정상 작동하는가?
  - Winston 로거 사용
  - 실패 원인 기록

---

## 📝 환경 변수 추가

```env
# Email (Gmail 예시)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
MAIL_FROM_ADDRESS=alerts@vigil.com
MAIL_FROM_NAME=Vigil Alert

# Slack
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL

# 테스트 이메일
TEST_EMAIL=test@example.com
```

---

## 🧪 테스트 시나리오

### 이메일 전송 테스트
1. 테스트 이메일 채널 생성
2. 엔드포인트를 DOWN 상태로 변경
3. 테스트 이메일 주소로 알림 수신 확인

### Slack 알림 테스트
1. Slack 웹훅 URL 설정
2. 엔드포인트를 DOWN 상태로 변경
3. Slack 채널에서 알림 메시지 수신 확인

### 중복 방지 테스트
1. 첫 번째 알림 전송
2. 5초 후 같은 상태 변경 시도
3. 알림이 전송되지 않음 확인
4. 5분 후 같은 상태 변경
5. 새로운 알림 전송 확인

---

## 🔗 관련 문서

- [FEATURE_SPECIFICATIONS.md](../docs/FEATURE_SPECIFICATIONS.md#4-알림-시스템) - 알림 시스템 명세
- [API_SPECIFICATIONS.md](../docs/API_SPECIFICATIONS.md#5-알림-채널-api) - 알림 채널 API

## 📚 참고 자료

- [Nodemailer 공식 문서](https://nodemailer.com/)
- [Slack Incoming Webhooks](https://api.slack.com/messaging/webhooks)
- [Strategy Pattern](https://refactoring.guru/design-patterns/strategy)

## ➡️ 다음 단계

→ [04-statistics-api.md](./04-statistics-api.md)

**다음 단계 내용**:
- Statistics 모듈 구현
- 가동률, 응답 시간 통계 API
- 인시던트 히스토리 API
- 쿼리 최적화 및 인덱스 추가
