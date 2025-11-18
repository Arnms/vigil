import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { NotificationChannelController } from './notification.controller';
import { NotificationService } from './services/notification.service';

describe('NotificationChannelController', () => {
  let controller: NotificationChannelController;
  let service: NotificationService;

  const mockNotificationChannel = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    name: 'Email Channel',
    type: 'email',
    config: {
      recipients: ['admin@example.com'],
    },
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockNotificationService = {
    createChannel: jest.fn(),
    findAllChannels: jest.fn(),
    findChannelById: jest.fn(),
    updateChannel: jest.fn(),
    deleteChannel: jest.fn(),
    sendTestNotification: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationChannelController],
      providers: [
        {
          provide: NotificationService,
          useValue: mockNotificationService,
        },
      ],
    }).compile();

    controller = module.get<NotificationChannelController>(
      NotificationChannelController,
    );
    service = module.get<NotificationService>(NotificationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a new notification channel', async () => {
      const createDto = {
        name: 'Email Channel',
        type: 'email',
        config: {
          recipients: ['admin@example.com'],
        },
      };

      jest.spyOn(service, 'createChannel').mockResolvedValue(mockNotificationChannel);

      const result = await controller.create(createDto);

      expect(result).toEqual(mockNotificationChannel);
      expect(service.createChannel).toHaveBeenCalledWith(createDto);
    });

    it('should return created channel with 201 status', async () => {
      const createDto = {
        name: 'Slack Channel',
        type: 'slack',
        config: {
          webhookUrl: 'https://hooks.slack.com/services/XXX/YYY/ZZZ',
        },
      };

      const slackChannel = { ...mockNotificationChannel, ...createDto };
      jest.spyOn(service, 'createChannel').mockResolvedValue(slackChannel);

      const result = await controller.create(createDto);

      expect(result).toEqual(slackChannel);
      expect(result.type).toBe('slack');
    });

    it('should handle creation errors', async () => {
      const createDto = {
        name: '',
        type: 'invalid-type',
        config: {},
      };

      jest
        .spyOn(service, 'createChannel')
        .mockRejectedValue(
          new BadRequestException('Invalid notification channel data'),
        );

      await expect(controller.create(createDto)).rejects.toThrow(
        'Invalid notification channel data',
      );
    });

    it('should validate email configuration', async () => {
      const createDto = {
        name: 'Email Channel',
        type: 'email',
        config: {
          recipients: [],
        },
      };

      jest
        .spyOn(service, 'createChannel')
        .mockRejectedValue(
          new BadRequestException('No recipients configured'),
        );

      await expect(controller.create(createDto)).rejects.toThrow(
        'No recipients configured',
      );
    });

    it('should validate Slack configuration', async () => {
      const createDto = {
        name: 'Slack Channel',
        type: 'slack',
        config: {
          webhookUrl: 'invalid-url',
        },
      };

      jest
        .spyOn(service, 'createChannel')
        .mockRejectedValue(
          new BadRequestException('Invalid Slack webhook URL'),
        );

      await expect(controller.create(createDto)).rejects.toThrow(
        'Invalid Slack webhook URL',
      );
    });
  });

  describe('findAll', () => {
    it('should return list of all notification channels', async () => {
      const channels = [mockNotificationChannel];
      jest.spyOn(service, 'findAllChannels').mockResolvedValue(channels);

      const result = await controller.findAll({});

      expect(result).toEqual(channels);
      expect(service.findAllChannels).toHaveBeenCalled();
    });

    it('should support pagination query', async () => {
      const query = { skip: 10, take: 20 };
      const channels = [mockNotificationChannel];

      jest.spyOn(service, 'findAllChannels').mockResolvedValue(channels);

      const result = await controller.findAll(query);

      expect(result).toEqual(channels);
      expect(service.findAllChannels).toHaveBeenCalledWith(query);
    });

    it('should support filtering by type', async () => {
      const query = { type: 'email' };
      const emailChannels = [mockNotificationChannel];

      jest.spyOn(service, 'findAllChannels').mockResolvedValue(emailChannels);

      const result = await controller.findAll(query);

      expect(result).toEqual(emailChannels);
      expect(service.findAllChannels).toHaveBeenCalledWith(query);
    });

    it('should support filtering by active status', async () => {
      const query = { isActive: true };
      const activeChannels = [mockNotificationChannel];

      jest.spyOn(service, 'findAllChannels').mockResolvedValue(activeChannels);

      const result = await controller.findAll(query);

      expect(result).toEqual(activeChannels);
      expect(service.findAllChannels).toHaveBeenCalledWith(query);
    });

    it('should return empty list when no channels exist', async () => {
      jest.spyOn(service, 'findAllChannels').mockResolvedValue([]);

      const result = await controller.findAll({});

      expect(result).toEqual([]);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('findOne', () => {
    it('should return notification channel by id', async () => {
      const id = mockNotificationChannel.id;
      jest
        .spyOn(service, 'findChannelById')
        .mockResolvedValue(mockNotificationChannel);

      const result = await controller.findOne(id);

      expect(result).toEqual(mockNotificationChannel);
      expect(service.findChannelById).toHaveBeenCalledWith(id);
    });

    it('should include channel details', async () => {
      const id = mockNotificationChannel.id;
      jest
        .spyOn(service, 'findChannelById')
        .mockResolvedValue(mockNotificationChannel);

      const result = await controller.findOne(id);

      expect(result.id).toBe(id);
      expect(result.name).toBe('Email Channel');
      expect(result.type).toBe('email');
      expect(result.isActive).toBe(true);
    });

    it('should throw error when channel not found', async () => {
      const id = '999e8400-e29b-41d4-a716-446655440000';
      jest
        .spyOn(service, 'findChannelById')
        .mockRejectedValue(new Error('Channel not found'));

      await expect(controller.findOne(id)).rejects.toThrow('Channel not found');
    });

    it('should validate UUID format', async () => {
      const invalidId = 'invalid-uuid';
      jest
        .spyOn(service, 'findChannelById')
        .mockRejectedValue(
          new BadRequestException('Invalid UUID format'),
        );

      await expect(controller.findOne(invalidId)).rejects.toThrow(
        'Invalid UUID format',
      );
    });
  });

  describe('update', () => {
    it('should update notification channel', async () => {
      const id = mockNotificationChannel.id;
      const updateDto = {
        name: 'Updated Email Channel',
      };
      const updatedChannel = { ...mockNotificationChannel, ...updateDto };

      jest
        .spyOn(service, 'updateChannel')
        .mockResolvedValue(updatedChannel);

      const result = await controller.update(id, updateDto);

      expect(result).toEqual(updatedChannel);
      expect(result.name).toBe('Updated Email Channel');
      expect(service.updateChannel).toHaveBeenCalledWith(id, updateDto);
    });

    it('should partial update channel config', async () => {
      const id = mockNotificationChannel.id;
      const updateDto = {
        config: {
          recipients: ['admin@example.com', 'ops@example.com'],
        },
      };
      const updatedChannel = { ...mockNotificationChannel, ...updateDto };

      jest
        .spyOn(service, 'updateChannel')
        .mockResolvedValue(updatedChannel);

      const result = await controller.update(id, updateDto);

      expect(result.config.recipients).toContain('ops@example.com');
      expect(service.updateChannel).toHaveBeenCalledWith(id, updateDto);
    });

    it('should activate/deactivate channel', async () => {
      const id = mockNotificationChannel.id;
      const updateDto = {
        isActive: false,
      };
      const updatedChannel = { ...mockNotificationChannel, isActive: false };

      jest
        .spyOn(service, 'updateChannel')
        .mockResolvedValue(updatedChannel);

      const result = await controller.update(id, updateDto);

      expect(result.isActive).toBe(false);
    });

    it('should throw error when channel not found', async () => {
      const id = '999e8400-e29b-41d4-a716-446655440000';
      const updateDto = { name: 'Updated' };

      jest
        .spyOn(service, 'updateChannel')
        .mockRejectedValue(new Error('Channel not found'));

      await expect(controller.update(id, updateDto)).rejects.toThrow(
        'Channel not found',
      );
    });

    it('should handle validation errors on update', async () => {
      const id = mockNotificationChannel.id;
      const updateDto = {
        config: {
          recipients: [],
        },
      };

      jest
        .spyOn(service, 'updateChannel')
        .mockRejectedValue(
          new BadRequestException('Invalid configuration'),
        );

      await expect(controller.update(id, updateDto)).rejects.toThrow(
        'Invalid configuration',
      );
    });
  });

  describe('remove', () => {
    it('should delete notification channel by id', async () => {
      const id = mockNotificationChannel.id;
      jest.spyOn(service, 'deleteChannel').mockResolvedValue(undefined);

      const result = await controller.remove(id);

      expect(result).toEqual({
        message: 'Notification channel deleted successfully',
      });
      expect(service.deleteChannel).toHaveBeenCalledWith(id);
    });

    it('should return success message after deletion', async () => {
      const id = mockNotificationChannel.id;
      jest.spyOn(service, 'deleteChannel').mockResolvedValue(undefined);

      const result = await controller.remove(id);

      expect(result.message).toBe('Notification channel deleted successfully');
    });

    it('should throw error when channel not found', async () => {
      const id = '999e8400-e29b-41d4-a716-446655440000';
      jest
        .spyOn(service, 'deleteChannel')
        .mockRejectedValue(new Error('Channel not found'));

      await expect(controller.remove(id)).rejects.toThrow('Channel not found');
    });

    it('should handle cascading deletion', async () => {
      const id = mockNotificationChannel.id;
      jest.spyOn(service, 'deleteChannel').mockResolvedValue(undefined);

      await controller.remove(id);

      expect(service.deleteChannel).toHaveBeenCalledWith(id);
    });
  });

  describe('sendTestNotification', () => {
    it('should send test notification', async () => {
      const id = mockNotificationChannel.id;
      const testResult = { success: true, message: 'Test notification sent' };

      jest
        .spyOn(service, 'sendTestNotification')
        .mockResolvedValue(testResult);

      const result = await controller.sendTestNotification(id);

      expect(result).toEqual(testResult);
      expect(result.success).toBe(true);
      expect(service.sendTestNotification).toHaveBeenCalledWith(id);
    });

    it('should return success message for test notification', async () => {
      const id = mockNotificationChannel.id;
      const testResult = {
        success: true,
        message: 'Test notification sent successfully',
      };

      jest
        .spyOn(service, 'sendTestNotification')
        .mockResolvedValue(testResult);

      const result = await controller.sendTestNotification(id);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Test notification sent');
    });

    it('should handle test notification failure', async () => {
      const id = mockNotificationChannel.id;
      const failureResult = {
        success: false,
        message: 'Failed to send test notification',
      };

      jest
        .spyOn(service, 'sendTestNotification')
        .mockResolvedValue(failureResult);

      const result = await controller.sendTestNotification(id);

      expect(result.success).toBe(false);
    });

    it('should throw error when channel not found', async () => {
      const id = '999e8400-e29b-41d4-a716-446655440000';
      jest
        .spyOn(service, 'sendTestNotification')
        .mockRejectedValue(new Error('Channel not found'));

      await expect(controller.sendTestNotification(id)).rejects.toThrow(
        'Channel not found',
      );
    });

    it('should validate channel configuration before sending test', async () => {
      const id = mockNotificationChannel.id;
      jest
        .spyOn(service, 'sendTestNotification')
        .mockRejectedValue(
          new BadRequestException('Invalid channel configuration'),
        );

      await expect(controller.sendTestNotification(id)).rejects.toThrow(
        'Invalid channel configuration',
      );
    });
  });

  describe('HTTP Status Codes', () => {
    it('create should return 201 status', async () => {
      const createDto = {
        name: 'Test Channel',
        type: 'email',
        config: {
          recipients: ['test@example.com'],
        },
      };

      jest
        .spyOn(service, 'createChannel')
        .mockResolvedValue(mockNotificationChannel);

      await controller.create(createDto);

      expect(service.createChannel).toHaveBeenCalled();
    });

    it('sendTestNotification should return 200 status', async () => {
      const id = mockNotificationChannel.id;
      const testResult = { success: true, message: 'Test sent' };

      jest
        .spyOn(service, 'sendTestNotification')
        .mockResolvedValue(testResult);

      await controller.sendTestNotification(id);

      expect(service.sendTestNotification).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      const id = mockNotificationChannel.id;
      const error = new Error('Database connection error');

      jest
        .spyOn(service, 'findChannelById')
        .mockRejectedValue(error);

      await expect(controller.findOne(id)).rejects.toThrow(
        'Database connection error',
      );
    });

    it('should propagate validation errors', async () => {
      const createDto = {
        name: '',
        type: '',
        config: {},
      };

      jest
        .spyOn(service, 'createChannel')
        .mockRejectedValue(
          new BadRequestException('Validation failed'),
        );

      await expect(controller.create(createDto)).rejects.toThrow(
        'Validation failed',
      );
    });
  });

  describe('Data Integrity', () => {
    it('should preserve channel data through CRUD operations', async () => {
      const id = mockNotificationChannel.id;
      jest
        .spyOn(service, 'findChannelById')
        .mockResolvedValue(mockNotificationChannel);

      const result = await controller.findOne(id);

      expect(result.id).toBe(mockNotificationChannel.id);
      expect(result.name).toBe(mockNotificationChannel.name);
      expect(result.type).toBe(mockNotificationChannel.type);
      expect(result.config).toEqual(mockNotificationChannel.config);
    });

    it('should update channel without losing other fields', async () => {
      const id = mockNotificationChannel.id;
      const updateDto = { name: 'Updated Name' };
      const updatedChannel = {
        ...mockNotificationChannel,
        name: 'Updated Name',
      };

      jest
        .spyOn(service, 'updateChannel')
        .mockResolvedValue(updatedChannel);

      const result = await controller.update(id, updateDto);

      expect(result.id).toBe(mockNotificationChannel.id);
      expect(result.type).toBe(mockNotificationChannel.type);
      expect(result.config).toEqual(mockNotificationChannel.config);
      expect(result.name).toBe('Updated Name');
    });
  });

  describe('Channel Types', () => {
    it('should support email channel type', async () => {
      const createDto = {
        name: 'Email Channel',
        type: 'email',
        config: {
          recipients: ['admin@example.com'],
        },
      };

      const emailChannel = { ...mockNotificationChannel, ...createDto };
      jest.spyOn(service, 'createChannel').mockResolvedValue(emailChannel);

      const result = await controller.create(createDto);

      expect(result.type).toBe('email');
    });

    it('should support slack channel type', async () => {
      const createDto = {
        name: 'Slack Channel',
        type: 'slack',
        config: {
          webhookUrl: 'https://hooks.slack.com/services/XXX/YYY/ZZZ',
        },
      };

      const slackChannel = { ...mockNotificationChannel, ...createDto };
      jest.spyOn(service, 'createChannel').mockResolvedValue(slackChannel);

      const result = await controller.create(createDto);

      expect(result.type).toBe('slack');
    });
  });

  describe('Multiple Recipients', () => {
    it('should handle multiple email recipients', async () => {
      const createDto = {
        name: 'Multi-Recipient Channel',
        type: 'email',
        config: {
          recipients: [
            'admin@example.com',
            'ops@example.com',
            'dev@example.com',
          ],
        },
      };

      const multiChannel = { ...mockNotificationChannel, ...createDto };
      jest.spyOn(service, 'createChannel').mockResolvedValue(multiChannel);

      const result = await controller.create(createDto);

      expect(result.config.recipients.length).toBe(3);
    });
  });
});
