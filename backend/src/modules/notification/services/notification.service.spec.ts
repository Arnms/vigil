import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { DuplicatePreventionService } from './duplicate-prevention.service';
import { NotificationChannel, NotificationType } from '../notification-channel.entity';
import { NotificationStrategy } from '../strategies/notification.strategy';

describe('NotificationService', () => {
  let service: NotificationService;
  let channelRepository: Repository<NotificationChannel>;
  let duplicatePreventionService: DuplicatePreventionService;

  // Mock Strategy
  const mockEmailStrategy: NotificationStrategy = {
    send: jest.fn().mockResolvedValue(undefined),
  };

  const mockSlackStrategy: NotificationStrategy = {
    send: jest.fn().mockResolvedValue(undefined),
  };

  const mockChannel: NotificationChannel = {
    id: 'channel-1',
    name: 'Test Email Channel',
    type: NotificationType.EMAIL,
    config: { recipients: ['test@example.com'] },
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        {
          provide: DuplicatePreventionService,
          useValue: {
            isDuplicate: jest.fn().mockResolvedValue(false),
            markSent: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: getRepositoryToken(NotificationChannel),
          useValue: {
            create: jest.fn().mockReturnValue(mockChannel),
            save: jest.fn().mockResolvedValue(mockChannel),
            find: jest.fn().mockResolvedValue([mockChannel]),
            findOne: jest.fn().mockResolvedValue(mockChannel),
            createQueryBuilder: jest.fn().mockReturnValue({
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              orderBy: jest.fn().mockReturnThis(),
              skip: jest.fn().mockReturnThis(),
              take: jest.fn().mockReturnThis(),
              getCount: jest.fn().mockResolvedValue(1),
              getMany: jest.fn().mockResolvedValue([mockChannel]),
            }),
          },
        },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
    channelRepository = module.get<Repository<NotificationChannel>>(
      getRepositoryToken(NotificationChannel),
    );
    duplicatePreventionService = module.get<DuplicatePreventionService>(
      DuplicatePreventionService,
    );

    // Strategy 등록
    service.registerStrategy(NotificationType.EMAIL, mockEmailStrategy);
    service.registerStrategy(NotificationType.SLACK, mockSlackStrategy);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Channel Management', () => {
    describe('createChannel', () => {
      it('should create a new notification channel', async () => {
        const dto = {
          name: 'Test Channel',
          type: NotificationType.EMAIL,
          config: { recipients: ['test@example.com'] },
        };

        const result = await service.createChannel(dto);

        expect(channelRepository.create).toHaveBeenCalledWith(dto);
        expect(channelRepository.save).toHaveBeenCalled();
        expect(result).toEqual(mockChannel);
      });
    });

    describe('findAllChannels', () => {
      it('should return paginated list of channels', async () => {
        const query = {
          page: 1,
          limit: 20,
          sortBy: 'createdAt',
          order: 'DESC',
        };

        const result = await service.findAllChannels(query);

        expect(result.data).toEqual([mockChannel]);
        expect(result.meta.total).toBe(1);
        expect(result.meta.page).toBe(1);
        expect(result.meta.limit).toBe(20);
      });

      it('should filter channels by type', async () => {
        const query = {
          page: 1,
          limit: 20,
          type: NotificationType.EMAIL,
        };

        await service.findAllChannels(query);

        expect(
          channelRepository.createQueryBuilder('channel').where,
        ).toHaveBeenCalled();
      });

      it('should filter channels by active status', async () => {
        const query = {
          page: 1,
          limit: 20,
          isActive: true,
        };

        await service.findAllChannels(query);

        expect(
          channelRepository.createQueryBuilder('channel').andWhere,
        ).toHaveBeenCalled();
      });
    });

    describe('findChannelById', () => {
      it('should return a channel by ID', async () => {
        const result = await service.findChannelById('channel-1');

        expect(channelRepository.findOne).toHaveBeenCalledWith({
          where: { id: 'channel-1' },
        });
        expect(result).toEqual(mockChannel);
      });

      it('should throw NotFoundException if channel not found', async () => {
        jest
          .spyOn(channelRepository, 'findOne')
          .mockResolvedValueOnce(null);

        await expect(service.findChannelById('invalid-id')).rejects.toThrow(
          NotFoundException,
        );
      });
    });

    describe('updateChannel', () => {
      it('should update a notification channel', async () => {
        const dto = { name: 'Updated Channel' };

        const result = await service.updateChannel('channel-1', dto);

        expect(channelRepository.save).toHaveBeenCalled();
        expect(result).toEqual(mockChannel);
      });

      it('should throw error if channel not found', async () => {
        jest
          .spyOn(channelRepository, 'findOne')
          .mockResolvedValueOnce(null);

        await expect(
          service.updateChannel('invalid-id', { name: 'Updated' }),
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe('deleteChannel', () => {
      it('should deactivate a notification channel', async () => {
        await service.deleteChannel('channel-1');

        expect(channelRepository.save).toHaveBeenCalled();
      });

      it('should throw error if channel not found', async () => {
        jest
          .spyOn(channelRepository, 'findOne')
          .mockResolvedValueOnce(null);

        await expect(service.deleteChannel('invalid-id')).rejects.toThrow(
          NotFoundException,
        );
      });
    });
  });

  describe('sendTestNotification', () => {
    it('should send test notification via registered strategy', async () => {
      const result = await service.sendTestNotification('channel-1');

      expect(mockEmailStrategy.send).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('should return failure if strategy is not implemented', async () => {
      const channelWithUnknownType = {
        ...mockChannel,
        type: 'unknown' as any,
      };

      jest
        .spyOn(channelRepository, 'findOne')
        .mockResolvedValueOnce(channelWithUnknownType);

      await expect(
        service.sendTestNotification('channel-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should return error message if strategy fails', async () => {
      jest
        .spyOn(mockEmailStrategy, 'send')
        .mockRejectedValueOnce(new Error('SMTP Error'));

      const result = await service.sendTestNotification('channel-1');

      expect(result.success).toBe(false);
      expect(result.message).toContain('SMTP Error');
    });
  });

  describe('sendAlertOnStatusChange', () => {
    const mockEndpoint = {
      id: 'endpoint-1',
      name: 'Test API',
      url: 'https://api.test.com',
      currentStatus: 'DOWN',
    };

    const mockCheckResult = {
      responseTime: 150,
      statusCode: 500,
      errorMessage: 'Internal Server Error',
    };

    it('should not send alert if status did not change', async () => {
      await service.sendAlertOnStatusChange(
        mockEndpoint,
        'DOWN',
        'DOWN',
        mockCheckResult,
      );

      expect(mockEmailStrategy.send).not.toHaveBeenCalled();
    });

    it('should send alert when endpoint goes DOWN', async () => {
      jest
        .spyOn(channelRepository, 'find')
        .mockResolvedValueOnce([mockChannel]);

      await service.sendAlertOnStatusChange(
        mockEndpoint,
        'UP',
        'DOWN',
        mockCheckResult,
      );

      expect(mockEmailStrategy.send).toHaveBeenCalled();
    });

    it('should send alert when endpoint recovers to UP', async () => {
      jest
        .spyOn(channelRepository, 'find')
        .mockResolvedValueOnce([mockChannel]);

      await service.sendAlertOnStatusChange(
        mockEndpoint,
        'DOWN',
        'UP',
        mockCheckResult,
      );

      expect(mockEmailStrategy.send).toHaveBeenCalled();
    });

    it('should not send alert for non-critical status changes', async () => {
      jest
        .spyOn(channelRepository, 'find')
        .mockResolvedValueOnce([mockChannel]);

      await service.sendAlertOnStatusChange(
        mockEndpoint,
        'UP',
        'DEGRADED',
        mockCheckResult,
      );

      expect(mockEmailStrategy.send).not.toHaveBeenCalled();
    });

    it('should send alert to all active channels', async () => {
      const slackChannel: NotificationChannel = {
        ...mockChannel,
        id: 'channel-2',
        type: NotificationType.SLACK,
      };

      jest
        .spyOn(channelRepository, 'find')
        .mockResolvedValueOnce([mockChannel, slackChannel]);

      await service.sendAlertOnStatusChange(
        mockEndpoint,
        'UP',
        'DOWN',
        mockCheckResult,
      );

      expect(mockEmailStrategy.send).toHaveBeenCalled();
      expect(mockSlackStrategy.send).toHaveBeenCalled();
    });

    it('should warn if no active channels configured', async () => {
      jest.spyOn(channelRepository, 'find').mockResolvedValueOnce([]);
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      await service.sendAlertOnStatusChange(
        mockEndpoint,
        'UP',
        'DOWN',
        mockCheckResult,
      );

      warnSpy.mockRestore();
    });
  });

  describe('Duplicate Prevention', () => {
    it('should prevent duplicate notifications', async () => {
      const mockEndpoint = {
        id: 'endpoint-1',
        name: 'Test API',
        url: 'https://api.test.com',
      };

      const mockCheckResult = {
        responseTime: 100,
        statusCode: 500,
        errorMessage: 'Error',
      };

      jest
        .spyOn(channelRepository, 'find')
        .mockResolvedValueOnce([mockChannel]);

      // First call
      await service.sendAlertOnStatusChange(
        mockEndpoint,
        'UP',
        'DOWN',
        mockCheckResult,
      );

      expect(mockEmailStrategy.send).toHaveBeenCalledTimes(1);

      // Second call - should be prevented by duplicate check
      jest
        .spyOn(duplicatePreventionService, 'isDuplicate')
        .mockResolvedValueOnce(true);

      await service.sendAlertOnStatusChange(
        mockEndpoint,
        'UP',
        'DOWN',
        mockCheckResult,
      );

      // Should still be 1 because duplicate was prevented
      expect(mockEmailStrategy.send).toHaveBeenCalledTimes(1);
    });
  });
});
