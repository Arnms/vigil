import { io, Socket } from 'socket.io-client'

type SocketCallback = (data: any) => void

class SocketService {
  private socket: Socket | null = null
  private url: string = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'
  private reconnectAttempts = 0
  private maxReconnectAttempts = 10
  private baseDelay = 1000
  private maxDelay = 30000 // 최대 30초 대기
  private connectionTimeout: ReturnType<typeof setTimeout> | null = null
  private lastConnectionError: Error | null = null

  /**
   * Socket.io 연결 생성 및 초기화
   */
  connect(): Socket {
    if (this.socket?.connected) {
      return this.socket
    }

    this.socket = io(this.url, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: this.baseDelay,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: this.maxReconnectAttempts,
      autoConnect: true,
    })

    this.setupListeners()
    return this.socket
  }

  /**
   * 기본 소켓 리스너 설정 (에러 처리 강화)
   */
  private setupListeners(): void {
    if (!this.socket) return

    // 연결 성공
    this.socket.on('connect', () => {
      console.log('✅ Socket connected:', this.socket?.id)
      this.reconnectAttempts = 0
      this.lastConnectionError = null

      // 연결 타임아웃 제거
      if (this.connectionTimeout) {
        clearTimeout(this.connectionTimeout)
        this.connectionTimeout = null
      }
    })

    // 연결 에러 (더 나은 에러 처리)
    this.socket.on('connect_error', (error: Error) => {
      this.lastConnectionError = error
      console.error('❌ Socket connection error:', {
        message: error.message,
        type: error.constructor.name,
        timestamp: new Date().toISOString(),
      })

      // 네트워크 에러 로깅
      if (error.message.includes('NetworkError') || error.message.includes('timeout')) {
        console.error('⚠️ Network connectivity issue detected')
      }
    })

    // 연결 해제
    this.socket.on('disconnect', (reason: string) => {
      console.log('⚠️ Socket disconnected:', {
        reason,
        timestamp: new Date().toISOString(),
      })

      // 서버 에러로 인한 해제는 수동 재연결 필요
      if (reason === 'io server disconnect') {
        console.error('🔴 Server disconnected the client. Manual reconnection needed.')
        this.reconnectAttempts = 0
      }
    })

    // 자동 재연결 실패
    this.socket.on('reconnect_failed', () => {
      console.error('❌ Socket reconnection failed after', this.maxReconnectAttempts, 'attempts')
      console.error('Last connection error:', this.lastConnectionError?.message)
    })

    // 재연결 시도 (지수 백오프)
    this.socket.on('reconnect_attempt', () => {
      this.reconnectAttempts++
      const backoffDelay = Math.min(
        this.baseDelay * Math.pow(2, this.reconnectAttempts - 1),
        this.maxDelay
      )
      console.log(
        `🔄 Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`,
        `(delay: ${backoffDelay}ms)`
      )

      // 연결 타임아웃 설정 (30초)
      this.setConnectionTimeout()
    })

    // 에러 이벤트 (전역)
    this.socket.on('error', (error: any) => {
      console.error('❌ Socket error event:', error)
    })
  }

  /**
   * 연결 타임아웃 설정 (30초)
   */
  private setConnectionTimeout(): void {
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout)
    }

    this.connectionTimeout = setTimeout(() => {
      if (this.socket && !this.socket.connected) {
        console.warn('⏱️ Connection timeout after 30s, attempting to reconnect...')
        this.socket.disconnect()
        this.socket.connect()
      }
    }, 30000)
  }

  /**
   * Socket 인스턴스 반환
   */
  getSocket(): Socket | null {
    return this.socket
  }

  /**
   * 연결 상태 확인
   */
  isConnected(): boolean {
    return this.socket?.connected ?? false
  }

  /**
   * Socket 연결 해제
   */
  disconnect(): void {
    if (this.socket?.connected) {
      this.socket.disconnect()
      this.socket = null
    }
  }

  /**
   * 이벤트 발송 (콜백 선택)
   */
  emit(event: string, data?: any, callback?: SocketCallback): void {
    if (!this.socket?.connected) {
      console.warn(`Socket not connected. Cannot emit ${event}`)
      return
    }

    if (callback) {
      this.socket.emit(event, data, callback)
    } else {
      this.socket.emit(event, data)
    }
  }

  /**
   * 이벤트 리스너 등록
   */
  on(event: string, callback: SocketCallback): void {
    if (this.socket) {
      this.socket.on(event, callback)
    }
  }

  /**
   * 이벤트 리스너 제거
   */
  off(event: string, callback?: SocketCallback): void {
    if (this.socket) {
      this.socket.off(event, callback)
    }
  }

  /**
   * 한 번만 실행되는 이벤트 리스너
   */
  once(event: string, callback: SocketCallback): void {
    if (this.socket) {
      this.socket.once(event, callback)
    }
  }

  /**
   * 모든 엔드포인트 구독 요청
   */
  subscribeToAllEndpoints(): void {
    if (!this.socket?.connected) {
      console.warn('Socket not connected. Cannot subscribe to all endpoints')
      return
    }
    this.emit('subscribe:all')
  }

  /**
   * 특정 엔드포인트 구독 요청
   */
  subscribeToEndpoint(endpointId: string): void {
    if (!this.socket?.connected) {
      console.warn(`Socket not connected. Cannot subscribe to endpoint ${endpointId}`)
      return
    }
    this.emit('subscribe:endpoint', { endpointId })
  }

  /**
   * 특정 엔드포인트 구독 해제 요청
   */
  unsubscribeFromEndpoint(endpointId: string): void {
    if (!this.socket?.connected) {
      console.warn(`Socket not connected. Cannot unsubscribe from endpoint ${endpointId}`)
      return
    }
    this.emit('unsubscribe:endpoint', { endpointId })
  }

  /**
   * 마지막 연결 에러 조회
   */
  getLastError(): Error | null {
    return this.lastConnectionError
  }

  /**
   * 재연결 시도 횟수 조회
   */
  getReconnectAttempts(): number {
    return this.reconnectAttempts
  }

  /**
   * 연결 상태 상세 정보
   */
  getConnectionStatus(): {
    connected: boolean
    reconnectAttempts: number
    maxReconnectAttempts: number
    lastError: Error | null
    socketId: string | null
  } {
    return {
      connected: this.socket?.connected ?? false,
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts,
      lastError: this.lastConnectionError,
      socketId: this.socket?.id ?? null,
    }
  }

  /**
   * 수동 재연결
   */
  reconnect(): void {
    if (this.socket) {
      this.reconnectAttempts = 0
      this.socket.disconnect()
      this.socket.connect()
      console.log('🔄 Manual reconnection initiated')
    }
  }

  /**
   * 정리 (언마운트 시 호출)
   */
  cleanup(): void {
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout)
      this.connectionTimeout = null
    }
  }
}

// Singleton 인스턴스
export const socketService = new SocketService()
