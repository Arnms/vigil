# Step 7 상세 설계 문서: WebSocket 실시간 기능

**작성일**: 2025-11-16
**상태**: 설계 중
**기간**: Day 12

---

## 📋 목차

1. [개요](#개요)
2. [전체 아키텍처](#전체-아키텍처)
3. [1단계: Socket.io 백엔드 설정](#1단계-socketio-백엔드-설정)
4. [2단계: 실시간 이벤트 발송](#2단계-실시간-이벤트-발송)
5. [3단계: Socket.io 클라이언트 설정](#3단계-socketio-클라이언트-설정)
6. [4단계: 실시간 상태 업데이트](#4단계-실시간-상태-업데이트)
7. [5단계: 토스트 알림 시스템](#5단계-토스트-알림-시스템)
8. [6단계: 구독 관리](#6단계-구독-관리)
9. [7단계: 연결 상태 표시](#7단계-연결-상태-표시)
10. [8단계: 에러 처리 및 재시도](#8단계-에러-처리-및-재시도)
11. [9단계: 백엔드 이벤트 전송 통합](#9단계-백엔드-이벤트-전송-통합)
12. [데이터 플로우](#데이터-플로우)
13. [구현 체크리스트](#구현-체크리스트)

---

## 개요

### 목표
- ✅ WebSocket 기반 실시간 상태 업데이트
- ✅ Socket.io 백엔드 서버 구현
- ✅ 클라이언트 자동 연결 및 재연결
- ✅ 상태 변경 이벤트 실시간 전파
- ✅ 토스트 알림 시스템 구현
- ✅ 효율적인 구독 관리
- ✅ 연결 상태 시각화
- ✅ 안정적인 에러 처리

### 기대 효과
- HTTP polling 제거로 API 호출 감소
- 실시간 상태 반영으로 사용자 경험 향상
- 장애 발생 시 즉시 알림
- 네트워크 불안정 시에도 자동 재연결
- 효율적 리소스 사용

---

## 전체 아키텍처

### 시스템 흐름도

```
┌─────────────────────────────────────────────────────────────┐
│                    백엔드 (NestJS)                           │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │         WebSocket Gateway (Socket.io)                  │  │
│  │                                                         │  │
│  │  • 클라이언트 연결/구독 관리                            │  │
│  │  • 이벤트 발송 (브로드캐스트)                          │  │
│  │  • Room 기반 구독 (엔드포인트별)                       │  │
│  └───────────────────────────────────────────────────────┘  │
│              ↑                               ↑                │
│              │                               │                │
│  ┌──────────┴──────────┐         ┌──────────┴──────────┐    │
│  │ Health Check        │         │ Endpoint Service   │    │
│  │ Processor           │         │ (CRUD)             │    │
│  │                     │         │                    │    │
│  │ 상태 변경 감지      │         │ 엔드포인트 변경    │    │
│  │ → 이벤트 발송      │         │ → 이벤트 발송     │    │
│  └─────────────────────┘         └────────────────────┘    │
│              ↑                               ↑                │
│              │                               │                │
│  ┌──────────┴───────────┐       ┌───────────┴──────────┐    │
│  │ Incident Service    │       │ Notification        │    │
│  │                     │       │ Service             │    │
│  │ 장애 이벤트        │       │                     │    │
│  │ → 이벤트 발송      │       │ 알림 발송           │    │
│  └─────────────────────┘       └─────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                            ↕ (WebSocket)
┌─────────────────────────────────────────────────────────────┐
│                    프론트엔드 (React)                         │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │            Socket.io Client Manager                    │  │
│  │  (src/services/socket.service.ts)                     │  │
│  │                                                         │  │
│  │  • 자동 연결 및 재연결                                 │  │
│  │  • 이벤트 리스너 등록                                  │  │
│  │  • 구독/구독 해제 관리                                 │  │
│  └───────────────────────────────────────────────────────┘  │
│              ↑                               ↓                │
│              │                      ┌────────┴────────┐      │
│  ┌──────────┴──────────┐            │                 │      │
│  │ Zustand Stores     │            │ Socket Events   │      │
│  │                     │            │                 │      │
│  │ • Endpoint Store   │◄───────────┤ • status-chg   │      │
│  │ • Incident Store   │◄───────────┤ • incident-*   │      │
│  │ • Toast Store      │◄───────────┤ • endpoint-*   │      │
│  │ • Subscription     │            │ • connect/*    │      │
│  └─────────────────────┘            └─────────────────┘      │
│              ↑                                                │
│              └─────────────────────────────────────────┐     │
│                                                        │     │
│  ┌──────────────────────────────────────────────────────┴──┐ │
│  │                     UI Components                       │ │
│  │                                                          │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │ │
│  │  │  Dashboard   │  │  Toast       │  │  Connection  │ │ │
│  │  │  (실시간)    │  │  Notifications│ │  Status      │ │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘ │ │
│  │                                                          │ │
│  │  ┌──────────────┐  ┌──────────────┐                   │ │
│  │  │ Endpoints    │  │ Endpoint     │                   │ │
│  │  │ List         │  │ Detail       │                   │ │
│  │  │ (실시간)     │  │ (실시간)     │                   │ │
│  │  └──────────────┘  └──────────────┘                   │ │
│  └──────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## 1단계: Socket.io 백엔드 설정

### 목표
NestJS에서 WebSocket 게이트웨이를 구현하여 클라이언트와의 실시간 통신 기반 마련

### WebSocket Gateway 생성

**파일 구조**:
```
src/modules/websocket/
├── websocket.gateway.ts
├── websocket.module.ts
├── dto/
│   ├── subscribe.dto.ts
│   └── unsubscribe.dto.ts
└── websocket.service.ts
```

### Gateway 구현

```typescript
// websocket.gateway.ts
import { WebSocketGateway, WebSocketServer, SubscribeMessage, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: 'http://localhost:5173',
    credentials: true,
  },
})
export class WebsocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private clientSessions = new Map<string, Set<string>>(); // socketId → rooms

  // 클라이언트 연결
  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
    client.emit('connected', { clientId: client.id });
  }

  // 클라이언트 연결 해제
  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
    this.clientSessions.delete(client.id);
  }

  // 모든 엔드포인트 구독
  @SubscribeMessage('subscribe:all')
  handleSubscribeAll(client: Socket): void {
    client.join('all-endpoints');
    console.log(`Client ${client.id} subscribed to all-endpoints`);
  }

  // 특정 엔드포인트 구독
  @SubscribeMessage('subscribe:endpoint')
  handleSubscribeEndpoint(client: Socket, data: { endpointId: string }): void {
    const room = `endpoint:${data.endpointId}`;
    client.join(room);
    console.log(`Client ${client.id} subscribed to ${room}`);
  }

  // 엔드포인트 구독 해제
  @SubscribeMessage('unsubscribe:endpoint')
  handleUnsubscribeEndpoint(client: Socket, data: { endpointId: string }): void {
    const room = `endpoint:${data.endpointId}`;
    client.leave(room);
    console.log(`Client ${client.id} unsubscribed from ${room}`);
  }

  // 상태 변경 이벤트 브로드캐스트
  broadcastStatusChange(endpointId: string, statusData: any): void {
    this.server.to(`endpoint:${endpointId}`).emit('endpoint:status-changed', statusData);
    this.server.to('all-endpoints').emit('endpoint:status-changed', statusData);
  }

  // 인시던트 이벤트 브로드캐스트
  broadcastIncidentStarted(endpointId: string, incidentData: any): void {
    this.server.to(`endpoint:${endpointId}`).emit('incident:started', incidentData);
    this.server.to('all-endpoints').emit('incident:started', incidentData);
  }

  broadcastIncidentResolved(endpointId: string, incidentData: any): void {
    this.server.to(`endpoint:${endpointId}`).emit('incident:resolved', incidentData);
    this.server.to('all-endpoints').emit('incident:resolved', incidentData);
  }
}
```

### 모듈 등록

```typescript
// websocket.module.ts
import { Module } from '@nestjs/common';
import { WebsocketGateway } from './websocket.gateway';

@Module({
  providers: [WebsocketGateway],
  exports: [WebsocketGateway],
})
export class WebsocketModule {}
```

---

## 2단계: 실시간 이벤트 발송

### 목표
백엔드에서 상태 변경 감지 시 즉시 클라이언트에 이벤트 전송

### 이벤트 종류

| 이벤트명 | 발송자 | 시점 | 데이터 |
|---------|--------|------|--------|
| `endpoint:status-changed` | HealthCheckProcessor | 상태 변경 | endpointId, previousStatus, currentStatus, timestamp, responseTime |
| `check:completed` | HealthCheckProcessor | 체크 완료 | endpointId, status, responseTime, statusCode |
| `incident:started` | HealthCheckProcessor | 장애 시작 | incidentId, endpointId, endpointName, startedAt, failureCount |
| `incident:resolved` | HealthCheckProcessor | 장애 해제 | incidentId, endpointId, endpointName, resolvedAt, duration |
| `endpoint:created` | EndpointService | 엔드포인트 등록 | endpointId, name, url, method |
| `endpoint:updated` | EndpointService | 엔드포인트 수정 | endpointId, changes |
| `endpoint:deleted` | EndpointService | 엔드포인트 삭제 | endpointId, name |

### Health Check Processor에서의 이벤트 발송

```typescript
// health-check.processor.ts (수정)
import { Inject } from '@nestjs/common';
import { WebsocketGateway } from '../websocket/websocket.gateway';

@Processor('HEALTH_CHECK_QUEUE')
export class HealthCheckProcessor {
  constructor(
    @Inject(WebsocketGateway) private websocketGateway: WebsocketGateway,
    // ... 다른 의존성
  ) {}

  private async handleIncidents(
    endpoint: Endpoint,
    checkResult: CheckResult,
  ): Promise<void> {
    const newStatus = endpoint.currentStatus;
    const activeIncident = await this.incidentRepository.findOne({
      where: {
        endpoint: { id: endpoint.id },
        resolvedAt: IsNull(),
      },
    });

    if (newStatus === EndpointStatus.DOWN && !activeIncident) {
      // 새 인시던트 생성
      const incident = await this.incidentRepository.save({
        endpoint,
        startedAt: new Date(),
        failureCount: endpoint.consecutiveFailures,
        errorMessage: checkResult.errorMessage,
      });

      // WebSocket 이벤트 발송
      this.websocketGateway.broadcastIncidentStarted(endpoint.id, {
        incidentId: incident.id,
        endpointId: endpoint.id,
        endpointName: endpoint.name,
        startedAt: incident.startedAt,
        failureCount: endpoint.consecutiveFailures,
      });
    } else if (newStatus !== EndpointStatus.DOWN && activeIncident) {
      // 인시던트 종료
      activeIncident.resolvedAt = new Date();
      await this.incidentRepository.save(activeIncident);

      // WebSocket 이벤트 발송
      this.websocketGateway.broadcastIncidentResolved(endpoint.id, {
        incidentId: activeIncident.id,
        endpointId: endpoint.id,
        endpointName: endpoint.name,
        resolvedAt: activeIncident.resolvedAt,
        duration: activeIncident.resolvedAt.getTime() - activeIncident.startedAt.getTime(),
      });
    }

    // 상태 변경 이벤트
    if (newStatus !== endpoint.currentStatus) {
      this.websocketGateway.broadcastStatusChange(endpoint.id, {
        endpointId: endpoint.id,
        previousStatus: endpoint.currentStatus,
        currentStatus: newStatus,
        timestamp: new Date(),
        responseTime: checkResult.responseTime,
        errorMessage: checkResult.errorMessage,
      });
    }
  }
}
```

---

## 3단계: Socket.io 클라이언트 설정

### 목표
프론트엔드에서 WebSocket 연결 자동 관리 및 재연결 기능 구현

### Socket 서비스 생성

```typescript
// src/services/socket.service.ts
import { io, Socket } from 'socket.io-client';

class SocketService {
  private socket: Socket | null = null;
  private url: string = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

  connect(): Socket {
    if (this.socket?.connected) {
      return this.socket;
    }

    this.socket = io(this.url, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      autoConnect: true,
      reconnectionDelay: () => {
        // 지수 백오프
        return Math.min(1000 * Math.pow(2, this.socket?.io._reconnectionAttempts || 0), 5000);
      },
    });

    this.setupListeners();
    return this.socket;
  }

  private setupListeners(): void {
    if (!this.socket) return;

    // 연결 성공
    this.socket.on('connect', () => {
      console.log('Socket connected');
    });

    // 연결 실패
    this.socket.on('connect_error', (error: Error) => {
      console.error('Socket connection error:', error);
    });

    // 연결 해제
    this.socket.on('disconnect', (reason: string) => {
      console.log('Socket disconnected:', reason);
    });

    // 자동 재연결 실패
    this.socket.on('reconnect_failed', () => {
      console.error('Socket reconnection failed');
    });
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  disconnect(): void {
    if (this.socket?.connected) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  emit(event: string, data: any, callback?: (response: any) => void): void {
    if (this.socket?.connected) {
      if (callback) {
        this.socket.emit(event, data, callback);
      } else {
        this.socket.emit(event, data);
      }
    }
  }

  on(event: string, callback: (data: any) => void): void {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event: string, callback?: (data: any) => void): void {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }
}

export const socketService = new SocketService();
```

### App.tsx에서 초기화

```typescript
// src/App.tsx
import { useEffect } from 'react';
import { socketService } from './services/socket.service';

function App() {
  useEffect(() => {
    // 앱 시작 시 Socket 연결
    socketService.connect();

    return () => {
      // 앱 종료 시 연결 해제 (선택사항)
      // socketService.disconnect();
    };
  }, []);

  return (
    // ... JSX
  );
}
```

---

## 4단계: 실시간 상태 업데이트

### 목표
WebSocket 이벤트를 받아서 Zustand 스토어를 실시간으로 업데이트

### Endpoint Store 수정

```typescript
// src/stores/endpoint.store.ts
import { create } from 'zustand';
import { socketService } from '../services/socket.service';

interface EndpointStore {
  endpoints: Endpoint[];
  updateEndpointStatus: (endpointId: string, newStatus: string) => void;
  // ... 다른 메서드
}

export const useEndpointStore = create<EndpointStore>((set) => {
  // WebSocket 리스너 등록
  socketService.on('endpoint:status-changed', (data) => {
    set((state) => ({
      endpoints: state.endpoints.map((ep) =>
        ep.id === data.endpointId
          ? {
              ...ep,
              currentStatus: data.currentStatus,
              lastResponseTime: data.responseTime,
              lastCheckedAt: new Date(),
            }
          : ep
      ),
    }));
  });

  return {
    endpoints: [],
    updateEndpointStatus: (endpointId: string, newStatus: string) => {
      set((state) => ({
        endpoints: state.endpoints.map((ep) =>
          ep.id === endpointId ? { ...ep, currentStatus: newStatus } : ep
        ),
      }));
    },
    // ... 다른 메서드
  };
});
```

### Incident Store 수정

```typescript
// src/stores/incident.store.ts
import { create } from 'zustand';
import { socketService } from '../services/socket.service';

export const useIncidentStore = create<IncidentStore>((set) => {
  // 인시던트 시작 이벤트
  socketService.on('incident:started', (data) => {
    set((state) => ({
      incidents: [
        {
          id: data.incidentId,
          endpoint: { id: data.endpointId, name: data.endpointName },
          startedAt: data.startedAt,
          resolvedAt: null,
          failureCount: data.failureCount,
        },
        ...state.incidents,
      ],
    }));
  });

  // 인시던트 해결 이벤트
  socketService.on('incident:resolved', (data) => {
    set((state) => ({
      incidents: state.incidents.map((incident) =>
        incident.id === data.incidentId
          ? { ...incident, resolvedAt: data.resolvedAt }
          : incident
      ),
    }));
  });

  return {
    incidents: [],
    // ... 다른 메서드
  };
});
```

---

## 5단계: 토스트 알림 시스템

### 목표
상태 변경, 인시던트 이벤트를 사용자에게 토스트 알림으로 표시

### Toast Store 생성

```typescript
// src/stores/toast.store.ts
import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastStore {
  toasts: Toast[];
  addToast: (message: string, type: ToastType, duration?: number) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (message: string, type: ToastType, duration = 3000) => {
    const id = Math.random().toString(36).substr(2, 9);
    const toast: Toast = { id, message, type, duration };

    set((state) => ({
      toasts: [...state.toasts.slice(-4), toast], // 최대 5개 유지
    }));

    if (duration > 0) {
      setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }));
      }, duration);
    }
  },
  removeToast: (id: string) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },
}));
```

### Toast Container 컴포넌트

```typescript
// src/components/Common/ToastContainer.tsx
import { useToastStore } from '../../stores/toast.store';

export default function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  const typeClasses = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    warning: 'bg-yellow-500',
    info: 'bg-blue-500',
  };

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`${typeClasses[toast.type]} text-white px-4 py-3 rounded shadow-lg animate-slide-in`}
        >
          <div className="flex justify-between items-center">
            <span>{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="ml-4 text-lg hover:opacity-75"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
```

### WebSocket 이벤트에서 토스트 표시

```typescript
// src/hooks/useWebSocketToasts.ts
import { useEffect } from 'react';
import { socketService } from '../services/socket.service';
import { useToastStore } from '../stores/toast.store';

export function useWebSocketToasts() {
  const { addToast } = useToastStore();

  useEffect(() => {
    // 상태 변경 이벤트
    socketService.on('endpoint:status-changed', (data) => {
      const statusEmojis = {
        UP: '✅',
        DOWN: '❌',
        DEGRADED: '⚠️',
      };
      const emoji = statusEmojis[data.currentStatus as keyof typeof statusEmojis] || '•';

      if (data.currentStatus === 'DOWN') {
        addToast(`${emoji} ${data.endpointName || '엔드포인트'} 장애 발생`, 'error');
      } else if (data.currentStatus === 'UP') {
        addToast(`${emoji} ${data.endpointName || '엔드포인트'} 정상 작동`, 'success');
      } else if (data.currentStatus === 'DEGRADED') {
        addToast(`${emoji} ${data.endpointName || '엔드포인트'} 성능 저하`, 'warning');
      }
    });

    // 인시던트 이벤트
    socketService.on('incident:started', (data) => {
      addToast(`🚨 ${data.endpointName} 장애 시작됨`, 'error');
    });

    socketService.on('incident:resolved', (data) => {
      addToast(`✨ ${data.endpointName} 복구됨`, 'success');
    });

    return () => {
      socketService.off('endpoint:status-changed');
      socketService.off('incident:started');
      socketService.off('incident:resolved');
    };
  }, [addToast]);
}
```

---

## 6단계: 구독 관리

### 목표
페이지별로 필요한 엔드포인트만 구독하여 효율성 증가

### Subscription Store

```typescript
// src/stores/subscription.store.ts
import { create } from 'zustand';
import { socketService } from '../services/socket.service';

interface SubscriptionStore {
  subscriptions: Set<string>;
  subscribe: (endpointId: string) => void;
  unsubscribe: (endpointId: string) => void;
  subscribeAll: () => void;
  unsubscribeAll: () => void;
}

export const useSubscriptionStore = create<SubscriptionStore>((set) => ({
  subscriptions: new Set(),

  subscribe: (endpointId: string) => {
    set((state) => {
      const newSubs = new Set(state.subscriptions);
      if (!newSubs.has(endpointId)) {
        newSubs.add(endpointId);
        socketService.emit('subscribe:endpoint', { endpointId });
      }
      return { subscriptions: newSubs };
    });
  },

  unsubscribe: (endpointId: string) => {
    set((state) => {
      const newSubs = new Set(state.subscriptions);
      newSubs.delete(endpointId);
      socketService.emit('unsubscribe:endpoint', { endpointId });
      return { subscriptions: newSubs };
    });
  },

  subscribeAll: () => {
    socketService.emit('subscribe:all');
    set({ subscriptions: new Set() }); // 모두 구독 표시
  },

  unsubscribeAll: () => {
    set((state) => {
      state.subscriptions.forEach((endpointId) => {
        socketService.emit('unsubscribe:endpoint', { endpointId });
      });
      return { subscriptions: new Set() };
    });
  },
}));
```

### 페이지에서의 구독 관리

```typescript
// src/pages/EndpointsPage.tsx
import { useEffect } from 'react';
import { useSubscriptionStore } from '../stores/subscription.store';

export default function EndpointsPage() {
  const { subscribeAll, unsubscribeAll } = useSubscriptionStore();

  useEffect(() => {
    subscribeAll();
    return () => {
      unsubscribeAll();
    };
  }, [subscribeAll, unsubscribeAll]);

  return (
    // ... 컴포넌트
  );
}
```

```typescript
// src/pages/EndpointDetailPage.tsx
import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useSubscriptionStore } from '../stores/subscription.store';

export default function EndpointDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { subscribe, unsubscribe } = useSubscriptionStore();

  useEffect(() => {
    if (id) {
      subscribe(id);
      return () => {
        unsubscribe(id);
      };
    }
  }, [id, subscribe, unsubscribe]);

  return (
    // ... 컴포넌트
  );
}
```

---

## 7단계: 연결 상태 표시

### 목표
사용자에게 WebSocket 연결 상태를 시각적으로 표시

### Connection Status Store

```typescript
// src/stores/connection.store.ts
import { create } from 'zustand';
import { socketService } from '../services/socket.service';

type ConnectionStatus = 'connected' | 'connecting' | 'disconnected';

interface ConnectionStore {
  status: ConnectionStatus;
  setStatus: (status: ConnectionStatus) => void;
}

export const useConnectionStore = create<ConnectionStore>((set) => {
  const socket = socketService.getSocket();

  if (socket) {
    socket.on('connect', () => set({ status: 'connected' }));
    socket.on('disconnect', () => set({ status: 'disconnected' }));
    socket.on('connect_error', () => set({ status: 'connecting' }));
  }

  return {
    status: 'connecting',
    setStatus: (status) => set({ status }),
  };
});
```

### ConnectionStatus 컴포넌트

```typescript
// src/components/Common/ConnectionStatus.tsx
import { useConnectionStore } from '../../stores/connection.store';

export default function ConnectionStatus() {
  const { status } = useConnectionStore();

  const statusConfig = {
    connected: {
      color: 'bg-green-500',
      label: '실시간 연결됨',
      icon: '🟢',
    },
    connecting: {
      color: 'bg-yellow-500',
      label: '연결 중...',
      icon: '🟡',
    },
    disconnected: {
      color: 'bg-red-500',
      label: '연결 끊김',
      icon: '🔴',
    },
  };

  const config = statusConfig[status];

  return (
    <div className="flex items-center gap-2 px-3 py-1 rounded-full text-sm text-white" title={config.label}>
      <span className={`w-2 h-2 rounded-full ${config.color}`} />
      <span className="hidden sm:inline">{config.label}</span>
      <span className="sm:hidden">{config.icon}</span>
    </div>
  );
}
```

### Header에 추가

```typescript
// src/components/layout/Header.tsx
import ConnectionStatus from '../Common/ConnectionStatus';

export default function Header() {
  return (
    <header className="...">
      <div className="flex items-center justify-between">
        {/* ... */}
        <ConnectionStatus />
      </div>
    </header>
  );
}
```

---

## 8단계: 에러 처리 및 재시도

### 목표
네트워크 불안정 상황에서도 안정적으로 동작

### Socket Service 개선

```typescript
// src/services/socket.service.ts (에러 처리 추가)
private setupListeners(): void {
  if (!this.socket) return;

  // 연결 실패 처리
  this.socket.on('connect_error', (error: Error) => {
    console.error('Socket connection error:', error);
    this.handleConnectionError(error);
  });

  // 이벤트 전송 에러 처리
  this.socket.on('error', (error: any) => {
    console.error('Socket error:', error);
  });
}

private handleConnectionError(error: Error): void {
  // 에러 로깅
  console.error('Connection failed, will retry...', error);
  // UI에 알림 (토스트, 배너 등)
}

// 타임아웃 처리와 함께 이벤트 전송
emit(event: string, data: any, timeout = 5000): Promise<any> {
  return new Promise((resolve, reject) => {
    if (!this.socket?.connected) {
      reject(new Error('Socket not connected'));
      return;
    }

    const timeoutId = setTimeout(() => {
      reject(new Error(`Event ${event} timed out`));
    }, timeout);

    this.socket.emit(event, data, (response) => {
      clearTimeout(timeoutId);
      resolve(response);
    });
  });
}
```

---

## 9단계: 백엔드 이벤트 전송 통합

### 목표
백엔드의 모든 상태 변경 시점에서 WebSocket 이벤트 발송

### EndpointService 통합

```typescript
// src/modules/endpoint/endpoint.service.ts (수정)
import { WebsocketGateway } from '../websocket/websocket.gateway';

@Injectable()
export class EndpointService {
  constructor(
    @Inject(WebsocketGateway) private websocketGateway: WebsocketGateway,
    // ... 다른 의존성
  ) {}

  async create(dto: CreateEndpointDto): Promise<Endpoint> {
    const endpoint = this.endpointRepository.create({
      ...dto,
      currentStatus: 'UNKNOWN',
    });
    await this.endpointRepository.save(endpoint);

    // WebSocket 이벤트 발송
    this.websocketGateway.server.emit('endpoint:created', {
      endpointId: endpoint.id,
      name: endpoint.name,
      url: endpoint.url,
      method: endpoint.method,
    });

    return endpoint;
  }

  async update(id: string, dto: UpdateEndpointDto): Promise<Endpoint> {
    const endpoint = await this.findOne(id);
    Object.assign(endpoint, dto);
    await this.endpointRepository.save(endpoint);

    // WebSocket 이벤트 발송
    this.websocketGateway.server.emit('endpoint:updated', {
      endpointId: id,
      changes: dto,
    });

    return endpoint;
  }

  async remove(id: string): Promise<void> {
    const endpoint = await this.findOne(id);
    endpoint.isActive = false;
    await this.endpointRepository.save(endpoint);

    // WebSocket 이벤트 발송
    this.websocketGateway.server.emit('endpoint:deleted', {
      endpointId: id,
      name: endpoint.name,
    });
  }
}
```

---

## 데이터 플로우

### 상태 변경 흐름

```
1. 백엔드: Health Check 실행
   └─ CheckResult 저장
   └─ Endpoint 상태 업데이트

2. 백엔드: 상태 변경 감지
   └─ WebsocketGateway.broadcastStatusChange() 호출
   └─ Socket.io server.emit('endpoint:status-changed', data)

3. 프론트엔드: WebSocket 이벤트 수신
   └─ 'endpoint:status-changed' 리스너
   └─ Endpoint Store 업데이트
   └─ Toast 알림 표시

4. 프론트엔드: UI 자동 업데이트
   └─ Dashboard StatusCard 업데이트
   └─ Endpoint List 업데이트
   └─ EndpointDetail 업데이트
```

---

## 구현 체크리스트

### Phase 1: Socket.io 백엔드 설정
- [ ] WebsocketGateway 생성
- [ ] 클라이언트 연결/해제 처리
- [ ] Room 기반 구독 구현
- [ ] 브로드캐스트 메서드 구현

### Phase 2: 실시간 이벤트 발송
- [ ] HealthCheckProcessor에서 이벤트 발송
- [ ] EndpointService CRUD에서 이벤트 발송
- [ ] IncidentService에서 이벤트 발송
- [ ] 이벤트 데이터 구조 정의

### Phase 3: Socket.io 클라이언트 설정
- [ ] SocketService 생성
- [ ] 자동 재연결 로직
- [ ] App.tsx에서 초기화

### Phase 4: 실시간 상태 업데이트
- [ ] EndpointStore WebSocket 통합
- [ ] IncidentStore WebSocket 통합
- [ ] UI 자동 업데이트

### Phase 5: 토스트 알림 시스템
- [ ] ToastStore 생성
- [ ] ToastContainer 컴포넌트 구현
- [ ] WebSocket 이벤트에서 토스트 표시

### Phase 6: 구독 관리
- [ ] SubscriptionStore 생성
- [ ] 페이지별 구독 로직
- [ ] 메모리 누수 방지

### Phase 7: 연결 상태 표시
- [ ] ConnectionStatus 컴포넌트
- [ ] Header에 통합
- [ ] 상태별 UI 표시

### Phase 8: 에러 처리 및 재시도
- [ ] 연결 에러 처리
- [ ] 타임아웃 처리
- [ ] 재시도 로직

### Phase 9: 백엔드 이벤트 통합
- [ ] WebsocketModule을 app.module.ts에 등록
- [ ] 모든 서비스에서 WebsocketGateway 주입
- [ ] 이벤트 발송 확인

---

## 기술 스택

| 분류 | 기술 | 목적 |
|------|------|------|
| WebSocket 라이브러리 | Socket.io | 실시간 양방향 통신 |
| 백엔드 WebSocket | @nestjs/websockets | NestJS 기반 Gateway |
| 상태 관리 | Zustand | 실시간 상태 동기화 |
| 알림 UI | Custom Toast | 상태 변경 알림 |

---

## 주요 구현 포인트

### 1. Room 기반 구독
- 모든 엔드포인트 구독: `all-endpoints` room
- 특정 엔드포인트 구독: `endpoint:{endpointId}` room
- 효율적인 메시지 라우팅

### 2. 자동 재연결
- 지수 백오프 전략
- 최대 재시도 횟수 제한
- 연결 상태 추적

### 3. 성능 최적화
- 불필요한 리렌더링 방지
- 선택적 구독으로 네트워크 트래픽 최소화
- 토스트 최대 개수 제한

### 4. 타입 안정성
- 모든 WebSocket 이벤트에 타입 정의
- 에러 처리 타입화

---

**문서 작성**: 2025-11-16
**상태**: 설계 중
