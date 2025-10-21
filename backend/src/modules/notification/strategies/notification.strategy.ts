/**
 * 알림 전송 전략 인터페이스
 * Strategy Pattern으로 구현된 다양한 알림 채널 지원
 */

export interface NotificationPayload {
  endpointName: string;
  endpointUrl?: string;
  status: string;
  previousStatus?: string;
  timestamp: Date;
  responseTime?: number;
  statusCode?: number;
  errorMessage?: string;
  message?: string; // 테스트용
}

export interface NotificationStrategy {
  /**
   * 알림 전송
   * @param config 채널 설정 정보
   * @param payload 알림 내용
   */
  send(config: Record<string, any>, payload: NotificationPayload): Promise<void>;
}
