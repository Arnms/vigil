# API 명세서

## 개요

- **Base URL**: `http://localhost:3000/api`
- **Content-Type**: `application/json`
- **API Version**: v1

---

## 1. 엔드포인트 관리 API

### 1.1 엔드포인트 등록

새로운 모니터링 엔드포인트를 등록합니다.

**요청**

```http
POST /api/endpoints
Content-Type: application/json
```

**Request Body**

```json
{
  "name": "Example API",
  "url": "https://api.example.com/health",
  "method": "GET",
  "headers": {
    "Authorization": "Bearer token123",
    "Accept": "application/json"
  },
  "body": null,
  "checkInterval": 60,
  "expectedStatusCode": 200,
  "timeoutThreshold": 5000
}
```

**Request Parameters**

| 필드 | 타입 | 필수 | 설명 | 기본값 |
|------|------|------|------|--------|
| name | string | O | 엔드포인트 이름 | - |
| url | string | O | 모니터링할 URL | - |
| method | string | O | HTTP 메소드 (GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS) | GET |
| headers | object | X | HTTP 헤더 | null |
| body | object | X | 요청 바디 (JSON) | null |
| checkInterval | number | O | 체크 간격(초) | 60 |
| expectedStatusCode | number | O | 예상 응답 코드 | 200 |
| timeoutThreshold | number | O | 타임아웃(ms) | 5000 |

**Response (201 Created)**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Example API",
  "url": "https://api.example.com/health",
  "method": "GET",
  "headers": {
    "Authorization": "Bearer token123",
    "Accept": "application/json"
  },
  "body": null,
  "checkInterval": 60,
  "expectedStatusCode": 200,
  "timeoutThreshold": 5000,
  "isActive": true,
  "currentStatus": "UNKNOWN",
  "lastResponseTime": null,
  "lastCheckedAt": null,
  "consecutiveFailures": 0,
  "createdAt": "2025-10-16T12:00:00.000Z",
  "updatedAt": "2025-10-16T12:00:00.000Z"
}
```

**Error Responses**

```json
// 400 Bad Request - 잘못된 URL 형식
{
  "statusCode": 400,
  "message": "Invalid URL format",
  "error": "Bad Request"
}

// 400 Bad Request - 필수 필드 누락
{
  "statusCode": 400,
  "message": ["name should not be empty", "url must be a URL address"],
  "error": "Bad Request"
}
```

---

### 1.2 엔드포인트 목록 조회

등록된 모든 엔드포인트를 조회합니다.

**요청**

```http
GET /api/endpoints?page=1&limit=20&status=UP&isActive=true&sortBy=name&order=ASC
```

**Query Parameters**

| 필드 | 타입 | 필수 | 설명 | 기본값 |
|------|------|------|------|--------|
| page | number | X | 페이지 번호 | 1 |
| limit | number | X | 페이지당 항목 수 | 20 |
| status | string | X | 상태 필터 (UP, DOWN, DEGRADED, UNKNOWN) | - |
| isActive | boolean | X | 활성화 여부 필터 | - |
| sortBy | string | X | 정렬 기준 (name, createdAt, lastCheckedAt) | createdAt |
| order | string | X | 정렬 순서 (ASC, DESC) | DESC |

**Response (200 OK)**

```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Example API",
      "url": "https://api.example.com/health",
      "method": "GET",
      "currentStatus": "UP",
      "lastResponseTime": 123,
      "lastCheckedAt": "2025-10-16T12:00:00.000Z",
      "isActive": true,
      "createdAt": "2025-10-16T11:00:00.000Z"
    }
  ],
  "meta": {
    "total": 42,
    "page": 1,
    "limit": 20,
    "totalPages": 3
  }
}
```

---

### 1.3 엔드포인트 상세 조회

특정 엔드포인트의 상세 정보를 조회합니다.

**요청**

```http
GET /api/endpoints/:id
```

**Path Parameters**

| 필드 | 타입 | 설명 |
|------|------|------|
| id | string (UUID) | 엔드포인트 ID |

**Response (200 OK)**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Example API",
  "url": "https://api.example.com/health",
  "method": "GET",
  "headers": {
    "Authorization": "Bearer token123"
  },
  "body": null,
  "checkInterval": 60,
  "expectedStatusCode": 200,
  "timeoutThreshold": 5000,
  "isActive": true,
  "currentStatus": "UP",
  "lastResponseTime": 123,
  "lastCheckedAt": "2025-10-16T12:00:00.000Z",
  "consecutiveFailures": 0,
  "createdAt": "2025-10-16T11:00:00.000Z",
  "updatedAt": "2025-10-16T11:30:00.000Z",
  "statistics": {
    "uptime24h": 99.5,
    "totalChecks24h": 1440,
    "avgResponseTime24h": 145
  },
  "recentIncidents": [
    {
      "id": "incident-uuid",
      "startedAt": "2025-10-15T10:00:00.000Z",
      "resolvedAt": "2025-10-15T10:05:00.000Z",
      "duration": 300000
    }
  ]
}
```

**Error Responses**

```json
// 404 Not Found
{
  "statusCode": 404,
  "message": "Endpoint not found",
  "error": "Not Found"
}
```

---

### 1.4 엔드포인트 수정

엔드포인트 정보를 수정합니다.

**요청**

```http
PATCH /api/endpoints/:id
Content-Type: application/json
```

**Path Parameters**

| 필드 | 타입 | 설명 |
|------|------|------|
| id | string (UUID) | 엔드포인트 ID |

**Request Body**

```json
{
  "name": "Updated API Name",
  "checkInterval": 120,
  "isActive": false
}
```

**Request Parameters** (모두 선택 사항)

| 필드 | 타입 | 설명 |
|------|------|------|
| name | string | 엔드포인트 이름 |
| url | string | URL |
| method | string | HTTP 메소드 |
| headers | object | HTTP 헤더 |
| body | object | 요청 바디 |
| checkInterval | number | 체크 간격(초) |
| expectedStatusCode | number | 예상 응답 코드 |
| timeoutThreshold | number | 타임아웃(ms) |
| isActive | boolean | 활성화 여부 |

**Response (200 OK)**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Updated API Name",
  "checkInterval": 120,
  "isActive": false,
  "updatedAt": "2025-10-16T12:30:00.000Z"
}
```

---

### 1.5 엔드포인트 삭제

엔드포인트를 삭제합니다.

**요청**

```http
DELETE /api/endpoints/:id
```

**Path Parameters**

| 필드 | 타입 | 설명 |
|------|------|------|
| id | string (UUID) | 엔드포인트 ID |

**Response (200 OK)**

```json
{
  "message": "Endpoint deleted successfully",
  "deletedAt": "2025-10-16T12:45:00.000Z"
}
```

---

## 2. 헬스 체크 API

### 2.1 체크 결과 조회

특정 엔드포인트의 체크 결과를 조회합니다.

**요청**

```http
GET /api/endpoints/:id/check-results?startDate=2025-10-15&endDate=2025-10-16&limit=100
```

**Path Parameters**

| 필드 | 타입 | 설명 |
|------|------|------|
| id | string (UUID) | 엔드포인트 ID |

**Query Parameters**

| 필드 | 타입 | 필수 | 설명 | 기본값 |
|------|------|------|------|--------|
| startDate | string (ISO 8601) | X | 시작 날짜 | 24시간 전 |
| endDate | string (ISO 8601) | X | 종료 날짜 | 현재 |
| limit | number | X | 최대 결과 수 | 100 |

**Response (200 OK)**

```json
{
  "endpointId": "550e8400-e29b-41d4-a716-446655440000",
  "results": [
    {
      "id": "check-uuid-1",
      "status": "success",
      "responseTime": 123,
      "statusCode": 200,
      "errorMessage": null,
      "checkedAt": "2025-10-16T12:00:00.000Z"
    },
    {
      "id": "check-uuid-2",
      "status": "failure",
      "responseTime": 5001,
      "statusCode": null,
      "errorMessage": "Timeout exceeded",
      "checkedAt": "2025-10-16T11:59:00.000Z"
    }
  ],
  "total": 1440
}
```

---

### 2.2 수동 헬스 체크 실행

특정 엔드포인트를 즉시 체크합니다.

**요청**

```http
POST /api/endpoints/:id/check
```

**Path Parameters**

| 필드 | 타입 | 설명 |
|------|------|------|
| id | string (UUID) | 엔드포인트 ID |

**Response (200 OK)**

```json
{
  "id": "check-uuid",
  "endpointId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "success",
  "responseTime": 145,
  "statusCode": 200,
  "errorMessage": null,
  "checkedAt": "2025-10-16T12:30:00.000Z"
}
```

---

## 3. 통계 API

### 3.1 가동률 조회

엔드포인트의 가동률을 조회합니다.

**요청**

```http
GET /api/endpoints/:id/uptime?period=24h
```

**Path Parameters**

| 필드 | 타입 | 설명 |
|------|------|------|
| id | string (UUID) | 엔드포인트 ID |

**Query Parameters**

| 필드 | 타입 | 필수 | 설명 | 기본값 |
|------|------|------|------|--------|
| period | string | X | 기간 (24h, 7d, 30d, custom) | 24h |
| startDate | string (ISO 8601) | X | 커스텀 시작 날짜 (period=custom 시) | - |
| endDate | string (ISO 8601) | X | 커스텀 종료 날짜 (period=custom 시) | - |

**Response (200 OK)**

```json
{
  "endpointId": "550e8400-e29b-41d4-a716-446655440000",
  "period": "24h",
  "uptime": 99.5,
  "totalChecks": 1440,
  "successfulChecks": 1433,
  "failedChecks": 7,
  "startDate": "2025-10-15T12:00:00.000Z",
  "endDate": "2025-10-16T12:00:00.000Z"
}
```

---

### 3.2 응답 시간 통계 조회

응답 시간 통계를 조회합니다.

**요청**

```http
GET /api/endpoints/:id/response-time?period=24h
```

**Path Parameters**

| 필드 | 타입 | 설명 |
|------|------|------|
| id | string (UUID) | 엔드포인트 ID |

**Query Parameters**

| 필드 | 타입 | 필수 | 설명 | 기본값 |
|------|------|------|------|--------|
| period | string | X | 기간 (24h, 7d, 30d) | 24h |

**Response (200 OK)**

```json
{
  "endpointId": "550e8400-e29b-41d4-a716-446655440000",
  "period": "24h",
  "statistics": {
    "average": 145,
    "min": 89,
    "max": 523,
    "p50": 134,
    "p95": 298,
    "p99": 456
  },
  "timeSeries": [
    {
      "timestamp": "2025-10-16T00:00:00.000Z",
      "avgResponseTime": 150
    },
    {
      "timestamp": "2025-10-16T01:00:00.000Z",
      "avgResponseTime": 145
    }
  ]
}
```

---

### 3.3 전체 엔드포인트 통계 조회

모든 엔드포인트의 요약 통계를 조회합니다.

**요청**

```http
GET /api/statistics/overview
```

**Response (200 OK)**

```json
{
  "totalEndpoints": 10,
  "statusBreakdown": {
    "UP": 8,
    "DOWN": 1,
    "DEGRADED": 1,
    "UNKNOWN": 0
  },
  "overallUptime": 98.5,
  "activeIncidents": 1,
  "totalIncidentsLast24h": 3,
  "averageResponseTime": 156
}
```

---

## 4. 인시던트 API

### 4.1 인시던트 목록 조회

**요청**

```http
GET /api/incidents?endpointId=xxx&status=active&page=1&limit=20
```

**Query Parameters**

| 필드 | 타입 | 필수 | 설명 | 기본값 |
|------|------|------|------|--------|
| endpointId | string (UUID) | X | 엔드포인트 필터 | - |
| status | string | X | 상태 (active, resolved) | - |
| page | number | X | 페이지 번호 | 1 |
| limit | number | X | 페이지당 항목 수 | 20 |

**Response (200 OK)**

```json
{
  "data": [
    {
      "id": "incident-uuid",
      "endpointId": "550e8400-e29b-41d4-a716-446655440000",
      "endpointName": "Example API",
      "startedAt": "2025-10-16T10:00:00.000Z",
      "resolvedAt": "2025-10-16T10:05:00.000Z",
      "duration": 300000,
      "failureCount": 5,
      "errorMessage": "Timeout exceeded"
    }
  ],
  "meta": {
    "total": 15,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

---

### 4.2 인시던트 상세 조회

**요청**

```http
GET /api/incidents/:id
```

**Path Parameters**

| 필드 | 타입 | 설명 |
|------|------|------|
| id | string (UUID) | 인시던트 ID |

**Response (200 OK)**

```json
{
  "id": "incident-uuid",
  "endpointId": "550e8400-e29b-41d4-a716-446655440000",
  "endpoint": {
    "name": "Example API",
    "url": "https://api.example.com/health"
  },
  "startedAt": "2025-10-16T10:00:00.000Z",
  "resolvedAt": "2025-10-16T10:05:00.000Z",
  "duration": 300000,
  "failureCount": 5,
  "errorMessage": "Timeout exceeded",
  "checkResults": [
    {
      "checkedAt": "2025-10-16T10:00:00.000Z",
      "status": "failure",
      "errorMessage": "Timeout exceeded"
    }
  ]
}
```

---

## 5. 알림 채널 API

### 5.1 알림 채널 목록 조회

**요청**

```http
GET /api/notification-channels
```

**Response (200 OK)**

```json
{
  "data": [
    {
      "id": "channel-uuid-1",
      "name": "Email Alerts",
      "type": "email",
      "isActive": true,
      "createdAt": "2025-10-16T10:00:00.000Z"
    },
    {
      "id": "channel-uuid-2",
      "name": "Slack Alerts",
      "type": "slack",
      "isActive": true,
      "createdAt": "2025-10-16T10:00:00.000Z"
    }
  ]
}
```

---

### 5.2 알림 채널 등록

**요청**

```http
POST /api/notification-channels
Content-Type: application/json
```

**Request Body**

```json
{
  "name": "Email Alerts",
  "type": "email",
  "config": {
    "recipients": ["admin@example.com", "team@example.com"]
  }
}
```

**Response (201 Created)**

```json
{
  "id": "channel-uuid",
  "name": "Email Alerts",
  "type": "email",
  "isActive": true,
  "createdAt": "2025-10-16T12:00:00.000Z"
}
```

---

### 5.3 알림 채널 수정

**요청**

```http
PATCH /api/notification-channels/:id
Content-Type: application/json
```

**Path Parameters**

| 필드 | 타입 | 설명 |
|------|------|------|
| id | string (UUID) | 채널 ID |

**Request Body**

```json
{
  "name": "Updated Email Alerts",
  "isActive": false
}
```

**Response (200 OK)**

```json
{
  "id": "channel-uuid",
  "name": "Updated Email Alerts",
  "isActive": false,
  "updatedAt": "2025-10-16T12:30:00.000Z"
}
```

---

### 5.4 알림 채널 삭제

**요청**

```http
DELETE /api/notification-channels/:id
```

**Path Parameters**

| 필드 | 타입 | 설명 |
|------|------|------|
| id | string (UUID) | 채널 ID |

**Response (200 OK)**

```json
{
  "message": "Notification channel deleted successfully"
}
```

---

## 6. WebSocket API

### 6.1 연결

**Connection**

```javascript
const socket = io('http://localhost:3000', {
  transports: ['websocket']
});
```

---

### 6.2 이벤트 구독

**클라이언트 → 서버**

```javascript
// 전체 엔드포인트 구독
socket.emit('subscribe:all');

// 특정 엔드포인트 구독
socket.emit('subscribe:endpoint', { endpointId: 'uuid' });

// 구독 해제
socket.emit('unsubscribe:endpoint', { endpointId: 'uuid' });
```

---

### 6.3 서버 이벤트

**서버 → 클라이언트**

```javascript
// 상태 변경
socket.on('endpoint:status-changed', (data) => {
  /*
  {
    endpointId: 'uuid',
    previousStatus: 'UP',
    currentStatus: 'DOWN',
    timestamp: '2025-10-16T12:00:00.000Z',
    responseTime: 5432,
    errorMessage: 'Timeout exceeded'
  }
  */
});

// 헬스 체크 완료
socket.on('check:completed', (data) => {
  /*
  {
    endpointId: 'uuid',
    status: 'success',
    responseTime: 123,
    statusCode: 200,
    checkedAt: '2025-10-16T12:00:00.000Z'
  }
  */
});

// 인시던트 발생
socket.on('incident:started', (data) => {
  /*
  {
    incidentId: 'uuid',
    endpointId: 'uuid',
    endpointName: 'Example API',
    startedAt: '2025-10-16T12:00:00.000Z',
    failureCount: 3
  }
  */
});

// 인시던트 해결
socket.on('incident:resolved', (data) => {
  /*
  {
    incidentId: 'uuid',
    endpointId: 'uuid',
    resolvedAt: '2025-10-16T12:05:00.000Z',
    duration: 300000
  }
  */
});

// 엔드포인트 생성
socket.on('endpoint:created', (data) => {
  // 새로 생성된 엔드포인트 정보
});

// 엔드포인트 수정
socket.on('endpoint:updated', (data) => {
  // 수정된 엔드포인트 정보
});

// 엔드포인트 삭제
socket.on('endpoint:deleted', (data) => {
  /*
  {
    endpointId: 'uuid'
  }
  */
});
```

---

## 7. 공통 응답 형식

### 7.1 성공 응답

모든 성공 응답은 적절한 HTTP 상태 코드와 함께 JSON 데이터를 반환합니다.

```json
{
  "data": {},
  "message": "Success message (optional)"
}
```

---

### 7.2 에러 응답

모든 에러 응답은 다음 형식을 따릅니다.

```json
{
  "statusCode": 400,
  "message": "Error message or array of validation errors",
  "error": "Bad Request",
  "timestamp": "2025-10-16T12:00:00.000Z",
  "path": "/api/endpoints"
}
```

**HTTP 상태 코드**

| 코드 | 설명 |
|------|------|
| 200 | OK - 성공 |
| 201 | Created - 리소스 생성 성공 |
| 400 | Bad Request - 잘못된 요청 |
| 404 | Not Found - 리소스를 찾을 수 없음 |
| 500 | Internal Server Error - 서버 오류 |

---

## 8. 페이지네이션

목록 조회 API는 다음과 같은 페이지네이션 형식을 사용합니다.

**Query Parameters**
- `page`: 페이지 번호 (기본값: 1)
- `limit`: 페이지당 항목 수 (기본값: 20, 최대: 100)

**Response**

```json
{
  "data": [],
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5
  }
}
```

---

## 9. 필터링 및 정렬

### 9.1 필터링

쿼리 파라미터를 사용하여 필터링합니다.

```http
GET /api/endpoints?status=UP&isActive=true
```

### 9.2 정렬

`sortBy`와 `order` 파라미터를 사용합니다.

```http
GET /api/endpoints?sortBy=name&order=ASC
```

---

## 10. Rate Limiting

API 호출 제한 (추후 구현 예정)

- 기본: 100 requests/minute per IP
- WebSocket: 50 connections per IP

---

## 부록: API 테스트 예시

### cURL 예시

```bash
# 엔드포인트 등록
curl -X POST http://localhost:3000/api/endpoints \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test API",
    "url": "https://api.example.com/health",
    "method": "GET",
    "checkInterval": 60,
    "expectedStatusCode": 200,
    "timeoutThreshold": 5000
  }'

# 엔드포인트 목록 조회
curl -X GET "http://localhost:3000/api/endpoints?page=1&limit=10"

# 엔드포인트 상세 조회
curl -X GET http://localhost:3000/api/endpoints/{id}

# 수동 헬스 체크
curl -X POST http://localhost:3000/api/endpoints/{id}/check

# 가동률 조회
curl -X GET "http://localhost:3000/api/endpoints/{id}/uptime?period=24h"
```
