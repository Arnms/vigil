# Step 2: 엔드포인트 & 헬스 체크

**목표**: 엔드포인트 CRUD API 및 Bull Queue 기반 헬스 체크 시스템 구현
**기간**: Day 3-4
**상태**: ✅ 완료 (2025-10-20)

---

## 📋 워크플로우

### 1. Endpoint CRUD API 구현

**목표**: 엔드포인트 관리 API 개발

- [x] Endpoint 모듈 생성
  - `src/modules/endpoint/endpoint.module.ts`
  - `src/modules/endpoint/endpoint.controller.ts`
  - `src/modules/endpoint/endpoint.service.ts`

- [x] POST /api/endpoints (엔드포인트 등록)
  - Request body 검증 (class-validator)
  - 데이터베이스에 저장
  - 201 Created 응답

- [x] GET /api/endpoints (엔드포인트 목록 조회)
  - 페이지네이션 (page, limit)
  - 필터링 (status, isActive)
  - 정렬 (sortBy, order)

- [x] GET /api/endpoints/:id (엔드포인트 상세 조회)
  - 기본 정보 반환
  - 최근 24시간 통계 포함
  - 최근 인시던트 포함

- [x] PATCH /api/endpoints/:id (엔드포인트 수정)
  - 일부 필드 업데이트 지원
  - Bull Queue 재등록 필요 여부 판단

- [x] DELETE /api/endpoints/:id (엔드포인트 삭제)
  - Soft Delete 구현 (필요시 isDeleted 컬럼 추가)
  - 관련 큐 작업 제거

---

### 2. Bull Queue 설정 및 Processor 구현

**목표**: 백그라운드 작업 큐 구성 및 헬스 체크 프로세서 개발

- [x] Bull 의존성 설치
  ```
  npm install @nestjs/bull bull
  ```

- [x] BullModule 설정
  - `src/config/bull.config.ts`
  - Redis 연결 설정
  - 큐 이름 정의 (HEALTH_CHECK_QUEUE)

- [x] HealthCheck 모듈 생성
  - `src/modules/health-check/health-check.module.ts`
  - `src/modules/health-check/health-check.service.ts`
  - `src/modules/health-check/health-check.processor.ts`

- [x] Health Check Processor 구현
  - 엔드포인트별 HTTP 요청 전송
  - 응답 시간 측정
  - 결과 저장
  - 상태 업데이트

- [x] 정기 작업 스케줄링
  - 엔드포인트 등록 시 큐에 작업 추가
  - 설정된 간격(checkInterval)에 따라 반복 실행

---

### 3. 헬스 체크 로직 작성

**목표**: 실제 HTTP 요청 수행 및 결과 분석 로직 구현

- [x] HTTP 클라이언트 설정
  - @nestjs/axios 사용
  - 타임아웃 설정
  - 에러 처리

- [x] 체크 실행 로직
  - 설정된 URL로 HTTP 요청
  - 설정된 메소드, 헤더, 바디 사용
  - 응답 시간 측정
  - 응답 코드 및 타임아웃 확인

- [x] 상태 판정 로직 구현
  - UP 조건 확인
  - DOWN 조건 확인
  - DEGRADED 조건 확인
  - UNKNOWN 상태 처리

- [x] 에러 처리
  - 네트워크 오류 처리
  - DNS 해석 실패 처리
  - 타임아웃 처리
  - 예외 상황 로깅

---

### 4. 체크 결과 저장 및 상태 업데이트

**목표**: 체크 결과를 데이터베이스에 저장하고 엔드포인트 상태 업데이트

- [x] CheckResult 저장 로직
  - endpointId, status, responseTime, statusCode 저장
  - errorMessage 저장 (실패 시)
  - checkedAt 타임스탐프 저장

- [x] Endpoint 상태 업데이트
  - currentStatus 업데이트
  - lastResponseTime 업데이트
  - lastCheckedAt 업데이트
  - consecutiveFailures 카운트 업데이트

- [x] 인시던트 처리
  - DOWN 상태 감지 시 인시던트 생성
  - 기존 인시던트 상태 확인
  - 복구 시 인시던트 종료

- [ ] 데이터 정리 정책
  - 오래된 체크 결과 관리
  - 자동 삭제 로직 (추후 구현)

---

### 5. 수동 헬스 체크 API

**목표**: 즉시 헬스 체크를 수행하는 API 제공

- [x] POST /api/endpoints/:id/check (수동 체크)
  - 즉시 체크 실행
  - 결과 반환
  - 큐 우선순위 설정 (선택사항)

- [x] 테스트 전용 엔드포인트
  - GET /api/health/test (시스템 상태 확인)

---

## ✅ 완료 체크리스트

작업이 완료되었는지 확인합니다:

- [x] 모든 Endpoint CRUD API가 정상 작동하는가?

  ```bash
  # Postman/Thunder Client로 테스트
  POST /api/endpoints ✅
  GET /api/endpoints ✅
  GET /api/endpoints/:id ✅
  PATCH /api/endpoints/:id ✅
  DELETE /api/endpoints/:id ✅
  ```

  **테스트 결과**: endpoint.service.spec.ts - 6/6 통과 ✅

- [x] Bull Queue가 정상적으로 작동하는가?

  ```bash
  # Redis CLI에서 확인
  KEYS health_check:*
  ```

  **구현**: health-check.service.ts - scheduleHealthCheck() 정상 작동 ✅

- [x] 헬스 체크가 자동으로 실행되는가?
  - 엔드포인트 등록 후 설정된 간격에 따라 체크 실행 ✅
  - CheckResult 테이블에 데이터 저장 확인 ✅

- [x] 상태 판정 로직이 정확한가?
  - 성공, 실패, 타임아웃 케이스 테스트 ✅
  - **테스트 결과**: health-check.processor.spec.ts - 12/12 통과 ✅

- [x] Endpoint 상태가 정확하게 업데이트되는가?
  - currentStatus, lastResponseTime 확인 ✅

- [x] 인시던트가 정확하게 생성/종료되는가?
  - DOWN 상태 시 인시던트 생성 ✅
  - UP 상태 복구 시 인시던트 종료 ✅

---

## 📝 테스트 케이스

### 테스트 엔드포인트

```json
{
  "name": "Test API",
  "url": "https://httpbin.org/status/200",
  "method": "GET",
  "checkInterval": 10,
  "expectedStatusCode": 200,
  "timeoutThreshold": 5000
}
```

### 테스트 시나리오

1. **정상 상태 (UP)**
   - 엔드포인트 등록
   - 헬스 체크 실행
   - currentStatus가 UP으로 설정되는지 확인

2. **장애 상태 (DOWN)**
   - 존재하지 않는 URL로 엔드포인트 등록
   - 3회 연속 실패 후 DOWN 상태 확인
   - 인시던트 생성 확인

3. **성능 저하 (DEGRADED)**
   - 느린 응답 시간을 반환하는 엔드포인트
   - DEGRADED 상태 확인

---

## 🔗 관련 문서

- [FEATURE_SPECIFICATIONS.md](../docs/FEATURE_SPECIFICATIONS.md) - 기능 명세
- [API_SPECIFICATIONS.md](../docs/API_SPECIFICATIONS.md) - API 명세

## 📚 참고 자료

- [Bull 공식 문서](https://github.com/OptimalBits/bull)
- [NestJS Bull 통합](https://docs.nestjs.com/techniques/queues)

## ➡️ 다음 단계

→ [03-notification-system.md](./03-notification-system.md)

**다음 단계 내용**:
- Notification 모듈 구현
- 이메일 전송 (Nodemailer)
- Slack 웹훅 통합
- 중복 알림 방지 로직
