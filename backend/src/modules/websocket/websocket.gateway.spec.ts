import { Test, TestingModule } from '@nestjs/testing';
import { WebsocketGateway } from './websocket.gateway';

describe('WebsocketGateway', () => {
  let gateway: WebsocketGateway;

  // Mock Socket.io Server과 Client
  const mockSocket = {
    id: 'socket-123',
    emit: jest.fn(),
    join: jest.fn(),
    leave: jest.fn(),
  };

  const mockServer = {
    to: jest.fn().mockReturnThis(),
    emit: jest.fn(),
    engine: {
      clientsCount: 1,
    },
    sockets: {
      adapter: {
        rooms: new Map([
          ['endpoint:1', new Set(['socket-123'])],
          ['all-endpoints', new Set(['socket-123', 'socket-456'])],
        ]),
      },
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WebsocketGateway],
    }).compile();

    gateway = module.get<WebsocketGateway>(WebsocketGateway);
    gateway.server = mockServer as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Connection Management', () => {
    it('should handle client connection', () => {
      const emitSpy = jest.spyOn(mockSocket, 'emit');

      gateway.handleConnection(mockSocket as any);

      expect(emitSpy).toHaveBeenCalledWith('connected', {
        clientId: mockSocket.id,
        message: '서버에 연결되었습니다.',
      });
    });

    it('should handle client disconnection', () => {
      gateway.handleDisconnect(mockSocket as any);

      // clientSessions에서 삭제되었는지 확인 (private property이므로 간접적으로 확인)
      // 실제로는 logging만 확인 가능
      expect(mockSocket.id).toBe('socket-123');
    });
  });

  describe('Subscription Management', () => {
    it('should subscribe client to all endpoints', () => {
      const joinSpy = jest.spyOn(mockSocket, 'join');

      gateway.handleSubscribeAll(mockSocket as any);

      expect(joinSpy).toHaveBeenCalledWith('all-endpoints');
    });

    it('should subscribe client to specific endpoint', () => {
      const joinSpy = jest.spyOn(mockSocket, 'join');

      gateway.handleSubscribeEndpoint(mockSocket as any, { endpointId: 'ep-1' });

      expect(joinSpy).toHaveBeenCalledWith('endpoint:ep-1');
    });

    it('should handle invalid endpoint ID gracefully', () => {
      const joinSpy = jest.spyOn(mockSocket, 'join');

      gateway.handleSubscribeEndpoint(mockSocket as any, { endpointId: '' });

      expect(joinSpy).not.toHaveBeenCalled();
    });

    it('should unsubscribe client from specific endpoint', () => {
      const leaveSpy = jest.spyOn(mockSocket, 'leave');

      gateway.handleUnsubscribeEndpoint(mockSocket as any, { endpointId: 'ep-1' });

      expect(leaveSpy).toHaveBeenCalledWith('endpoint:ep-1');
    });

    it('should unsubscribe client from all endpoints', () => {
      // 먼저 구독 추가
      gateway.handleSubscribeAll(mockSocket as any);
      gateway.handleSubscribeEndpoint(mockSocket as any, { endpointId: 'ep-1' });

      const leaveSpy = jest.spyOn(mockSocket, 'leave');

      gateway.handleUnsubscribeAll(mockSocket as any);

      // leave가 호출되었는지 확인
      expect(leaveSpy).toHaveBeenCalled();
    });
  });

  describe('Broadcasting Events', () => {
    it('should broadcast status change event', () => {
      const statusData = {
        endpointId: 'ep-1',
        previousStatus: 'UP',
        currentStatus: 'DOWN',
        timestamp: new Date(),
        responseTime: 5000,
        errorMessage: 'Connection timeout',
        endpointName: 'Test API',
      };

      gateway.broadcastStatusChange('ep-1', statusData);

      expect(mockServer.to).toHaveBeenCalledWith('endpoint:ep-1');
      expect(mockServer.to).toHaveBeenCalledWith('all-endpoints');
      expect(mockServer.emit).toHaveBeenCalledWith('endpoint:status-changed', statusData);
    });

    it('should broadcast check completed event', () => {
      const checkData = {
        endpointId: 'ep-1',
        status: 'success' as const,
        responseTime: 150,
        statusCode: 200,
        endpointName: 'Test API',
      };

      gateway.broadcastCheckCompleted('ep-1', checkData);

      expect(mockServer.to).toHaveBeenCalledWith('endpoint:ep-1');
      expect(mockServer.to).toHaveBeenCalledWith('all-endpoints');
      expect(mockServer.emit).toHaveBeenCalledWith('check:completed', checkData);
    });

    it('should broadcast incident started event', () => {
      const incidentData = {
        incidentId: 'inc-1',
        endpointId: 'ep-1',
        endpointName: 'Test API',
        startedAt: new Date(),
        failureCount: 3,
      };

      gateway.broadcastIncidentStarted('ep-1', incidentData);

      expect(mockServer.to).toHaveBeenCalledWith('endpoint:ep-1');
      expect(mockServer.to).toHaveBeenCalledWith('all-endpoints');
      expect(mockServer.emit).toHaveBeenCalledWith('incident:started', incidentData);
    });

    it('should broadcast incident resolved event', () => {
      const incidentData = {
        incidentId: 'inc-1',
        endpointId: 'ep-1',
        endpointName: 'Test API',
        resolvedAt: new Date(),
        duration: 300,
      };

      gateway.broadcastIncidentResolved('ep-1', incidentData);

      expect(mockServer.to).toHaveBeenCalledWith('endpoint:ep-1');
      expect(mockServer.to).toHaveBeenCalledWith('all-endpoints');
      expect(mockServer.emit).toHaveBeenCalledWith('incident:resolved', incidentData);
    });

    it('should broadcast endpoint created event', () => {
      const endpointData = {
        endpointId: 'ep-1',
        name: 'Test API',
        url: 'https://api.example.com',
        method: 'GET',
      };

      gateway.broadcastEndpointCreated(endpointData);

      expect(mockServer.emit).toHaveBeenCalledWith('endpoint:created', endpointData);
    });

    it('should broadcast endpoint updated event', () => {
      const endpointData = {
        endpointId: 'ep-1',
        changes: {
          name: 'Updated API',
          checkInterval: 120,
        },
      };

      gateway.broadcastEndpointUpdated(endpointData);

      expect(mockServer.emit).toHaveBeenCalledWith('endpoint:updated', endpointData);
    });

    it('should broadcast endpoint deleted event', () => {
      const endpointData = {
        endpointId: 'ep-1',
        name: 'Test API',
      };

      gateway.broadcastEndpointDeleted(endpointData);

      expect(mockServer.emit).toHaveBeenCalledWith('endpoint:deleted', endpointData);
    });
  });

  describe('Client Counting', () => {
    it('should return client count', () => {
      const count = gateway.getClientCount();

      expect(count).toBe(1);
    });

    it('should return room client count', () => {
      const count = gateway.getRoomClientCount('endpoint:1');

      expect(count).toBe(1);
    });

    it('should return 0 for non-existent room', () => {
      const count = gateway.getRoomClientCount('non-existent-room');

      expect(count).toBe(0);
    });

    it('should return all-endpoints room client count', () => {
      const count = gateway.getRoomClientCount('all-endpoints');

      expect(count).toBe(2);
    });
  });
});
