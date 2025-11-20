import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { NotificationChannelQueryDto } from './notification-channel-query.dto';
import { NotificationType } from '../notification-channel.entity';

describe('NotificationChannelQueryDto', () => {
  describe('Page validation', () => {
    it('should accept valid page number', async () => {
      const dto = plainToInstance(NotificationChannelQueryDto, { page: 2 });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should transform string page to number', async () => {
      const dto = plainToInstance(NotificationChannelQueryDto, { page: '3' });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
      expect(dto.page).toBe(3);
    });

    it('should reject page less than 1', async () => {
      const dto = plainToInstance(NotificationChannelQueryDto, { page: 0 });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('page');
    });

    it('should reject negative page', async () => {
      const dto = plainToInstance(NotificationChannelQueryDto, { page: -1 });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should use default page value of 1 when not provided', async () => {
      const dto = plainToInstance(NotificationChannelQueryDto, {});
      expect(dto.page).toBe(1);
    });
  });

  describe('Limit validation', () => {
    it('should accept valid limit number', async () => {
      const dto = plainToInstance(NotificationChannelQueryDto, { limit: 50 });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should transform string limit to number', async () => {
      const dto = plainToInstance(NotificationChannelQueryDto, { limit: '25' });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
      expect(dto.limit).toBe(25);
    });

    it('should reject limit less than 1', async () => {
      const dto = plainToInstance(NotificationChannelQueryDto, { limit: 0 });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('limit');
    });

    it('should reject limit greater than 100', async () => {
      const dto = plainToInstance(NotificationChannelQueryDto, { limit: 101 });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('limit');
    });

    it('should accept limit of 100', async () => {
      const dto = plainToInstance(NotificationChannelQueryDto, { limit: 100 });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should use default limit value of 20 when not provided', async () => {
      const dto = plainToInstance(NotificationChannelQueryDto, {});
      expect(dto.limit).toBe(20);
    });
  });

  describe('Type filter validation', () => {
    it('should accept EMAIL type', async () => {
      const dto = plainToInstance(NotificationChannelQueryDto, {
        type: NotificationType.EMAIL,
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should accept SLACK type', async () => {
      const dto = plainToInstance(NotificationChannelQueryDto, {
        type: NotificationType.SLACK,
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should reject invalid type', async () => {
      const dto = plainToInstance(NotificationChannelQueryDto, {
        type: 'INVALID',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('type');
    });

    it('should be optional', async () => {
      const dto = plainToInstance(NotificationChannelQueryDto, {});
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
      expect(dto.type).toBeUndefined();
    });
  });

  describe('IsActive filter validation', () => {
    it('should accept true value', async () => {
      const dto = plainToInstance(NotificationChannelQueryDto, { isActive: true });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should accept false value', async () => {
      const dto = plainToInstance(NotificationChannelQueryDto, { isActive: false });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should transform string "true" to boolean true', async () => {
      const dto = plainToInstance(NotificationChannelQueryDto, { isActive: 'true' });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
      expect(dto.isActive).toBe(true);
    });

    it('should transform boolean true to boolean true', async () => {
      const dto = plainToInstance(NotificationChannelQueryDto, { isActive: true });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
      expect(dto.isActive).toBe(true);
    });

    it('should transform string "false" to boolean false', async () => {
      const dto = plainToInstance(NotificationChannelQueryDto, { isActive: 'false' });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
      // Note: The transform logic converts to false only for 'true' or true
      // so 'false' string becomes false
      expect(dto.isActive).toBe(false);
    });

    it('should be optional', async () => {
      const dto = plainToInstance(NotificationChannelQueryDto, {});
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
      expect(dto.isActive).toBeUndefined();
    });
  });

  describe('SortBy validation', () => {
    it('should accept NAME sort', async () => {
      const dto = plainToInstance(NotificationChannelQueryDto, { sortBy: 'name' });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should accept TYPE sort', async () => {
      const dto = plainToInstance(NotificationChannelQueryDto, { sortBy: 'type' });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should accept CREATED sort', async () => {
      const dto = plainToInstance(NotificationChannelQueryDto, {
        sortBy: 'createdAt',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should reject invalid sortBy value', async () => {
      const dto = plainToInstance(NotificationChannelQueryDto, { sortBy: 'invalid' });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('sortBy');
    });

    it('should use default sortBy value of createdAt when not provided', async () => {
      const dto = plainToInstance(NotificationChannelQueryDto, {});
      expect(dto.sortBy).toBe('createdAt');
    });
  });

  describe('Order validation', () => {
    it('should accept ASC order', async () => {
      const dto = plainToInstance(NotificationChannelQueryDto, { order: 'ASC' });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should accept DESC order', async () => {
      const dto = plainToInstance(NotificationChannelQueryDto, { order: 'DESC' });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should reject invalid order value', async () => {
      const dto = plainToInstance(NotificationChannelQueryDto, { order: 'INVALID' });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('order');
    });

    it('should use default order value of DESC when not provided', async () => {
      const dto = plainToInstance(NotificationChannelQueryDto, {});
      expect(dto.order).toBe('DESC');
    });
  });

  describe('Combined validation', () => {
    it('should accept all valid parameters', async () => {
      const dto = plainToInstance(NotificationChannelQueryDto, {
        page: '2',
        limit: '50',
        type: NotificationType.EMAIL,
        isActive: 'true',
        sortBy: 'name',
        order: 'ASC',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
      expect(dto.page).toBe(2);
      expect(dto.limit).toBe(50);
      expect(dto.isActive).toBe(true);
    });

    it('should handle empty query object', async () => {
      const dto = plainToInstance(NotificationChannelQueryDto, {});
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
      expect(dto.page).toBe(1);
      expect(dto.limit).toBe(20);
      expect(dto.sortBy).toBe('createdAt');
      expect(dto.order).toBe('DESC');
    });

    it('should reject multiple invalid fields', async () => {
      const dto = plainToInstance(NotificationChannelQueryDto, {
        page: 0,
        limit: 150,
        type: 'INVALID',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });
});
