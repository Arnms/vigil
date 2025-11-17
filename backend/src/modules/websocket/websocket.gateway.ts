import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'
import { Logger } from '@nestjs/common'

@WebSocketGateway({
  cors: {
    origin: 'http://localhost:5173',
    credentials: true,
  },
  namespace: '/',
})
export class WebsocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server

  private readonly logger = new Logger(WebsocketGateway.name)
  private clientSessions = new Map<string, Set<string>>() // socketId → rooms

  /**
   * 클라이언트 연결 처리
   */
  handleConnection(client: Socket): void {
    this.logger.log(`Client connected: ${client.id}`)
    client.emit('connected', { clientId: client.id, message: '서버에 연결되었습니다.' })
  }

  /**
   * 클라이언트 연결 해제 처리
   */
  handleDisconnect(client: Socket): void {
    this.logger.log(`Client disconnected: ${client.id}`)
    this.clientSessions.delete(client.id)
  }

  /**
   * 모든 엔드포인트 구독
   */
  @SubscribeMessage('subscribe:all')
  handleSubscribeAll(client: Socket): void {
    const room = 'all-endpoints'
    client.join(room)
    this.logger.log(`Client ${client.id} subscribed to ${room}`)

    // 클라이언트의 room 목록 저장
    if (!this.clientSessions.has(client.id)) {
      this.clientSessions.set(client.id, new Set())
    }
    this.clientSessions.get(client.id)?.add(room)
  }

  /**
   * 특정 엔드포인트 구독
   */
  @SubscribeMessage('subscribe:endpoint')
  handleSubscribeEndpoint(client: Socket, data: { endpointId: string }): void {
    if (!data.endpointId) {
      return
    }

    const room = `endpoint:${data.endpointId}`
    client.join(room)
    this.logger.log(`Client ${client.id} subscribed to ${room}`)

    // 클라이언트의 room 목록 저장
    if (!this.clientSessions.has(client.id)) {
      this.clientSessions.set(client.id, new Set())
    }
    this.clientSessions.get(client.id)?.add(room)
  }

  /**
   * 엔드포인트 구독 해제
   */
  @SubscribeMessage('unsubscribe:endpoint')
  handleUnsubscribeEndpoint(client: Socket, data: { endpointId: string }): void {
    if (!data.endpointId) {
      return
    }

    const room = `endpoint:${data.endpointId}`
    client.leave(room)
    this.logger.log(`Client ${client.id} unsubscribed from ${room}`)

    // 클라이언트의 room 목록에서 제거
    this.clientSessions.get(client.id)?.delete(room)
  }

  /**
   * 모든 엔드포인트 구독 해제
   */
  @SubscribeMessage('unsubscribe:all')
  handleUnsubscribeAll(client: Socket): void {
    const rooms = this.clientSessions.get(client.id) || new Set()
    rooms.forEach((room) => {
      client.leave(room)
    })
    this.clientSessions.delete(client.id)
    this.logger.log(`Client ${client.id} unsubscribed from all rooms`)
  }

  /**
   * 상태 변경 이벤트 브로드캐스트
   */
  broadcastStatusChange(endpointId: string, statusData: {
    endpointId: string
    previousStatus: string
    currentStatus: string
    timestamp: Date
    responseTime: number
    errorMessage?: string
    endpointName?: string
  }): void {
    this.server.to(`endpoint:${endpointId}`).emit('endpoint:status-changed', statusData)
    this.server.to('all-endpoints').emit('endpoint:status-changed', statusData)
    this.logger.log(`Broadcasted status change for endpoint ${endpointId}: ${statusData.currentStatus}`)
  }

  /**
   * 체크 완료 이벤트 브로드캐스트
   */
  broadcastCheckCompleted(endpointId: string, checkData: {
    endpointId: string
    status: 'success' | 'failure'
    responseTime: number
    statusCode?: number
    errorMessage?: string
    endpointName?: string
  }): void {
    this.server.to(`endpoint:${endpointId}`).emit('check:completed', checkData)
    this.server.to('all-endpoints').emit('check:completed', checkData)
    this.logger.log(`Broadcasted check completion for endpoint ${endpointId}`)
  }

  /**
   * 인시던트 시작 이벤트 브로드캐스트
   */
  broadcastIncidentStarted(endpointId: string, incidentData: {
    incidentId: string
    endpointId: string
    endpointName: string
    startedAt: Date
    failureCount: number
  }): void {
    this.server.to(`endpoint:${endpointId}`).emit('incident:started', incidentData)
    this.server.to('all-endpoints').emit('incident:started', incidentData)
    this.logger.log(`Incident started for endpoint ${endpointId}: ${incidentData.incidentId}`)
  }

  /**
   * 인시던트 해결 이벤트 브로드캐스트
   */
  broadcastIncidentResolved(endpointId: string, incidentData: {
    incidentId: string
    endpointId: string
    endpointName: string
    resolvedAt: Date
    duration: number
  }): void {
    this.server.to(`endpoint:${endpointId}`).emit('incident:resolved', incidentData)
    this.server.to('all-endpoints').emit('incident:resolved', incidentData)
    this.logger.log(`Incident resolved for endpoint ${endpointId}: ${incidentData.incidentId}`)
  }

  /**
   * 엔드포인트 생성 이벤트 브로드캐스트
   */
  broadcastEndpointCreated(endpointData: {
    endpointId: string
    name: string
    url: string
    method: string
  }): void {
    this.server.emit('endpoint:created', endpointData)
    this.logger.log(`Endpoint created: ${endpointData.endpointId}`)
  }

  /**
   * 엔드포인트 수정 이벤트 브로드캐스트
   */
  broadcastEndpointUpdated(endpointData: {
    endpointId: string
    changes: Record<string, any>
  }): void {
    this.server.emit('endpoint:updated', endpointData)
    this.logger.log(`Endpoint updated: ${endpointData.endpointId}`)
  }

  /**
   * 엔드포인트 삭제 이벤트 브로드캐스트
   */
  broadcastEndpointDeleted(endpointData: {
    endpointId: string
    name: string
  }): void {
    this.server.emit('endpoint:deleted', endpointData)
    this.logger.log(`Endpoint deleted: ${endpointData.endpointId}`)
  }

  /**
   * 현재 연결된 클라이언트 수 반환
   */
  getClientCount(): number {
    return this.server.engine.clientsCount
  }

  /**
   * 특정 room의 클라이언트 수 반환
   */
  getRoomClientCount(room: string): number {
    return this.server.sockets.adapter.rooms.get(room)?.size ?? 0
  }
}
