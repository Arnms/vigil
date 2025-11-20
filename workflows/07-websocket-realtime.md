# Step 7: WebSocket 실시간 기능

**목표**: WebSocket을 통한 실시간 상태 업데이트
**기간**: Day 12
**상태**: ✅ 완료 (2025-11-20)

---

## 📋 워크플로우

### 1. Socket.io 백엔드 설정

**목표**: NestJS에서 WebSocket 게이트웨이 구현

- [x] @nestjs/websockets 설치 (이미 NestJS에 포함됨)

- [x] WebSocket Gateway 생성
  - `src/modules/websocket/websocket.gateway.ts`
  - `src/modules/websocket/websocket.module.ts`

- [x] Gateway 기본 구조
  ```typescript
  @WebSocketGateway()
  export class WebsocketGateway {
    @SubscribeMessage('subscribe:endpoint')
    handleSubscribe(client: Socket, data: any) {
      // 구독 처리
    }
  }
  ```

- [x] 이벤트 정의
  - `subscribe:all` - 모든 엔드포인트 구독
  - `subscribe:endpoint` - 특정 엔드포인트 구독
  - `unsubscribe:endpoint` - 구독 해제

---

### 2. 실시간 이벤트 발송

**목표**: 상태 변경 시 클라이언트에 즉시 알림

- [x] 상태 변경 이벤트 발송
  - `endpoint:status-changed` 이벤트
  - 변경된 엔드포인트 정보 전송
  - 이전 상태, 현재 상태, 응답 시간

- [x] 헬스 체크 완료 이벤트
  - `check:completed` 이벤트
  - 체크 결과 정보 전송

- [x] 인시던트 이벤트
  - `incident:started` 이벤트 (장애 시작)
  - `incident:resolved` 이벤트 (장애 종료)

- [x] CRUD 이벤트
  - `endpoint:created` (새 엔드포인트 등록)
  - `endpoint:updated` (엔드포인트 수정)
  - `endpoint:deleted` (엔드포인트 삭제)

- [x] 브로드캐스트 구현
  ```typescript
  this.server.emit('endpoint:status-changed', {
    endpointId: '...',
    currentStatus: 'DOWN',
    ...
  });
  ```

---

### 3. Socket.io 클라이언트 설정

**목표**: 프론트엔드에서 WebSocket 연결

- [x] socket.io-client 설치
  ```bash
  npm install socket.io-client
  ```

- [x] Socket 서비스 생성
  - `src/services/socket.service.ts`
  - 싱글톤 인스턴스

- [x] Socket 연결 설정
  ```typescript
  const socket = io('http://localhost:3000', {
    transports: ['websocket'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5
  });
  ```

- [x] 자동 재연결 로직
  - 연결 해제 시 자동 재연결
  - 재연결 시도 횟수 설정
  - 백오프 전략 (지수 백오프)

---

### 4. 실시간 상태 업데이트

**목표**: WebSocket 이벤트를 받아 UI 업데이트

- [x] Socket 이벤트 리스너 등록
  ```typescript
  socket.on('endpoint:status-changed', (data) => {
    // Zustand store 업데이트
  });
  ```

- [x] Zustand Store 업데이트
  - Endpoint 상태 업데이트
  - 마지막 응답 시간 업데이트
  - 가동률 즉시 반영 (선택사항)

- [x] UI 자동 새로고침
  - 대시보드의 상태 카드 업데이트
  - 엔드포인트 목록 업데이트
  - 차트 데이터 업데이트 (선택사항)

- [x] 성능 최적화
  - 불필요한 리렌더링 방지
  - useMemo, useCallback 활용

---

### 5. 토스트 알림 시스템

**목표**: 중요한 상태 변경을 사용자에게 알림

- [x] Toast 컴포넌트 생성
  - `src/components/Common/Toast.tsx`
  - 위치: 화면 오른쪽 위 (top-right)
  - 자동 닫힘 (3초)

- [x] Toast 타입 정의
  ```typescript
  type ToastType = 'success' | 'error' | 'warning' | 'info';

  interface Toast {
    id: string;
    type: ToastType;
    message: string;
    duration?: number;
  }
  ```

- [x] Toast Store (Zustand)
  - `src/stores/toast.store.ts`
  - addToast() - 토스트 추가
  - removeToast() - 토스트 제거
  - 최대 5개 토스트만 표시

- [x] 상태 변경에 따른 토스트
  - UP: "✅ API Server 정상 작동" (초록색)
  - DOWN: "❌ API Server 장애 발생" (빨간색)
  - DEGRADED: "⚠️ API Server 성능 저하" (노란색)

- [x] 인시던트 토스트
  - "🚨 API Server 장애 시작됨"
  - "✨ API Server 복구됨"

---

### 6. 구독 관리

**목표**: 효율적인 구독 상태 관리

- [x] 구독 Store (Zustand)
  - `src/stores/subscription.store.ts`
  - subscriptions: Set<string>
  - subscribe(endpointId)
  - unsubscribe(endpointId)
  - subscribeAll()
  - unsubscribeAll()

- [x] 컴포넌트 마운트/언마운트 시 구독
  ```typescript
  useEffect(() => {
    socket.emit('subscribe:endpoint', { endpointId });
    return () => {
      socket.emit('unsubscribe:endpoint', { endpointId });
    };
  }, [endpointId, socket]);
  ```

- [x] 페이지 전환 시 구독 업데이트
  - 목록 페이지: 모든 엔드포인트 구독
  - 상세 페이지: 특정 엔드포인트만 구독

---

### 7. 연결 상태 표시

**목표**: 사용자에게 WebSocket 연결 상태 알림

- [x] Connection Status Indicator
  - `src/components/Common/ConnectionStatus.tsx`
  - 헤더에 표시

- [x] 상태별 표시
  - 연결됨: 🟢 회색 (정상)
  - 연결 중: 🟡 주황색 (로딩)
  - 연결 해제: 🔴 빨간색 (경고)

- [x] 툴팁 추가
  - 마우스 오버 시 "실시간 연결" 또는 "연결 끊김" 표시

- [x] 자동 재연결 표시
  - 재연결 시도 중 메시지
  - 재연결 대기 시간 표시

---

### 8. 에러 처리 및 재시도

**목표**: 예외 상황에서의 안정적인 동작

- [x] 연결 에러 처리
  ```typescript
  socket.on('connect_error', (error) => {
    console.error('Connection error:', error);
  });
  ```

- [x] 이벤트 전송 에러 처리
  ```typescript
  socket.emit('subscribe:endpoint', data, (error) => {
    if (error) {
      showToast('구독 실패', 'error');
    }
  });
  ```

- [x] 타임아웃 처리
  - 응답 없음 시 재시도
  - 최대 재시도 횟수 설정

- [x] 폴백 전략
  - WebSocket 실패 시 HTTP polling으로 폴백 (선택사항)

---

### 9. 백엔드 이벤트 전송 통합

**목표**: 실제 상태 변경 시 WebSocket 이벤트 발송

- [x] Health Check Processor에서 이벤트 발송
  - 상태 변경 감지
  - WebSocket Gateway를 통해 이벤트 발송

- [x] Notification Service와의 통합
  - 상태 변경 이벤트 발송
  - 토스트 알림 연동

- [x] 엔드포인트 CRUD에서 이벤트 발송
  - 새 엔드포인트 생성 시
  - 엔드포인트 수정 시
  - 엔드포인트 삭제 시

---

## ✅ 완료 체크리스트

작업이 완료되었는지 확인합니다:

- [x] WebSocket 서버가 정상 작동하는가?
  - 클라이언트 연결 확인
  - 콘솔 로그 확인

- [x] Socket 클라이언트가 정상 연결되는가?
  - 브라우저 콘솔에서 "Connection" 메시지 확인
  - 네트워크 탭에서 ws:// 연결 확인

- [x] 상태 변경 이벤트가 정상 전송되는가?
  - 엔드포인트 상태 변경 후 이벤트 수신
  - UI 자동 업데이트 확인

- [x] 토스트 알림이 정상 표시되는가?
  - 상태 변경 시 토스트 표시
  - 자동 닫힘 확인
  - 여러 토스트 겹침 처리

- [x] 구독/구독 해제가 정상 작동하는가?
  - 페이지 이동 시 구독 상태 변경
  - 불필요한 이벤트 수신 없음

- [x] 연결 상태 표시가 정상 작동하는가?
  - 연결됨: 초록색
  - 연결 중: 주황색
  - 연결 해제: 빨간색

- [x] 자동 재연결이 정상 작동하는가?
  - 네트워크 끊김 후 자동 재연결
  - 재연결 성공 후 정상 동작

- [x] 성능이 양호한가?
  - 많은 이벤트 수신 시에도 UI 반응성 유지
  - 메모리 누수 없음

---

## 🧪 테스트 시나리오

### 실시간 상태 업데이트 테스트
1. 브라우저에서 대시보드 열기
2. 터미널에서 엔드포인트를 DOWN 상태로 변경
3. 브라우저에서 즉시 상태 변경 확인
4. 토스트 알림 표시 확인

### 재연결 테스트
1. 브라우저 개발자 도구에서 네트워크 연결 해제 (Offline)
2. 연결 상태 표시가 빨간색으로 변경 확인
3. 네트워크 다시 연결 (Online)
4. 자동 재연결 확인
5. 정상 동작 확인

---

## 📝 Socket 이벤트 메시지 형식

```typescript
// 상태 변경 이벤트
{
  event: 'endpoint:status-changed',
  data: {
    endpointId: 'uuid',
    previousStatus: 'UP',
    currentStatus: 'DOWN',
    timestamp: '2025-10-16T12:00:00.000Z',
    responseTime: 5432,
    errorMessage: 'Timeout exceeded'
  }
}

// 인시던트 발생 이벤트
{
  event: 'incident:started',
  data: {
    incidentId: 'uuid',
    endpointId: 'uuid',
    endpointName: 'API Server',
    startedAt: '2025-10-16T12:00:00.000Z',
    failureCount: 3
  }
}
```

---

## 🔗 관련 문서

- [FEATURE_SPECIFICATIONS.md](../docs/FEATURE_SPECIFICATIONS.md#3-실시간-모니터링) - 실시간 명세
- [API_SPECIFICATIONS.md](../docs/API_SPECIFICATIONS.md#6-websocket-api) - WebSocket API

## 📚 참고 자료

- [Socket.io 공식 문서](https://socket.io/docs/)
- [NestJS WebSocket](https://docs.nestjs.com/websockets/gateways)
- [Zustand 상태 관리](https://github.com/pmndrs/zustand)

## ➡️ 다음 단계

→ [08-testing-deployment.md](./08-testing-deployment.md)

**다음 단계 내용**:
- 엔드 투 엔드 테스트
- 버그 수정 및 에러 핸들링
- 성능 최적화
- Docker 이미지 빌드
- 배포 준비
