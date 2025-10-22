import { Injectable, Logger } from '@nestjs/common';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

/**
 * 메모리 기반 캐시 서비스
 * 향후 Redis로 업그레이드 예정
 */
@Injectable()
export class CacheManagerService {
  private readonly logger = new Logger(CacheManagerService.name);
  private readonly DEFAULT_TTL = 60; // 1분
  private cache = new Map<string, CacheEntry<any>>();

  /**
   * 캐시에서 데이터 조회
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const entry = this.cache.get(key);

      if (!entry) {
        return null;
      }

      // TTL 확인
      if (entry.expiresAt < Date.now()) {
        this.cache.delete(key);
        return null;
      }

      this.logger.debug(`Cache hit: ${key}`);
      return entry.value;
    } catch (error) {
      this.logger.error(`Cache get failed: ${error.message}`);
      return null;
    }
  }

  /**
   * 캐시에 데이터 저장
   */
  async set<T>(
    key: string,
    value: T,
    ttl: number = this.DEFAULT_TTL,
  ): Promise<void> {
    try {
      const expiresAt = Date.now() + ttl * 1000;
      this.cache.set(key, { value, expiresAt });
      this.logger.debug(`Cache set: ${key}, TTL: ${ttl}s`);
    } catch (error) {
      this.logger.error(`Cache set failed: ${error.message}`);
    }
  }

  /**
   * 캐시 삭제
   */
  async delete(key: string): Promise<void> {
    try {
      this.cache.delete(key);
      this.logger.debug(`Cache deleted: ${key}`);
    } catch (error) {
      this.logger.error(`Cache delete failed: ${error.message}`);
    }
  }

  /**
   * 패턴으로 캐시 삭제
   */
  async deletePattern(pattern: string): Promise<void> {
    try {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      let deletedCount = 0;

      for (const key of this.cache.keys()) {
        if (regex.test(key)) {
          this.cache.delete(key);
          deletedCount++;
        }
      }

      this.logger.debug(
        `Deleted ${deletedCount} cache keys matching ${pattern}`,
      );
    } catch (error) {
      this.logger.error(`Cache delete pattern failed: ${error.message}`);
    }
  }

  /**
   * 모든 캐시 삭제 (테스트용)
   */
  async clearAll(): Promise<void> {
    try {
      this.cache.clear();
      this.logger.debug('All cache cleared');
    } catch (error) {
      this.logger.error(`Cache clear failed: ${error.message}`);
    }
  }
}
