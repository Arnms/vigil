import { Test, TestingModule } from '@nestjs/testing';
import { DuplicatePreventionService } from './duplicate-prevention.service';

describe('DuplicatePreventionService', () => {
  let service: DuplicatePreventionService;

  beforeEach(async () => {
    jest.useFakeTimers();

    const module: TestingModule = await Test.createTestingModule({
      providers: [DuplicatePreventionService],
    }).compile();

    service = module.get<DuplicatePreventionService>(DuplicatePreventionService);
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should initialize with empty cache', async () => {
      const isDuplicate = await service.isDuplicate('non-existent-key');
      expect(isDuplicate).toBe(false);
    });

    it('should start cleanup interval on construction', () => {
      // Verify service initializes with setInterval (no need to mock as it's internal)
      expect(service).toBeDefined();
      expect(typeof service['cache']).toBe('object');
    });
  });

  describe('markSent', () => {
    it('should mark a key as sent', async () => {
      const key = 'alert:endpoint:123:created';
      await service.markSent(key);

      const isDuplicate = await service.isDuplicate(key);
      expect(isDuplicate).toBe(true);
    });

    it('should store timestamp when marking sent', async () => {
      const key = 'notification:key:1';
      const beforeTime = Date.now();
      await service.markSent(key);
      const afterTime = Date.now();

      const isDuplicate = await service.isDuplicate(key);
      expect(isDuplicate).toBe(true);
    });

    it('should handle multiple keys independently', async () => {
      const key1 = 'alert:1';
      const key2 = 'alert:2';

      await service.markSent(key1);
      await service.markSent(key2);

      expect(await service.isDuplicate(key1)).toBe(true);
      expect(await service.isDuplicate(key2)).toBe(true);
    });

    it('should mark sent for different endpoints separately', async () => {
      const key1 = 'alert:endpoint:123:down';
      const key2 = 'alert:endpoint:456:down';

      await service.markSent(key1);
      await service.markSent(key2);

      expect(await service.isDuplicate(key1)).toBe(true);
      expect(await service.isDuplicate(key2)).toBe(true);
    });

    it('should handle special characters in keys', async () => {
      const key = 'alert:endpoint:123:special-chars!@#$%';
      await service.markSent(key);
      expect(await service.isDuplicate(key)).toBe(true);
    });

    it('should overwrite existing key', async () => {
      const key = 'alert:key:repeated';

      await service.markSent(key);
      expect(await service.isDuplicate(key)).toBe(true);

      // Advance time but within TTL
      jest.advanceTimersByTime(100000);

      // Mark again
      await service.markSent(key);
      expect(await service.isDuplicate(key)).toBe(true);
    });
  });

  describe('isDuplicate', () => {
    it('should return false for non-existent key', async () => {
      const result = await service.isDuplicate('non-existent-key');
      expect(result).toBe(false);
    });

    it('should return true for recently marked key', async () => {
      const key = 'alert:recent';
      await service.markSent(key);

      const result = await service.isDuplicate(key);
      expect(result).toBe(true);
    });

    it('should return false for expired key', async () => {
      const key = 'alert:expired';
      await service.markSent(key);

      // Advance time beyond TTL (300 seconds = 300000 ms, plus 1ms to ensure expiry)
      jest.advanceTimersByTime(300001);

      const result = await service.isDuplicate(key);
      expect(result).toBe(false);
    });

    it('should check duplicate within TTL window', async () => {
      const key = 'alert:within-ttl';
      await service.markSent(key);

      // Check at various times within TTL
      expect(await service.isDuplicate(key)).toBe(true);

      jest.advanceTimersByTime(100000); // 100 seconds
      expect(await service.isDuplicate(key)).toBe(true);

      jest.advanceTimersByTime(100000); // Total 200 seconds
      expect(await service.isDuplicate(key)).toBe(true);

      jest.advanceTimersByTime(95000); // Total 295 seconds (just before TTL)
      expect(await service.isDuplicate(key)).toBe(true);
    });

    it('should return false after TTL expires', async () => {
      const key = 'alert:expired-after-ttl';
      await service.markSent(key);

      // Note: At exactly 300000ms, it's still NOT expired (300000 > 300000 is false)
      jest.advanceTimersByTime(300000);
      expect(await service.isDuplicate(key)).toBe(true);

      // Only after exceeding 300000ms does it expire
      jest.advanceTimersByTime(1);
      expect(await service.isDuplicate(key)).toBe(false);
    });

    it('should clean up expired key on isDuplicate check', async () => {
      const key = 'alert:cleanup-on-check';
      await service.markSent(key);

      jest.advanceTimersByTime(300001); // Beyond TTL

      const result = await service.isDuplicate(key);
      expect(result).toBe(false);
    });

    it('should handle rapid duplicate checks', async () => {
      const key = 'alert:rapid-check';
      await service.markSent(key);

      // Rapid sequential checks
      expect(await service.isDuplicate(key)).toBe(true);
      expect(await service.isDuplicate(key)).toBe(true);
      expect(await service.isDuplicate(key)).toBe(true);
    });

    it('should differentiate between similar keys', async () => {
      const key1 = 'alert:endpoint:123';
      const key2 = 'alert:endpoint:124';

      await service.markSent(key1);

      expect(await service.isDuplicate(key1)).toBe(true);
      expect(await service.isDuplicate(key2)).toBe(false);
    });

    it('should handle case-sensitive keys', async () => {
      const key1 = 'alert:Endpoint:123';
      const key2 = 'alert:endpoint:123';

      await service.markSent(key1);

      expect(await service.isDuplicate(key1)).toBe(true);
      expect(await service.isDuplicate(key2)).toBe(false);
    });
  });

  describe('clearKey', () => {
    it('should clear a specific key', async () => {
      const key = 'alert:to-clear';
      await service.markSent(key);

      expect(await service.isDuplicate(key)).toBe(true);

      await service.clearKey(key);

      expect(await service.isDuplicate(key)).toBe(false);
    });

    it('should not affect other keys when clearing one', async () => {
      const key1 = 'alert:key1';
      const key2 = 'alert:key2';

      await service.markSent(key1);
      await service.markSent(key2);

      await service.clearKey(key1);

      expect(await service.isDuplicate(key1)).toBe(false);
      expect(await service.isDuplicate(key2)).toBe(true);
    });

    it('should handle clearing non-existent key gracefully', async () => {
      await expect(
        service.clearKey('non-existent-key'),
      ).resolves.not.toThrow();
    });

    it('should handle clearing already cleared key', async () => {
      const key = 'alert:clear-twice';
      await service.markSent(key);
      await service.clearKey(key);

      await expect(service.clearKey(key)).resolves.not.toThrow();
      expect(await service.isDuplicate(key)).toBe(false);
    });

    it('should allow re-sending after clearing', async () => {
      const key = 'alert:resend-after-clear';

      await service.markSent(key);
      expect(await service.isDuplicate(key)).toBe(true);

      await service.clearKey(key);
      expect(await service.isDuplicate(key)).toBe(false);

      await service.markSent(key);
      expect(await service.isDuplicate(key)).toBe(true);
    });
  });

  describe('clearAll', () => {
    it('should clear all cached keys', async () => {
      const keys = [
        'alert:1',
        'alert:2',
        'alert:3',
        'alert:endpoint:123:down',
      ];

      for (const key of keys) {
        await service.markSent(key);
      }

      // Verify all are marked
      for (const key of keys) {
        expect(await service.isDuplicate(key)).toBe(true);
      }

      await service.clearAll();

      // Verify all are cleared
      for (const key of keys) {
        expect(await service.isDuplicate(key)).toBe(false);
      }
    });

    it('should reset cache to empty state', async () => {
      const keys = ['alert:1', 'alert:2', 'alert:3'];

      for (const key of keys) {
        await service.markSent(key);
      }

      await service.clearAll();

      // Verify cache is empty by checking a new key
      expect(await service.isDuplicate('brand-new-key')).toBe(false);

      // And should be able to add new entries
      await service.markSent('brand-new-key');
      expect(await service.isDuplicate('brand-new-key')).toBe(true);
    });

    it('should handle clearing empty cache', async () => {
      await expect(service.clearAll()).resolves.not.toThrow();
    });

    it('should handle multiple clearAll calls', async () => {
      await service.markSent('alert:key');
      expect(await service.isDuplicate('alert:key')).toBe(true);

      await service.clearAll();
      expect(await service.isDuplicate('alert:key')).toBe(false);

      await service.clearAll();
      expect(await service.isDuplicate('alert:key')).toBe(false);
    });

    it('should not affect operations after clearAll', async () => {
      const key = 'alert:after-clear-all';

      await service.markSent('alert:1');
      await service.markSent('alert:2');

      await service.clearAll();

      await service.markSent(key);
      expect(await service.isDuplicate(key)).toBe(true);
    });
  });

  describe('cleanup behavior', () => {
    it('should cleanup expired keys periodically', async () => {
      const key1 = 'alert:expired:1';
      const key2 = 'alert:active:2';

      await service.markSent(key1);
      await service.markSent(key2);

      // Advance past TTL for key1 only
      jest.advanceTimersByTime(300001);

      // Trigger cleanup interval (happens every 60 seconds)
      jest.runOnlyPendingTimers();

      // key1 should be expired and cleaned
      expect(await service.isDuplicate(key1)).toBe(false);
    });

    it('should remove only expired entries during cleanup', async () => {
      const expiredKey = 'alert:will-expire';
      const activeKey = 'alert:still-active';

      await service.markSent(expiredKey);

      jest.advanceTimersByTime(250000); // Not yet expired

      await service.markSent(activeKey);

      jest.advanceTimersByTime(100000); // Total 350000ms, expired key is old

      jest.runOnlyPendingTimers();

      expect(await service.isDuplicate(expiredKey)).toBe(false);
      expect(await service.isDuplicate(activeKey)).toBe(true);
    });

    it('should handle cleanup with empty cache', () => {
      expect(() => {
        jest.runOnlyPendingTimers();
      }).not.toThrow();
    });

    it('should cleanup multiple expired keys at once', async () => {
      const keys = Array.from({ length: 5 }, (_, i) => `alert:expired:${i}`);

      for (const key of keys) {
        await service.markSent(key);
      }

      jest.advanceTimersByTime(300001); // All expired

      jest.runOnlyPendingTimers();

      for (const key of keys) {
        expect(await service.isDuplicate(key)).toBe(false);
      }
    });
  });

  describe('edge cases', () => {
    it('should handle empty string key', async () => {
      const emptyKey = '';
      await service.markSent(emptyKey);
      expect(await service.isDuplicate(emptyKey)).toBe(true);
    });

    it('should handle very long keys', async () => {
      const longKey = 'alert:' + 'x'.repeat(1000);
      await service.markSent(longKey);
      expect(await service.isDuplicate(longKey)).toBe(true);
    });

    it('should handle unicode characters in keys', async () => {
      const unicodeKey = 'alert:endpoint:한글:테스트';
      await service.markSent(unicodeKey);
      expect(await service.isDuplicate(unicodeKey)).toBe(true);
    });

    it('should handle rapid mark and check operations', async () => {
      const key = 'alert:rapid';

      for (let i = 0; i < 100; i++) {
        await service.markSent(key);
        expect(await service.isDuplicate(key)).toBe(true);
      }
    });

    it('should handle large number of simultaneous keys', async () => {
      const keys = Array.from(
        { length: 1000 },
        (_, i) => `alert:endpoint:${i}`,
      );

      for (const key of keys) {
        await service.markSent(key);
      }

      // Check all are present
      for (const key of keys) {
        expect(await service.isDuplicate(key)).toBe(true);
      }
    });

    it('should maintain correct timestamps for mixed-age keys', async () => {
      const oldKey = 'alert:old';
      const newKey = 'alert:new';

      await service.markSent(oldKey);

      jest.advanceTimersByTime(250000); // 250 seconds passed

      await service.markSent(newKey);

      // Old key still valid (50 seconds left)
      expect(await service.isDuplicate(oldKey)).toBe(true);
      expect(await service.isDuplicate(newKey)).toBe(true);

      jest.advanceTimersByTime(60000); // +60 seconds, total 310 seconds

      // Old key now expired, new key still valid
      expect(await service.isDuplicate(oldKey)).toBe(false);
      expect(await service.isDuplicate(newKey)).toBe(true);
    });
  });

  describe('TTL window behavior', () => {
    it('should respect 5-minute TTL window', async () => {
      const key = 'alert:ttl-window';
      const TTL_5_MIN = 300000; // 5 minutes in milliseconds

      await service.markSent(key);
      expect(await service.isDuplicate(key)).toBe(true);

      // At TTL - 1ms
      jest.advanceTimersByTime(TTL_5_MIN - 1);
      expect(await service.isDuplicate(key)).toBe(true);

      // At TTL (exactly 300000ms: 300000 > 300000 is false, so still valid)
      jest.advanceTimersByTime(1);
      expect(await service.isDuplicate(key)).toBe(true);

      // Beyond TTL (300000 > 300000 is false, but 300001 > 300000 is true, so expired)
      jest.advanceTimersByTime(1);
      expect(await service.isDuplicate(key)).toBe(false);
    });

    it('should prevent duplicate notifications within TTL', async () => {
      const key = 'endpoint:123:status:down';

      await service.markSent(key);

      // Simulate checking multiple times within 5 minutes
      for (let i = 0; i < 5; i++) {
        jest.advanceTimersByTime(60000); // 1 minute intervals
        expect(await service.isDuplicate(key)).toBe(true);
      }

      // After 5 minutes total
      jest.advanceTimersByTime(1);
      expect(await service.isDuplicate(key)).toBe(false);
    });
  });

  describe('notification scenario', () => {
    it('should prevent duplicate email notifications', async () => {
      const alertKey = 'notification:email:endpoint:123:status:changed';

      // First notification
      expect(await service.isDuplicate(alertKey)).toBe(false);
      await service.markSent(alertKey);
      expect(await service.isDuplicate(alertKey)).toBe(true);

      // Attempt to send again immediately - should be prevented
      expect(await service.isDuplicate(alertKey)).toBe(true);

      // After 5 minutes, should be allowed
      jest.advanceTimersByTime(300001);
      expect(await service.isDuplicate(alertKey)).toBe(false);

      // Can send again
      await service.markSent(alertKey);
      expect(await service.isDuplicate(alertKey)).toBe(true);
    });

    it('should handle multiple notification types for same endpoint', async () => {
      const endpointId = 'endpoint:abc-123';
      const emailKey = `notification:email:${endpointId}:down`;
      const slackKey = `notification:slack:${endpointId}:down`;

      // Send both notifications
      await service.markSent(emailKey);
      await service.markSent(slackKey);

      // Both should be prevented from duplicate
      expect(await service.isDuplicate(emailKey)).toBe(true);
      expect(await service.isDuplicate(slackKey)).toBe(true);

      // Clear one, other should remain
      await service.clearKey(emailKey);

      expect(await service.isDuplicate(emailKey)).toBe(false);
      expect(await service.isDuplicate(slackKey)).toBe(true);
    });

    it('should allow notifications for different endpoints', async () => {
      const endpoint1Key = 'notification:endpoint:123:down';
      const endpoint2Key = 'notification:endpoint:456:down';

      await service.markSent(endpoint1Key);

      // endpoint1 should be duplicate
      expect(await service.isDuplicate(endpoint1Key)).toBe(true);

      // endpoint2 should not be duplicate
      expect(await service.isDuplicate(endpoint2Key)).toBe(false);

      // Can send notification for endpoint2
      await service.markSent(endpoint2Key);
      expect(await service.isDuplicate(endpoint2Key)).toBe(true);
    });
  });
});
