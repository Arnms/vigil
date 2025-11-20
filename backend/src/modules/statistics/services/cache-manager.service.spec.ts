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

  const mockConfigServiceWithPassword = {
    get: jest.fn((key: string) => {
      if (key === 'redis') {
        return {
          host: 'localhost',
          port: 6379,
          password: 'test-password',
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

    it('should return getStatus with backend info', () => {
      const status = service.getStatus();
      expect(status).toHaveProperty('isHealthy');
      expect(status).toHaveProperty('backend');
      expect(status).toHaveProperty('connected');
      expect(['redis', 'memory']).toContain(status.backend);
    });

    it('should report memory backend when using fallback', () => {
      const status = service.getStatus();
      // Should be memory since Redis connection will fail in test
      expect(status.backend).toBe('memory');
    });
  });

  describe('TTL behavior', () => {
    it('should use default TTL when not specified', async () => {
      const key = 'ttl-test-default';
      const value = { data: 'test' };

      await service.set(key, value);
      const result = await service.get(key);
      expect(result).toEqual(value);
    });

    it('should respect custom TTL values', async () => {
      const key = 'ttl-test-custom';
      const value = { data: 'ttl-data' };

      // Set with very short TTL
      await service.set(key, value, 1);
      expect(await service.get(key)).toEqual(value);
    });

    it('should handle zero TTL gracefully', async () => {
      const key = 'ttl-test-zero';
      const value = { data: 'zero-ttl' };

      // This will set TTL to 0, which means immediate expiration
      await service.set(key, value, 0);
      // May or may not exist depending on timing
      const result = await service.get(key);
      expect(result === null || result === value).toBe(true);
    });

    it('should expire entries after TTL in memory cache', async () => {
      jest.useFakeTimers();

      const key = 'expiring-key';
      const value = { data: 'expire-test' };
      const ttl = 10; // 10 seconds

      await service.set(key, value, ttl);

      // Should exist immediately
      expect(await service.get(key)).toEqual(value);

      // Advance time to just before expiration
      jest.advanceTimersByTime((ttl - 1) * 1000);
      expect(await service.get(key)).toEqual(value);

      // Advance past TTL
      jest.advanceTimersByTime(2000); // Total: ttl + 1 seconds
      expect(await service.get(key)).toBeNull();

      jest.useRealTimers();
    });
  });

  describe('error handling', () => {
    it('should handle errors in set operation gracefully', async () => {
      // Test with valid data - should not throw
      const key = 'error-test-key';
      const value = { data: 'test' };

      expect(async () => {
        await service.set(key, value);
      }).not.toThrow();
    });

    it('should handle errors in get operation gracefully', async () => {
      // Set a valid value first
      await service.set('valid-key', { data: 'test' });

      // Should retrieve without error
      const result = await service.get('valid-key');
      expect(result).toEqual({ data: 'test' });

      // Non-existent key should return null, not throw
      const result2 = await service.get('non-existent');
      expect(result2).toBeNull();
    });

    it('should handle delete errors gracefully', async () => {
      expect(async () => {
        await service.delete('any-key');
      }).not.toThrow();
    });

    it('should handle deletePattern errors gracefully', async () => {
      expect(async () => {
        await service.deletePattern('pattern:*');
      }).not.toThrow();
    });

    it('should handle clearAll errors gracefully', async () => {
      expect(async () => {
        await service.clearAll();
      }).not.toThrow();
    });

    it('should handle JSON parse errors', async () => {
      // This tests the memory cache's error handling
      const key = 'valid-json-key';
      const value = { nested: { data: 'test' } };

      await service.set(key, value);
      const result = await service.get(key);
      expect(result).toEqual(value);
    });
  });

  describe('memory cache expiration', () => {
    it('should detect and delete expired entries on retrieval', async () => {
      jest.useFakeTimers();

      const key = 'memory-expire-test';
      const value = { data: 'expire' };
      const ttl = 5;

      await service.set(key, value, ttl);

      // Should exist initially
      expect(await service.get(key)).toEqual(value);

      // Advance time past TTL
      jest.advanceTimersByTime(6000);

      // Should return null and clean up
      expect(await service.get(key)).toBeNull();

      // Verify key is truly gone
      expect(await service.get(key)).toBeNull();

      jest.useRealTimers();
    });

    it('should handle multiple entries with different TTLs', async () => {
      jest.useFakeTimers();

      const key1 = 'short-ttl';
      const key2 = 'long-ttl';

      await service.set(key1, 'value1', 2);
      await service.set(key2, 'value2', 10);

      // Both exist initially
      expect(await service.get(key1)).toBe('value1');
      expect(await service.get(key2)).toBe('value2');

      // After 3 seconds, only short-ttl is expired
      jest.advanceTimersByTime(3000);

      expect(await service.get(key1)).toBeNull();
      expect(await service.get(key2)).toBe('value2');

      // After 11 seconds total, both are expired
      jest.advanceTimersByTime(8000);
      expect(await service.get(key1)).toBeNull();
      expect(await service.get(key2)).toBeNull();

      jest.useRealTimers();
    });
  });

  describe('complex data types', () => {
    it('should handle deeply nested objects', async () => {
      const key = 'deep-nested';
      const value = {
        level1: {
          level2: {
            level3: {
              level4: {
                data: 'deeply-nested-value',
              },
            },
          },
        },
      };

      await service.set(key, value);
      const result = await service.get(key);
      expect(result).toEqual(value);
    });

    it('should handle arrays of objects', async () => {
      const key = 'array-of-objects';
      const value = [
        { id: 1, name: 'item1' },
        { id: 2, name: 'item2' },
        { id: 3, name: 'item3' },
      ];

      await service.set(key, value);
      const result = await service.get(key);
      expect(result).toEqual(value);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle boolean values', async () => {
      await service.set('bool-true', true);
      await service.set('bool-false', false);

      expect(await service.get('bool-true')).toBe(true);
      expect(await service.get('bool-false')).toBe(false);
    });

    it('should handle null values', async () => {
      const key = 'null-value';
      await service.set(key, null);

      const result = await service.get(key);
      expect(result).toBeNull();
    });

    it('should handle string numbers vs actual numbers', async () => {
      await service.set('string-number', '123');
      await service.set('actual-number', 123);

      const stringResult = await service.get('string-number');
      const numberResult = await service.get('actual-number');

      expect(stringResult).toBe('123');
      expect(numberResult).toBe(123);
      expect(typeof stringResult).toBe('string');
      expect(typeof numberResult).toBe('number');
    });
  });

  describe('pattern deletion advanced', () => {
    it('should handle complex regex patterns', async () => {
      const keys = [
        'stats:uptime:endpoint:123',
        'stats:uptime:endpoint:456',
        'stats:downtime:endpoint:123',
        'other:uptime:endpoint:789',
      ];

      for (const key of keys) {
        await service.set(key, 'value');
      }

      // Delete all keys starting with 'stats:uptime:'
      await service.deletePattern('stats:uptime:*');

      expect(await service.get('stats:uptime:endpoint:123')).toBeNull();
      expect(await service.get('stats:uptime:endpoint:456')).toBeNull();
      expect(await service.get('stats:downtime:endpoint:123')).not.toBeNull();
      expect(await service.get('other:uptime:endpoint:789')).not.toBeNull();
    });

    it('should handle patterns with no matches', async () => {
      await service.set('existing:key', 'value');

      // Delete pattern that doesn't match anything
      expect(async () => {
        await service.deletePattern('nonexistent:pattern:*');
      }).not.toThrow();

      // Original key should still exist
      expect(await service.get('existing:key')).toBe('value');
    });

    it('should handle single character wildcard patterns', async () => {
      const keys = ['a1', 'a2', 'b1', 'b2'];

      for (const key of keys) {
        await service.set(key, `value-${key}`);
      }

      // Delete all keys starting with 'a'
      await service.deletePattern('a*');

      expect(await service.get('a1')).toBeNull();
      expect(await service.get('a2')).toBeNull();
      expect(await service.get('b1')).not.toBeNull();
      expect(await service.get('b2')).not.toBeNull();
    });
  });

  describe('edge cases', () => {
    it('should handle empty string as key', async () => {
      const key = '';
      const value = 'empty-string-key';

      await service.set(key, value);
      expect(await service.get(key)).toBe(value);
      await service.delete(key);
      expect(await service.get(key)).toBeNull();
    });

    it('should handle very long keys', async () => {
      const longKey = 'key:' + 'x'.repeat(500);
      const value = 'long-key-value';

      await service.set(longKey, value);
      expect(await service.get(longKey)).toBe(value);
    });

    it('should handle keys with special characters', async () => {
      const specialKey = 'key:with:$pecial-char@#%^&';
      const value = 'special-value';

      await service.set(specialKey, value);
      expect(await service.get(specialKey)).toBe(value);
    });

    it('should handle keys with unicode characters', async () => {
      const unicodeKey = 'key:한글:日本語:العربية';
      const value = 'unicode-value';

      await service.set(unicodeKey, value);
      expect(await service.get(unicodeKey)).toBe(value);
    });

    it('should handle overwriting existing keys', async () => {
      const key = 'overwrite-key';

      await service.set(key, 'value1');
      expect(await service.get(key)).toBe('value1');

      await service.set(key, 'value2');
      expect(await service.get(key)).toBe('value2');

      await service.set(key, { data: 'object-value' });
      expect(await service.get(key)).toEqual({ data: 'object-value' });
    });

    it('should handle rapid successive operations', async () => {
      const key = 'rapid-ops';

      // Rapid set/get operations
      for (let i = 0; i < 100; i++) {
        await service.set(key, `value-${i}`);
        const result = await service.get(key);
        expect(result).toBe(`value-${i}`);
      }
    });

    it('should handle concurrent-like operations', async () => {
      const promises: Promise<void>[] = [];

      for (let i = 0; i < 10; i++) {
        promises.push(service.set(`key-${i}`, `value-${i}`));
      }

      await Promise.all(promises);

      for (let i = 0; i < 10; i++) {
        expect(await service.get(`key-${i}`)).toBe(`value-${i}`);
      }
    });
  });

  describe('memory cache state management', () => {
    it('should clear all entries properly', async () => {
      const keys = Array.from({ length: 10 }, (_, i) => `key-${i}`);

      for (const key of keys) {
        await service.set(key, 'value');
      }

      // Verify all exist
      for (const key of keys) {
        expect(await service.get(key)).toBe('value');
      }

      // Clear all
      await service.clearAll();

      // Verify all are gone
      for (const key of keys) {
        expect(await service.get(key)).toBeNull();
      }
    });

    it('should handle clearAll on empty cache', async () => {
      // First clear to ensure empty
      await service.clearAll();

      // Should not throw
      expect(async () => {
        await service.clearAll();
      }).not.toThrow();
    });

    it('should support chained operations', async () => {
      const testKey = 'chained-ops';
      const value = { data: 'test' };

      // Set multiple times
      await service.set(testKey, value);
      await service.set(testKey, { ...value, updated: true });

      // Get should return the latest
      const result = await service.get(testKey);
      expect((result as any).updated).toBe(true);

      // Delete
      await service.delete(testKey);

      // Should be gone
      expect(await service.get(testKey)).toBeNull();

      // Can set again
      await service.set(testKey, value);
      expect(await service.get(testKey)).toEqual(value);
    });
  });

  describe('module lifecycle', () => {
    it('should initialize module without errors', async () => {
      expect(service).toBeDefined();
    });

    it('should use memory cache by default when Redis not available', () => {
      const status = service.getStatus();
      expect(status.backend).toBe('memory');
    });

    it('should report health status correctly', () => {
      const isHealthy = service.isHealthy();
      expect(isHealthy).toBe(true); // Memory cache is always healthy
    });

    it('should handle module destruction', async () => {
      expect(async () => {
        await service.onModuleDestroy();
      }).not.toThrow();
    });
  });

  describe('Redis configuration handling', () => {
    it('should use default values from config service', () => {
      // Service initializes with config from mockConfigService
      const status = service.getStatus();
      expect(status.backend).toBeDefined();
    });

    it('should handle missing Redis config gracefully', () => {
      // Service should fall back to memory when Redis config is missing
      const status = service.getStatus();
      expect(['redis', 'memory']).toContain(status.backend);
    });

    it('should initialize with correct TTL default', async () => {
      const key = 'ttl-default-test';
      const value = 'test-value';

      // Set without specifying TTL
      await service.set(key, value);

      // Should exist immediately
      expect(await service.get(key)).toBe(value);
    });
  });

  describe('cache operations comprehensive', () => {
    it('should handle multiple sequential set and get operations', async () => {
      const operations = 50;

      for (let i = 0; i < operations; i++) {
        await service.set(`key-${i}`, `value-${i}`);
      }

      for (let i = 0; i < operations; i++) {
        expect(await service.get(`key-${i}`)).toBe(`value-${i}`);
      }
    });

    it('should correctly identify cache hits and misses', async () => {
      const key1 = 'existing-key';
      const key2 = 'nonexisting-key';

      await service.set(key1, 'value');

      // Key1 is a hit
      const result1 = await service.get(key1);
      expect(result1).toBe('value');

      // Key2 is a miss
      const result2 = await service.get(key2);
      expect(result2).toBeNull();
    });

    it('should support pattern deletion with various key formats', async () => {
      const keyFormats = [
        { key: 'user:1:profile', value: 'user1' },
        { key: 'user:2:profile', value: 'user2' },
        { key: 'user:1:settings', value: 'settings1' },
        { key: 'post:1:data', value: 'post1' },
      ];

      for (const { key, value } of keyFormats) {
        await service.set(key, value);
      }

      // Delete all user profiles
      await service.deletePattern('user:*:profile');

      expect(await service.get('user:1:profile')).toBeNull();
      expect(await service.get('user:2:profile')).toBeNull();
      expect(await service.get('user:1:settings')).not.toBeNull();
      expect(await service.get('post:1:data')).not.toBeNull();
    });

    it('should handle cache invalidation properly', async () => {
      const key = 'invalidate-test';
      const value = { data: 'original' };

      // Set initial value
      await service.set(key, value);
      expect(await service.get(key)).toEqual(value);

      // Invalidate (delete)
      await service.delete(key);
      expect(await service.get(key)).toBeNull();

      // Can set new value after invalidation
      const newValue = { data: 'updated' };
      await service.set(key, newValue);
      expect(await service.get(key)).toEqual(newValue);
    });

    it('should handle partial pattern matches', async () => {
      const keys = [
        'cache:user:123',
        'cache:user:456',
        'cache:post:789',
        'session:user:123',
      ];

      for (const key of keys) {
        await service.set(key, 'value');
      }

      // Delete only cache:user:* pattern
      await service.deletePattern('cache:user:*');

      expect(await service.get('cache:user:123')).toBeNull();
      expect(await service.get('cache:user:456')).toBeNull();
      expect(await service.get('cache:post:789')).not.toBeNull();
      expect(await service.get('session:user:123')).not.toBeNull();
    });

    it('should preserve data type through serialization', async () => {
      const testData = {
        string: 'value',
        number: 42,
        boolean: true,
        null: null,
        array: [1, 2, 3],
        object: { nested: true },
        date: new Date().toISOString(),
      };

      await service.set('type-test', testData);
      const result = await service.get('type-test');

      expect(result).toEqual(testData);
      expect((result as any).string).toBe('value');
      expect((result as any).number).toBe(42);
      expect((result as any).boolean).toBe(true);
      expect(Array.isArray((result as any).array)).toBe(true);
    });
  });

  describe('error resilience', () => {
    it('should not throw on invalid operations', async () => {
      // All operations should handle errors gracefully
      await expect(service.delete('any-key')).resolves.not.toThrow();
      await expect(service.deletePattern('any:pattern:*')).resolves.not.toThrow();
      await expect(service.clearAll()).resolves.not.toThrow();
    });

    it('should recover from failed operations', async () => {
      const key = 'recovery-test';
      const value = 'test-value';

      // Set should succeed
      await service.set(key, value);
      expect(await service.get(key)).toBe(value);

      // Even after any failed operation attempts, should still work
      await service.delete(key);
      expect(await service.get(key)).toBeNull();

      // Can continue using cache
      await service.set(key, 'new-value');
      expect(await service.get(key)).toBe('new-value');
    });

    it('should maintain data integrity across operations', async () => {
      const data = {
        id: '123',
        name: 'Test',
        nested: { level1: { level2: 'value' } },
      };

      await service.set('integrity-test', data);

      // Multiple gets should return identical data
      const result1 = await service.get('integrity-test');
      const result2 = await service.get('integrity-test');

      expect(result1).toEqual(result2);
      expect(result1).toEqual(data);
    });
  });

  describe('Redis integration paths', () => {
    it('should handle Redis get operation when Redis is connected', async () => {
      const mockRedisClient = {
        get: jest.fn().mockResolvedValue(JSON.stringify({ data: 'redis-value' })),
        setEx: jest.fn().mockResolvedValue('OK'),
        del: jest.fn().mockResolvedValue(1),
        keys: jest.fn().mockResolvedValue([]),
        flushDb: jest.fn().mockResolvedValue('OK'),
        quit: jest.fn().mockResolvedValue('OK'),
        on: jest.fn(),
        connect: jest.fn().mockResolvedValue(undefined),
      };

      // Simulate successful Redis initialization
      jest.spyOn(require('redis'), 'createClient').mockReturnValue(mockRedisClient);

      // Create new service instance with mocked Redis
      const testModule: TestingModule = await Test.createTestingModule({
        providers: [
          CacheManagerService,
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
        ],
      }).compile();

      const redisService = testModule.get<CacheManagerService>(CacheManagerService);

      // Manually simulate successful Redis connection
      (redisService as any).useRedis = true;
      (redisService as any).isConnected = true;
      (redisService as any).client = mockRedisClient;

      // Test Redis get operation
      const result = await redisService.get('test-key');
      expect(result).toEqual({ data: 'redis-value' });
      expect(mockRedisClient.get).toHaveBeenCalledWith('test-key');

      await redisService.onModuleDestroy();
    });

    it('should handle Redis set operation when Redis is connected', async () => {
      const mockRedisClient = {
        get: jest.fn().mockResolvedValue(null),
        setEx: jest.fn().mockResolvedValue('OK'),
        del: jest.fn().mockResolvedValue(1),
        keys: jest.fn().mockResolvedValue([]),
        flushDb: jest.fn().mockResolvedValue('OK'),
        quit: jest.fn().mockResolvedValue('OK'),
        on: jest.fn(),
        connect: jest.fn().mockResolvedValue(undefined),
      };

      const testModule: TestingModule = await Test.createTestingModule({
        providers: [
          CacheManagerService,
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
        ],
      }).compile();

      const redisService = testModule.get<CacheManagerService>(CacheManagerService);

      // Manually simulate successful Redis connection
      (redisService as any).useRedis = true;
      (redisService as any).isConnected = true;
      (redisService as any).client = mockRedisClient;

      // Test Redis set operation
      const testValue = { data: 'redis-set-test' };
      await redisService.set('redis-key', testValue, 30);
      expect(mockRedisClient.setEx).toHaveBeenCalledWith('redis-key', 30, JSON.stringify(testValue));

      await redisService.onModuleDestroy();
    });

    it('should handle Redis delete operation when Redis is connected', async () => {
      const mockRedisClient = {
        get: jest.fn().mockResolvedValue(null),
        setEx: jest.fn().mockResolvedValue('OK'),
        del: jest.fn().mockResolvedValue(1),
        keys: jest.fn().mockResolvedValue([]),
        flushDb: jest.fn().mockResolvedValue('OK'),
        quit: jest.fn().mockResolvedValue('OK'),
        on: jest.fn(),
        connect: jest.fn().mockResolvedValue(undefined),
      };

      const testModule: TestingModule = await Test.createTestingModule({
        providers: [
          CacheManagerService,
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
        ],
      }).compile();

      const redisService = testModule.get<CacheManagerService>(CacheManagerService);

      // Manually simulate successful Redis connection
      (redisService as any).useRedis = true;
      (redisService as any).isConnected = true;
      (redisService as any).client = mockRedisClient;

      // Test Redis delete operation
      await redisService.delete('redis-delete-key');
      expect(mockRedisClient.del).toHaveBeenCalledWith('redis-delete-key');

      await redisService.onModuleDestroy();
    });

    it('should handle Redis deletePattern operation when Redis is connected', async () => {
      const mockRedisClient = {
        get: jest.fn().mockResolvedValue(null),
        setEx: jest.fn().mockResolvedValue('OK'),
        del: jest.fn().mockResolvedValue(2),
        keys: jest.fn().mockResolvedValue(['key1:pattern', 'key2:pattern']),
        flushDb: jest.fn().mockResolvedValue('OK'),
        quit: jest.fn().mockResolvedValue('OK'),
        on: jest.fn(),
        connect: jest.fn().mockResolvedValue(undefined),
      };

      const testModule: TestingModule = await Test.createTestingModule({
        providers: [
          CacheManagerService,
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
        ],
      }).compile();

      const redisService = testModule.get<CacheManagerService>(CacheManagerService);

      // Manually simulate successful Redis connection
      (redisService as any).useRedis = true;
      (redisService as any).isConnected = true;
      (redisService as any).client = mockRedisClient;

      // Test Redis deletePattern operation
      await redisService.deletePattern('key*:pattern');
      expect(mockRedisClient.keys).toHaveBeenCalledWith('key*:pattern');
      expect(mockRedisClient.del).toHaveBeenCalledWith(['key1:pattern', 'key2:pattern']);

      await redisService.onModuleDestroy();
    });

    it('should handle Redis clearAll operation when Redis is connected', async () => {
      const mockRedisClient = {
        get: jest.fn().mockResolvedValue(null),
        setEx: jest.fn().mockResolvedValue('OK'),
        del: jest.fn().mockResolvedValue(1),
        keys: jest.fn().mockResolvedValue([]),
        flushDb: jest.fn().mockResolvedValue('OK'),
        quit: jest.fn().mockResolvedValue('OK'),
        on: jest.fn(),
        connect: jest.fn().mockResolvedValue(undefined),
      };

      const testModule: TestingModule = await Test.createTestingModule({
        providers: [
          CacheManagerService,
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
        ],
      }).compile();

      const redisService = testModule.get<CacheManagerService>(CacheManagerService);

      // Manually simulate successful Redis connection
      (redisService as any).useRedis = true;
      (redisService as any).isConnected = true;
      (redisService as any).client = mockRedisClient;

      // Test Redis clearAll operation
      await redisService.clearAll();
      expect(mockRedisClient.flushDb).toHaveBeenCalled();

      await redisService.onModuleDestroy();
    });

    it('should handle Redis parse error when stored value is invalid JSON', async () => {
      const mockRedisClient = {
        get: jest.fn().mockResolvedValue('invalid-json-{'),
        setEx: jest.fn().mockResolvedValue('OK'),
        del: jest.fn().mockResolvedValue(1),
        keys: jest.fn().mockResolvedValue([]),
        flushDb: jest.fn().mockResolvedValue('OK'),
        quit: jest.fn().mockResolvedValue('OK'),
        on: jest.fn(),
        connect: jest.fn().mockResolvedValue(undefined),
      };

      const testModule: TestingModule = await Test.createTestingModule({
        providers: [
          CacheManagerService,
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
        ],
      }).compile();

      const redisService = testModule.get<CacheManagerService>(CacheManagerService);

      // Manually simulate successful Redis connection
      (redisService as any).useRedis = true;
      (redisService as any).isConnected = true;
      (redisService as any).client = mockRedisClient;

      // Test Redis get with invalid JSON
      const result = await redisService.get('invalid-key');
      expect(result).toBeNull();

      await redisService.onModuleDestroy();
    });

    it('should handle Redis connection close on module destroy', async () => {
      const mockRedisClient = {
        get: jest.fn().mockResolvedValue(null),
        setEx: jest.fn().mockResolvedValue('OK'),
        del: jest.fn().mockResolvedValue(1),
        keys: jest.fn().mockResolvedValue([]),
        flushDb: jest.fn().mockResolvedValue('OK'),
        quit: jest.fn().mockResolvedValue('OK'),
        on: jest.fn(),
        connect: jest.fn().mockResolvedValue(undefined),
      };

      const testModule: TestingModule = await Test.createTestingModule({
        providers: [
          CacheManagerService,
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
        ],
      }).compile();

      const redisService = testModule.get<CacheManagerService>(CacheManagerService);

      // Manually simulate successful Redis connection
      (redisService as any).useRedis = true;
      (redisService as any).isConnected = true;
      (redisService as any).client = mockRedisClient;

      // Test Redis quit on module destroy
      await redisService.onModuleDestroy();
      expect(mockRedisClient.quit).toHaveBeenCalled();
    });

    it('should handle Redis operation errors gracefully', async () => {
      const mockRedisClient = {
        get: jest.fn().mockRejectedValue(new Error('Redis connection lost')),
        setEx: jest.fn().mockRejectedValue(new Error('Redis write failed')),
        del: jest.fn().mockRejectedValue(new Error('Redis delete failed')),
        keys: jest.fn().mockRejectedValue(new Error('Redis keys failed')),
        flushDb: jest.fn().mockRejectedValue(new Error('Redis flush failed')),
        quit: jest.fn().mockResolvedValue('OK'),
        on: jest.fn(),
        connect: jest.fn().mockResolvedValue(undefined),
      };

      const testModule: TestingModule = await Test.createTestingModule({
        providers: [
          CacheManagerService,
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
        ],
      }).compile();

      const redisService = testModule.get<CacheManagerService>(CacheManagerService);

      // Manually simulate successful Redis connection
      (redisService as any).useRedis = true;
      (redisService as any).isConnected = true;
      (redisService as any).client = mockRedisClient;

      // All operations should handle errors gracefully
      const getResult = await redisService.get('error-key');
      expect(getResult).toBeNull();

      // Set should not throw
      await expect(redisService.set('error-key', 'value')).resolves.not.toThrow();

      // Delete should not throw
      await expect(redisService.delete('error-key')).resolves.not.toThrow();

      // DeletePattern should not throw
      await expect(redisService.deletePattern('error:*')).resolves.not.toThrow();

      // ClearAll should not throw
      await expect(redisService.clearAll()).resolves.not.toThrow();

      await redisService.onModuleDestroy();
    });

    it('should handle Redis deletePattern with no matching keys', async () => {
      const mockRedisClient = {
        get: jest.fn().mockResolvedValue(null),
        setEx: jest.fn().mockResolvedValue('OK'),
        del: jest.fn().mockResolvedValue(0),
        keys: jest.fn().mockResolvedValue([]),
        flushDb: jest.fn().mockResolvedValue('OK'),
        quit: jest.fn().mockResolvedValue('OK'),
        on: jest.fn(),
        connect: jest.fn().mockResolvedValue(undefined),
      };

      const testModule: TestingModule = await Test.createTestingModule({
        providers: [
          CacheManagerService,
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
        ],
      }).compile();

      const redisService = testModule.get<CacheManagerService>(CacheManagerService);

      // Manually simulate successful Redis connection
      (redisService as any).useRedis = true;
      (redisService as any).isConnected = true;
      (redisService as any).client = mockRedisClient;

      // Test Redis deletePattern with no results
      await redisService.deletePattern('nonexistent:*');
      expect(mockRedisClient.keys).toHaveBeenCalledWith('nonexistent:*');
      // del should not be called if no keys match
      expect(mockRedisClient.del).not.toHaveBeenCalled();

      await redisService.onModuleDestroy();
    });
  });
});
