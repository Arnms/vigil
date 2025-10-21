import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { NotificationStrategy, NotificationPayload } from './notification.strategy';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class SlackStrategy implements NotificationStrategy {
  private readonly logger = new Logger(SlackStrategy.name);

  constructor(private httpService: HttpService) {}

  async send(config: Record<string, any>, payload: NotificationPayload): Promise<void> {
    const { webhookUrl, channel, username } = config;

    if (!webhookUrl) {
      throw new Error('Slack webhook URL not configured');
    }

    const message = this.generateSlackMessage(payload, channel, username);

    try {
      const response = await firstValueFrom(
        this.httpService.post(webhookUrl, message),
      );

      if (response.status !== 200) {
        throw new Error(`Slack webhook returned status ${response.status}`);
      }

      this.logger.log(`Slack message sent to ${channel || 'default channel'}`);
    } catch (error) {
      this.logger.error(`Slack message sending failed: ${error.message}`);
      throw error;
    }
  }

  private generateSlackMessage(
    payload: NotificationPayload,
    channel?: string,
    username?: string,
  ): Record<string, any> {
    const isDown = payload.status === 'DOWN';
    const color = isDown ? '#dc2626' : '#16a34a';
    const title = isDown ? '🔴 API 장애 발생' : '🟢 API 복구됨';

    const blocks: any[] = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: title,
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*엔드포인트*\n${payload.endpointName}`,
          },
          {
            type: 'mrkdwn',
            text: `*상태*\n${payload.status}`,
          },
        ],
      },
    ];

    if (payload.endpointUrl) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*URL*\n<${payload.endpointUrl}|${this.truncate(payload.endpointUrl, 50)}>`,
        },
      });
    }

    // 세부 정보
    const details: string[] = [];
    if (payload.responseTime !== undefined) {
      details.push(`⏱️ 응답 시간: ${payload.responseTime}ms`);
    }
    if (payload.statusCode) {
      details.push(`📊 HTTP 상태: ${payload.statusCode}`);
    }
    if (payload.errorMessage) {
      details.push(`⚠️ 에러: ${this.truncate(payload.errorMessage, 100)}`);
    }
    if (payload.message) {
      details.push(`💬 ${payload.message}`);
    }

    if (details.length > 0) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*세부 정보*\n${details.join('\n')}`,
        },
      });
    }

    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `_${payload.timestamp.toLocaleString('ko-KR')}_`,
      },
    });

    const message: Record<string, any> = {
      username: username || 'Vigil Alert',
      blocks,
      attachments: [
        {
          color,
          ts: Math.floor(payload.timestamp.getTime() / 1000),
        },
      ],
    };

    if (channel) {
      message.channel = channel;
    }

    return message;
  }

  /**
   * 문자열을 지정된 길이로 자르기
   */
  private truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text;
    }
    return text.substring(0, maxLength - 3) + '...';
  }
}
