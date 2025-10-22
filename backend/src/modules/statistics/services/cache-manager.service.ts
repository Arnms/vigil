import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from 'redis';
import type { RedisClientType } from 'redis';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

/**
 * Redis 기반 캐시 서비스 (폴백: 메모리 기반)
 * - 프로덕션: Redis 사용
 * - 개발/테스트: 메모리 기반 캐시 폴백
 */
@Injectable()
export class CacheManagerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CacheManagerService.name);
  private readonly DEFAULT_TTL = 60; // 1분
  private client: RedisClientType;
  private isConnected = false;
  private useRedis = false;

  // 메모리 기반 캐시 (폴백용)
  private memoryCache = new Map<string, CacheEntry<any>>();

  constructor(private configService: ConfigService) {}

  /**
   * Redis 연결 초기화 (실패하면 메모리 캐시 사용)
   */
  async onModuleInit(): Promise<void> {
    try {
      const redisConfig = this.configService.get('redis');

      this.client = createClient({
        socket: {
          host: redisConfig.host,
          port: redisConfig.port,
          reconnectStrategy: (retries) => {
            if (retries > 3) {
              return new Error('Redis reconnection failed');
            }
            return Math.min(retries * 100, 1000);
          },
        },
        password: redisConfig.password || undefined,
        database: redisConfig.db,
      } as any);

      this.client.on('error', (err) => {
        this.logger.error(`Redis error: ${err.message}`);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        this.isConnected = true;
        this.useRedis = true;
        this.logger.log('Redis connected');
      });

      await this.client.connect();
      this.isConnected = true;
      this.useRedis = true;
      this.logger.log('Redis cache service initialized');
    } catch (error) {
      this.logger.warn(
        `Redis connection failed: ${error.message}. Using memory-based cache.`,
      );
      this.useRedis = false;
      this.isConnected = false;
    }
  }

  /**
   * 연결 종료
   */
  async onModuleDestroy(): Promise<void> {
    if (this.useRedis && this.client && this.isConnected) {
      try {
        await this.client.quit();
        this.logger.log('Redis connection closed');
      } catch (error) {
        this.logger.error(`Failed to close Redis connection: ${error.message}`);
      }
    }
  }

  /**
   * 캐시에서 데이터 조회
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      if (this.useRedis && this.client && this.isConnected) {
        const data = await this.client.get(key);
        if (!data) {
          return null;
        }
        try {
          const value = JSON.parse(data);
          this.logger.debug(`Cache hit (Redis): ${key}`);
          return value as T;
        } catch (parseError) {
          this.logger.error(`Failed to parse cached value for ${key}`);
          return null;
        }
      } else {
        // 메모리 캐시 사용
        const entry = this.memoryCache.get(key);
        if (!entry) {
          return null;
        }

        if (entry.expiresAt < Date.now()) {
          this.memoryCache.delete(key);
          return null;
        }

        this.logger.debug(`Cache hit (Memory): ${key}`);
        return entry.value;
      }
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
      if (this.useRedis && this.client && this.isConnected) {
        const serialized = JSON.stringify(value);
        await this.client.setEx(key, ttl, serialized);
        this.logger.debug(`Cache set (Redis): ${key}, TTL: ${ttl}s`);
      } else {
        // 메모리 캐시 사용
        const expiresAt = Date.now() + ttl * 1000;
        this.memoryCache.set(key, { value, expiresAt });
        this.logger.debug(`Cache set (Memory): ${key}, TTL: ${ttl}s`);
      }
    } catch (error) {
      this.logger.error(`Cache set failed: ${error.message}`);
    }
  }

  /**
   * 캐시 삭제
   */
  async delete(key: string): Promise<void> {
    try {
      if (this.useRedis && this.client && this.isConnected) {
        await this.client.del(key);
        this.logger.debug(`Cache deleted (Redis): ${key}`);
      } else {
        // 메모리 캐시 사용
        this.memoryCache.delete(key);
        this.logger.debug(`Cache deleted (Memory): ${key}`);
      }
    } catch (error) {
      this.logger.error(`Cache delete failed: ${error.message}`);
    }
  }

  /**
   * 패턴으로 캐시 삭제
   */
  async deletePattern(pattern: string): Promise<void> {
    try {
      if (this.useRedis && this.client && this.isConnected) {
        const keys = await this.client.keys(pattern);
        if (keys.length > 0) {
          await this.client.del(keys);
          this.logger.debug(
            `Deleted ${keys.length} cache keys matching ${pattern} (Redis)`,
          );
        }
      } else {
        // 메모리 캐시 사용
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        let deletedCount = 0;

        for (const key of this.memoryCache.keys()) {
          if (regex.test(key)) {
            this.memoryCache.delete(key);
            deletedCount++;
          }
        }

        this.logger.debug(
          `Deleted ${deletedCount} cache keys matching ${pattern} (Memory)`,
        );
      }
    } catch (error) {
      this.logger.error(`Cache delete pattern failed: ${error.message}`);
    }
  }

  /**
   * 모든 캐시 삭제 (테스트용)
   */
  async clearAll(): Promise<void> {
    try {
      if (this.useRedis && this.client && this.isConnected) {
        await this.client.flushDb();
        this.logger.debug('All cache cleared (Redis)');
      } else {
        // 메모리 캐시 사용
        this.memoryCache.clear();
        this.logger.debug('All cache cleared (Memory)');
      }
    } catch (error) {
      this.logger.error(`Cache clear failed: ${error.message}`);
    }
  }

  /**
   * 캐시 서비스 상태 확인
   */
  getStatus(): {
    isHealthy: boolean;
    backend: 'redis' | 'memory';
    connected: boolean;
  } {
    return {
      isHealthy: this.useRedis ? this.isConnected : true,
      backend: this.useRedis ? 'redis' : 'memory',
      connected: this.useRedis ? this.isConnected : true,
    };
  }

  /**
   * Redis 연결 상태 확인
   */
  isHealthy(): boolean {
    return this.useRedis ? this.isConnected : true;
  }
}
