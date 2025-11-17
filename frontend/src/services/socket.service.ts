import { io, Socket } from 'socket.io-client'

type SocketCallback = (data: any) => void

class SocketService {
  private socket: Socket | null = null
  private url: string = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private baseDelay = 1000

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
   * 기본 소켓 리스너 설정
   */
  private setupListeners(): void {
    if (!this.socket) return

    // 연결 성공
    this.socket.on('connect', () => {
      console.log('✅ Socket connected:', this.socket?.id)
      this.reconnectAttempts = 0
    })

    // 연결 실패
    this.socket.on('connect_error', (error: Error) => {
      console.error('❌ Socket connection error:', error.message)
    })

    // 연결 해제
    this.socket.on('disconnect', (reason: string) => {
      console.log('⚠️ Socket disconnected:', reason)
    })

    // 자동 재연결 실패
    this.socket.on('reconnect_failed', () => {
      console.error('❌ Socket reconnection failed after', this.maxReconnectAttempts, 'attempts')
    })

    // 재연결 시도
    this.socket.on('reconnect_attempt', () => {
      this.reconnectAttempts++
      console.log(`🔄 Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`)
    })
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
}

// Singleton 인스턴스
export const socketService = new SocketService()
