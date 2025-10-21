import { Injectable, Logger } from '@nestjs/common';

/**
 * 중복 알림 방지 서비스
 *
 * Phase 1: 메모리 기반 구현
 * Phase 4: Redis 기반으로 업그레이드
 */
@Injectable()
export class DuplicatePreventionService {
  private readonly logger = new Logger(DuplicatePreventionService.name);
  private readonly TTL_SECONDS = 300; // 5분
  private cache: Map<string, { timestamp: number }> = new Map();

  constructor() {
    // 5분마다 만료된 키 정리
    setInterval(() => this.cleanupExpiredKeys(), 60000);
  }

  /**
   * 만료된 키 정리
   */
  private cleanupExpiredKeys(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.TTL_SECONDS * 1000) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.debug(`Cleaned up ${cleaned} expired keys`);
    }
  }

  /**
   * 알림이 이미 전송되었는지 확인 (중복 체크)
   */
  async isDuplicate(key: string): Promise<boolean> {
    const entry = this.cache.get(key);
    if (!entry) return false;

    const now = Date.now();
    if (now - entry.timestamp > this.TTL_SECONDS * 1000) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * 알림 전송 기록
   */
  async markSent(key: string): Promise<void> {
    this.cache.set(key, { timestamp: Date.now() });
    this.logger.debug(`Marked as sent: ${key}, TTL: ${this.TTL_SECONDS}s`);
  }

  /**
   * 알림 기록 삭제 (수동 초기화)
   */
  async clearKey(key: string): Promise<void> {
    this.cache.delete(key);
    this.logger.debug(`Cleared key: ${key}`);
  }

  /**
   * 모든 알림 기록 삭제 (테스트용)
   */
  async clearAll(): Promise<void> {
    const size = this.cache.size;
    this.cache.clear();
    this.logger.debug(`Cleared ${size} alert keys`);
  }
}
