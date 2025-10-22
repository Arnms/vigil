import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CacheManagerService } from './cache-manager.service';

describe('CacheManagerService', () => {
  let service: CacheManagerService;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'redis') {
        return {
          host: 'localhost',
          port: 6379,
          password: undefined,
          db: 0,
        };
      }
      return undefined;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheManagerService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<CacheManagerService>(CacheManagerService);
  });

  afterEach(async () => {
    if (service) {
      await service.clearAll();
      await service.onModuleDestroy();
    }
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('set and get', () => {
    it('should set and retrieve a cache entry', async () => {
      const key = 'test-key';
      const value = { data: 'test-data' };

      await service.set(key, value);
      const result = await service.get(key);

      expect(result).toEqual(value);
    });

    it('should return null for non-existent key', async () => {
      const result = await service.get('non-existent-key');
      expect(result).toBeNull();
    });

    it('should support different data types', async () => {
      const testCases = [
        { key: 'string-key', value: 'test-string' },
        { key: 'number-key', value: 42 },
        { key: 'object-key', value: { nested: { value: true } } },
        { key: 'array-key', value: [1, 2, 3] },
      ];

      for (const { key, value } of testCases) {
        await service.set(key, value);
        const result = await service.get(key);
        expect(result).toEqual(value);
      }
    });
  });

  describe('delete', () => {
    it('should delete a cache entry', async () => {
      const key = 'delete-test-key';
      const value = { data: 'test' };

      await service.set(key, value);
      let result = await service.get(key);
      expect(result).toEqual(value);

      await service.delete(key);
      result = await service.get(key);
      expect(result).toBeNull();
    });

    it('should handle deleting non-existent keys gracefully', async () => {
      expect(async () => {
        await service.delete('non-existent-key');
      }).not.toThrow();
    });
  });

  describe('deletePattern', () => {
    it('should delete multiple keys matching a pattern', async () => {
      const testCases = [
        { key: 'uptime:endpoint-1', value: 99.5 },
        { key: 'uptime:endpoint-2', value: 98.3 },
        { key: 'response-time:endpoint-1', value: 150 },
      ];

      for (const { key, value } of testCases) {
        await service.set(key, value);
      }

      // Delete all keys matching 'uptime:*'
      await service.deletePattern('uptime:*');

      // uptime keys should be null
      expect(await service.get('uptime:endpoint-1')).toBeNull();
      expect(await service.get('uptime:endpoint-2')).toBeNull();

      // response-time key should still exist
      expect(await service.get('response-time:endpoint-1')).toEqual(150);
    });

    it('should handle wildcard patterns correctly', async () => {
      const testCases = [
        { key: 'stats:overview', value: { total: 5 } },
        { key: 'stats:endpoint:1', value: 99.5 },
        { key: 'stats:endpoint:2', value: 98.3 },
        { key: 'other:data', value: 'should-remain' },
      ];

      for (const { key, value } of testCases) {
        await service.set(key, value);
      }

      // Delete all keys starting with 'stats:*'
      await service.deletePattern('stats:*');

      // stats keys should be null
      expect(await service.get('stats:overview')).toBeNull();
      expect(await service.get('stats:endpoint:1')).toBeNull();
      expect(await service.get('stats:endpoint:2')).toBeNull();

      // other:data key should still exist
      expect(await service.get('other:data')).toEqual('should-remain');
    });
  });

  describe('clearAll', () => {
    it('should clear all cache entries', async () => {
      const testCases = [
        { key: 'key1', value: 'value1' },
        { key: 'key2', value: 'value2' },
        { key: 'key3', value: 'value3' },
      ];

      for (const { key, value } of testCases) {
        await service.set(key, value);
      }

      // Verify entries exist
      expect(await service.get('key1')).toEqual('value1');
      expect(await service.get('key2')).toEqual('value2');

      // Clear all
      await service.clearAll();

      // All should be null
      expect(await service.get('key1')).toBeNull();
      expect(await service.get('key2')).toBeNull();
      expect(await service.get('key3')).toBeNull();
    });
  });

  describe('health check', () => {
    it('should indicate health status', () => {
      // Service should report connection status
      const isHealthy = service.isHealthy();
      expect(typeof isHealthy).toBe('boolean');
    });
  });
});
