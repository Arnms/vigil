# Step 3 상세 설계 문서: 알림 시스템

**작성일**: 2025-10-21
**상태**: 설계 초안
**기간**: Day 5-6

---

## 📋 목차

1. [개요](#개요)
2. [전체 아키텍처](#전체-아키텍처)
3. [1단계: Notification 모듈 구현](#1단계-notification-모듈-구현)
4. [2단계: 이메일 알림 구현](#2단계-이메일-알림-구현)
5. [3단계: Slack 웹훅 통합](#3단계-slack-웹훅-통합)
6. [4단계: 중복 알림 방지](#4단계-중복-알림-방지)
7. [5단계: 알림 트리거 연결](#5단계-알림-트리거-연결)
8. [에러 처리 전략](#에러-처리-전략)
9. [데이터 플로우](#데이터-플로우)
10. [구현 체크리스트](#구현-체크리스트)

---

## 개요

### 목표
- ✅ Notification 모듈 및 NotificationChannel CRUD API 구현
- ✅ Strategy Pattern을 이용한 확장 가능한 알림 시스템 설계
- ✅ 이메일 알림 (Nodemailer) 통합
- ✅ Slack 웹훅 알림 통합
- ✅ Redis를 이용한 중복 알림 방지
- ✅ 상태 변경 감지 시 자동 알림 발송

### 기대 효과
- 엔드포인트 DOWN 감지 시 즉시 다중 채널 알림
- 복구 시에도 알림 발송
- 5분 내 같은 알림은 중복 방지
- 새로운 알림 채널 추가 용이 (Strategy 패턴)

---

## 전체 아키텍처

### 시스템 흐름도

```
┌────────────────────────────────────────────────────────────────┐
│                     상태 변경 감지                              │
│  (Health Check → Endpoint Status Updated)                      │
└────────────────────────────────────────────────────────────────┘
                            ↓
┌────────────────────────────────────────────────────────────────┐
│         Notification Service (알림 조율)                         │
│                                                                │
│  1. 활성 채널 조회                                             │
│  2. 중복 체크 (Redis)                                          │
│  3. 각 채널별 전송                                             │
└────────────────────────────────────────────────────────────────┘
                      ↓                    ↓
        ┌─────────────────────────┬─────────────────────────┐
        │                         │                         │
        ▼                         ▼                         ▼
┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────────┐
│  EmailStrategy       │  │  SlackStrategy       │  │ (Future)WebhookStrat │
├──────────────────────┤  ├──────────────────────┤  ├──────────────────────┤
│ • Nodemailer 설정    │  │ • Incoming Webhook   │  │ • Custom HTTP POST   │
│ • 템플릿 구성        │  │ • Block Kit 포맷     │  │ • 타사 통합         │
│ • 재시도 로직        │  │ • 색상 구분 (UP/DN) │  │ • 구현 예정         │
│ • 실패 로깅          │  │ • 실패 로깅          │  │                      │
└──────────────────────┘  └──────────────────────┘  └──────────────────────┘
        ↓                         ↓
   SMTP 서버                  Slack 서버
(Gmail, SendGrid 등)     (Incoming Webhook)
```

### 디렉토리 구조

```
src/modules/notification/
├── dto/
│   ├── create-notification-channel.dto.ts
│   ├── update-notification-channel.dto.ts
│   └── notification-channel-query.dto.ts
├── entities/
│   └── notification-channel.entity.ts (이미 생성)
├── strategies/
│   ├── notification.strategy.ts (추상 인터페이스)
│   ├── email.strategy.ts
│   └── slack.strategy.ts
├── services/
│   ├── notification.service.ts (메인 조율 서비스)
│   └── duplicate-prevention.service.ts (Redis 캐싱)
├── notification.controller.ts
├── notification.module.ts
└── README.md
```

---

## 1단계: Notification 모듈 구현

### 1.1 DTO 설계

#### `create-notification-channel.dto.ts`

```typescript
import { IsString, IsEnum, IsObject, IsNotEmpty, IsEmail, IsUrl, ValidateIf } from 'class-validator';

export enum NotificationChannelType {
  EMAIL = 'email',
  SLACK = 'slack',
  WEBHOOK = 'webhook',
  SMS = 'sms', // 향후 지원
}

export class CreateNotificationChannelDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(NotificationChannelType)
  @IsNotEmpty()
  type: NotificationChannelType;

  @IsObject()
  @IsNotEmpty()
  config: Record<string, any>;

  // 예시:
  // type === EMAIL일 때:
  // {
  //   "recipients": ["admin@example.com"],
  //   "smtpHost": "smtp.gmail.com",
  //   "smtpPort": 587,
  //   "smtpUser": "sender@example.com",
  //   "smtpPass": "encrypted_password"
  // }
  //
  // type === SLACK일 때:
  // {
  //   "webhookUrl": "https://hooks.slack.com/services/XXX/YYY/ZZZ",
  //   "channel": "#alerts",
  //   "username": "Vigil Bot"
  // }
}
```

#### `update-notification-channel.dto.ts`

```typescript
import { PartialType } from '@nestjs/mapped-types';
import { CreateNotificationChannelDto } from './create-notification-channel.dto';

export class UpdateNotificationChannelDto extends PartialType(CreateNotificationChannelDto) {}
```

#### `notification-channel-query.dto.ts`

```typescript
import { IsOptional, IsEnum, IsBoolean, IsNumber, Min, Max } from 'class-validator';
import { NotificationChannelType } from './create-notification-channel.dto';

export enum SortBy {
  NAME = 'name',
  TYPE = 'type',
  CREATED = 'createdAt',
}

export enum Order {
  ASC = 'ASC',
  DESC = 'DESC',
}

export class NotificationChannelQueryDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsEnum(NotificationChannelType)
  type?: NotificationChannelType;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsEnum(SortBy)
  sortBy?: SortBy = SortBy.CREATED;

  @IsOptional()
  @IsEnum(Order)
  order?: Order = Order.DESC;
}
```

### 1.2 Entity 검증

```typescript
// notification-channel.entity.ts (이미 생성, 재확인)
@Entity('notification_channels')
export class NotificationChannel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'enum', enum: NotificationChannelType })
  type: NotificationChannelType;

  @Column({ type: 'jsonb' })
  config: Record<string, any>; // 암호화 필요 (향후)

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

### 1.3 NotificationChannel CRUD API 설계

```typescript
// notification.controller.ts

@Controller('api/notification-channels')
@ApiTags('Notification Channels')
export class NotificationChannelController {
  constructor(private notificationService: NotificationService) {}

  // 1. 알림 채널 등록
  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: '알림 채널 등록' })
  async create(@Body() dto: CreateNotificationChannelDto) {
    return await this.notificationService.createChannel(dto);
  }

  // 2. 알림 채널 목록 조회
  @Get()
  @ApiOperation({ summary: '알림 채널 목록 조회' })
  async findAll(@Query() query: NotificationChannelQueryDto) {
    return await this.notificationService.findAllChannels(query);
  }

  // 3. 알림 채널 상세 조회
  @Get(':id')
  @ApiOperation({ summary: '알림 채널 상세 조회' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return await this.notificationService.findChannelById(id);
  }

  // 4. 알림 채널 수정
  @Patch(':id')
  @ApiOperation({ summary: '알림 채널 수정' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateNotificationChannelDto,
  ) {
    return await this.notificationService.updateChannel(id, dto);
  }

  // 5. 알림 채널 삭제
  @Delete(':id')
  @ApiOperation({ summary: '알림 채널 삭제' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.notificationService.deleteChannel(id);
    return { message: 'Notification channel deleted successfully' };
  }

  // 6. 테스트 알림 전송
  @Post(':id/test')
  @ApiOperation({ summary: '테스트 알림 전송' })
  async sendTestNotification(
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return await this.notificationService.sendTestNotification(id);
  }
}
```

### 1.4 Notification Service 설계 (기본)

```typescript
// notification.service.ts (개요)

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private strategies: Map<NotificationChannelType, NotificationStrategy>;

  constructor(
    @InjectRepository(NotificationChannel)
    private channelRepository: Repository<NotificationChannel>,
    private duplicatePreventionService: DuplicatePreventionService,
    private emailStrategy: EmailStrategy,
    private slackStrategy: SlackStrategy,
  ) {
    this.strategies = new Map([
      [NotificationChannelType.EMAIL, emailStrategy],
      [NotificationChannelType.SLACK, slackStrategy],
      // [NotificationChannelType.WEBHOOK, webhookStrategy], // 향후
    ]);
  }

  /**
   * 알림 채널 생성
   */
  async createChannel(dto: CreateNotificationChannelDto): Promise<NotificationChannel> {
    const channel = this.channelRepository.create(dto);
    return await this.channelRepository.save(channel);
  }

  /**
   * 알림 채널 목록 조회
   */
  async findAllChannels(query: NotificationChannelQueryDto) {
    let qb = this.channelRepository.createQueryBuilder('channel');

    if (query.type) qb = qb.where('channel.type = :type', { type: query.type });
    if (query.isActive !== undefined)
      qb = qb.andWhere('channel.isActive = :isActive', { isActive: query.isActive });

    qb = qb.orderBy(`channel.${query.sortBy}`, query.order);

    const total = await qb.getCount();
    const data = await qb
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getMany();

    return {
      data,
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  /**
   * 알림 채널 상세 조회
   */
  async findChannelById(id: string): Promise<NotificationChannel> {
    const channel = await this.channelRepository.findOne({ where: { id } });
    if (!channel) throw new NotFoundException('Notification channel not found');
    return channel;
  }

  /**
   * 알림 채널 수정
   */
  async updateChannel(
    id: string,
    dto: UpdateNotificationChannelDto,
  ): Promise<NotificationChannel> {
    const channel = await this.findChannelById(id);
    Object.assign(channel, dto);
    return await this.channelRepository.save(channel);
  }

  /**
   * 알림 채널 삭제 (Soft Delete)
   */
  async deleteChannel(id: string): Promise<void> {
    const channel = await this.findChannelById(id);
    channel.isActive = false;
    await this.channelRepository.save(channel);
  }

  /**
   * 테스트 알림 전송
   */
  async sendTestNotification(id: string): Promise<{ success: boolean; message: string }> {
    const channel = await this.findChannelById(id);
    const strategy = this.strategies.get(channel.type);

    if (!strategy) {
      throw new BadRequestException(`Strategy for ${channel.type} not implemented`);
    }

    try {
      await strategy.send(channel.config, {
        endpointName: '[Test] Vigil Notification System',
        status: 'UP',
        timestamp: new Date(),
        message: 'This is a test notification from Vigil',
      });

      return { success: true, message: 'Test notification sent successfully' };
    } catch (error) {
      this.logger.error(`Test notification failed: ${error.message}`);
      return { success: false, message: `Failed to send test notification: ${error.message}` };
    }
  }

  /**
   * 상태 변경 시 알림 발송
   * (Health Check에서 호출될 메서드)
   */
  async sendAlertOnStatusChange(
    endpoint: Endpoint,
    previousStatus: string,
    newStatus: string,
    checkResult: CheckResult,
  ): Promise<void> {
    // 상태가 실제로 변경되었는지 확인
    if (previousStatus === newStatus) return;

    // 알림할 상태 변화 정의
    const shouldAlert =
      (previousStatus !== 'DOWN' && newStatus === 'DOWN') || // 장애 발생
      (previousStatus === 'DOWN' && newStatus === 'UP'); // 복구

    if (!shouldAlert) return;

    // 활성 채널 조회
    const channels = await this.channelRepository.find({
      where: { isActive: true },
    });

    if (channels.length === 0) {
      this.logger.warn('No active notification channels configured');
      return;
    }

    // 각 채널별 알림 전송
    for (const channel of channels) {
      await this.sendNotification(channel, endpoint, newStatus, checkResult);
    }
  }

  /**
   * 알림 전송 (내부 메서드)
   */
  private async sendNotification(
    channel: NotificationChannel,
    endpoint: Endpoint,
    status: string,
    checkResult: CheckResult,
  ): Promise<void> {
    const notificationKey = `alert:${endpoint.id}:${status}`;

    // 중복 체크
    if (await this.duplicatePreventionService.isDuplicate(notificationKey)) {
      this.logger.debug(`Duplicate notification prevented: ${notificationKey}`);
      return;
    }

    const strategy = this.strategies.get(channel.type);
    if (!strategy) {
      this.logger.warn(`Strategy for ${channel.type} not implemented`);
      return;
    }

    try {
      await strategy.send(channel.config, {
        endpointName: endpoint.name,
        endpointUrl: endpoint.url,
        status,
        previousStatus: endpoint.currentStatus,
        timestamp: new Date(),
        responseTime: checkResult.responseTime,
        statusCode: checkResult.statusCode,
        errorMessage: checkResult.errorMessage,
      });

      // 중복 방지 마크
      await this.duplicatePreventionService.markSent(notificationKey);

      this.logger.log(
        `Notification sent via ${channel.type} for ${endpoint.name}: ${status}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send notification via ${channel.type}: ${error.message}`,
      );
      // 실패해도 진행 계속 (다른 채널로도 전송)
    }
  }
}
```

---

## 2단계: 이메일 알림 구현

### 2.1 이메일 설정 파일

```typescript
// src/config/mail.config.ts

import { MailerOptions } from '@nestjs-modules/mailer/dist/interfaces/mailer-options.interface';

export function getMailerConfig(): MailerOptions {
  return {
    transport: {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    },
    defaults: {
      from: `"${process.env.MAIL_FROM_NAME || 'Vigil'}" <${process.env.SMTP_USER}>`,
    },
  };
}
```

### 2.2 Strategy 인터페이스

```typescript
// notification.strategy.ts

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
  send(config: Record<string, any>, payload: NotificationPayload): Promise<void>;
}
```

### 2.3 EmailNotificationStrategy 구현

```typescript
// email.strategy.ts

import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { NotificationStrategy, NotificationPayload } from './notification.strategy';

@Injectable()
export class EmailStrategy implements NotificationStrategy {
  private readonly logger = new Logger(EmailStrategy.name);

  constructor(private mailerService: MailerService) {}

  async send(config: Record<string, any>, payload: NotificationPayload): Promise<void> {
    const { recipients } = config;

    if (!recipients || recipients.length === 0) {
      throw new Error('No email recipients configured');
    }

    const subject = this.generateSubject(payload);
    const htmlContent = this.generateHtmlContent(payload);

    try {
      await this.mailerService.sendMail({
        to: recipients.join(','),
        subject,
        html: htmlContent,
      });

      this.logger.log(`Email sent to ${recipients.join(',')}`);
    } catch (error) {
      this.logger.error(`Email sending failed: ${error.message}`);
      throw error;
    }
  }

  private generateSubject(payload: NotificationPayload): string {
    const statusEmoji = payload.status === 'DOWN' ? '🔴' : '🟢';
    return `${statusEmoji} [Vigil] ${payload.endpointName} - ${payload.status}`;
  }

  private generateHtmlContent(payload: NotificationPayload): string {
    const statusColor = payload.status === 'DOWN' ? '#dc2626' : '#16a34a';
    const statusText = payload.status === 'DOWN' ? '장애 발생' : '복구됨';

    return `
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; }
            .container { max-width: 600px; margin: 0 auto; }
            .header { background: ${statusColor}; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
            .content { padding: 20px; background: #f9fafb; border-radius: 0 0 5px 5px; }
            .info-block { margin: 10px 0; padding: 10px; background: white; border-left: 4px solid ${statusColor}; }
            .label { font-weight: bold; color: #666; }
            .value { color: #333; }
            .timestamp { font-size: 12px; color: #999; margin-top: 20px; text-align: right; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>${payload.endpointName} - ${statusText}</h2>
            </div>
            <div class="content">
              <div class="info-block">
                <div class="label">상태</div>
                <div class="value">${payload.status}</div>
              </div>

              ${payload.endpointUrl ? `
              <div class="info-block">
                <div class="label">URL</div>
                <div class="value">${payload.endpointUrl}</div>
              </div>
              ` : ''}

              ${payload.responseTime !== undefined ? `
              <div class="info-block">
                <div class="label">응답 시간</div>
                <div class="value">${payload.responseTime}ms</div>
              </div>
              ` : ''}

              ${payload.statusCode ? `
              <div class="info-block">
                <div class="label">HTTP 상태 코드</div>
                <div class="value">${payload.statusCode}</div>
              </div>
              ` : ''}

              ${payload.errorMessage ? `
              <div class="info-block">
                <div class="label">에러 메시지</div>
                <div class="value">${payload.errorMessage}</div>
              </div>
              ` : ''}

              <div class="timestamp">
                ${payload.timestamp.toLocaleString('ko-KR')}
              </div>
            </div>
          </div>
        </body>
      </html>
    `;
  }
}
```

---

## 3단계: Slack 웹훅 통합

### 3.1 SlackNotificationStrategy 구현

```typescript
// slack.strategy.ts

import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { NotificationStrategy, NotificationPayload } from './notification.strategy';

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
      const response = await this.httpService.axiosRef.post(webhookUrl, message);

      if (response.status !== 200 && response.status !== 201) {
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
    const color = isDown ? 'danger' : 'good';
    const emoji = isDown ? ':red_circle:' : ':green_circle:';
    const title = isDown ? '🔴 API 장애 발생' : '🟢 API 복구됨';

    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: title,
          emoji: true,
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
          text: `*URL*\n<${payload.endpointUrl}|${payload.endpointUrl}>`,
        },
      });
    }

    const details: string[] = [];
    if (payload.responseTime !== undefined) {
      details.push(`응답 시간: ${payload.responseTime}ms`);
    }
    if (payload.statusCode) {
      details.push(`HTTP 상태: ${payload.statusCode}`);
    }
    if (payload.errorMessage) {
      details.push(`에러: ${payload.errorMessage}`);
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
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `_${payload.timestamp.toLocaleString('ko-KR')}_`,
        },
      ],
    });

    return {
      channel: channel || undefined,
      username: username || 'Vigil Alert',
      blocks,
      attachments: [
        {
          color,
          ts: Math.floor(payload.timestamp.getTime() / 1000),
        },
      ],
    };
  }
}
```

---

## 4단계: 중복 알림 방지

### 4.1 DuplicatePreventionService 구현

```typescript
// duplicate-prevention.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';

@Injectable()
export class DuplicatePreventionService {
  private readonly logger = new Logger(DuplicatePreventionService.name);
  private readonly TTL_SECONDS = 300; // 5분

  constructor(
    @InjectRedis()
    private redis: Redis,
  ) {}

  /**
   * 알림이 이미 전송되었는지 확인 (중복 체크)
   */
  async isDuplicate(key: string): Promise<boolean> {
    const exists = await this.redis.exists(key);
    return exists === 1;
  }

  /**
   * 알림 전송 기록
   */
  async markSent(key: string): Promise<void> {
    await this.redis.setex(key, this.TTL_SECONDS, 'sent');
    this.logger.debug(`Marked as sent: ${key}, TTL: ${this.TTL_SECONDS}s`);
  }

  /**
   * 알림 기록 삭제 (수동 초기화)
   */
  async clearKey(key: string): Promise<void> {
    await this.redis.del(key);
    this.logger.debug(`Cleared key: ${key}`);
  }

  /**
   * 모든 알림 기록 삭제 (테스트용)
   */
  async clearAll(): Promise<void> {
    const keys = await this.redis.keys('alert:*');
    if (keys.length > 0) {
      await this.redis.del(...keys);
      this.logger.debug(`Cleared ${keys.length} alert keys`);
    }
  }
}
```

### 4.2 중복 방지 흐름

```
알림 전송 요청
    ↓
┌─────────────────────────────────────┐
│  Redis에서 키 확인                    │
│  alert:{endpointId}:{status}         │
└─────────────────────────────────────┘
    ↓
┌──────────────────────┬──────────────────────┐
│ 키가 존재함          │ 키가 존재하지 않음     │
├──────────────────────┼──────────────────────┤
│                      │                      │
│ ❌ 중복 방지         │ ✅ 알림 전송         │
│    (스킵)            │    1. 각 채널로 전송  │
│                      │    2. Redis에 기록   │
│                      │    3. TTL: 300초    │
│                      │                      │
└──────────────────────┴──────────────────────┘
```

---

## 5단계: 알림 트리거 연결

### 5.1 Health Check Processor 수정

```typescript
// health-check.processor.ts (기존 파일 수정)

@Processor('HEALTH_CHECK_QUEUE')
export class HealthCheckProcessor {
  constructor(
    // 기존 주입
    @InjectRepository(Endpoint)
    private endpointRepository: Repository<Endpoint>,
    @InjectRepository(CheckResult)
    private checkResultRepository: Repository<CheckResult>,
    @InjectRepository(Incident)
    private incidentRepository: Repository<Incident>,
    private httpService: HttpService,

    // 새로 추가
    private notificationService: NotificationService,
  ) {}

  @Process('check')
  async handleHealthCheck(job: Job<{ endpointId: string }>): Promise<CheckResult> {
    const { endpointId } = job.data;

    try {
      const endpoint = await this.endpointRepository.findOne({
        where: { id: endpointId },
      });

      if (!endpoint) {
        throw new Error(`Endpoint not found: ${endpointId}`);
      }

      // 기존 상태 저장
      const previousStatus = endpoint.currentStatus;

      // 헬스 체크 수행
      const checkResult = await this.performHttpRequest(endpoint);
      const savedResult = await this.checkResultRepository.save(checkResult);

      // 상태 업데이트
      await this.updateEndpointStatus(endpoint, checkResult);
      const newStatus = endpoint.currentStatus;

      // 인시던트 처리
      await this.handleIncidents(endpoint, checkResult);

      // 💡 새로 추가: 상태 변경 시 알림 발송
      if (previousStatus !== newStatus) {
        await this.notificationService.sendAlertOnStatusChange(
          endpoint,
          previousStatus,
          newStatus,
          checkResult,
        );
      }

      this.logger.log(
        `Health check completed for ${endpoint.name}: ${checkResult.status}`,
      );

      return savedResult;
    } catch (error) {
      this.logger.error(`Health check failed: ${error.message}`);
      throw error;
    }
  }

  // 기존 메서드들 (performHttpRequest, updateEndpointStatus 등)
}
```

### 5.2 Notification Module 등록

```typescript
// notification.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { MailerModule } from '@nestjs-modules/mailer';
import { RedisModule } from '@nestjs-modules/ioredis';

import { NotificationService } from './services/notification.service';
import { DuplicatePreventionService } from './services/duplicate-prevention.service';
import { NotificationChannel } from './entities/notification-channel.entity';
import { NotificationChannelController } from './notification.controller';
import { EmailStrategy } from './strategies/email.strategy';
import { SlackStrategy } from './strategies/slack.strategy';
import { getMailerConfig } from '../config/mail.config';

@Module({
  imports: [
    TypeOrmModule.forFeature([NotificationChannel]),
    HttpModule,
    MailerModule.forRoot(getMailerConfig()),
    RedisModule, // @InjectRedis() 사용하기 위함
  ],
  providers: [
    NotificationService,
    DuplicatePreventionService,
    EmailStrategy,
    SlackStrategy,
  ],
  controllers: [NotificationChannelController],
  exports: [NotificationService], // 다른 모듈에서 사용
})
export class NotificationModule {}
```

### 5.3 HealthCheckModule 수정

```typescript
// health-check.module.ts (기존 파일 수정)

import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';

import { HealthCheckService } from './health-check.service';
import { HealthCheckProcessor } from './health-check.processor';
import { Endpoint } from '../endpoint/entities/endpoint.entity';
import { CheckResult } from './entities/check-result.entity';
import { Incident } from '../incident/entities/incident.entity';
import { NotificationModule } from '../notification/notification.module'; // 새로 추가

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'HEALTH_CHECK_QUEUE',
    }),
    TypeOrmModule.forFeature([Endpoint, CheckResult, Incident]),
    HttpModule,
    NotificationModule, // 새로 추가
  ],
  providers: [HealthCheckService, HealthCheckProcessor],
  exports: [HealthCheckService],
})
export class HealthCheckModule {}
```

---

## 에러 처리 전략

### 알림 발송 중 에러

```typescript
// 발생 가능한 에러 및 처리 방안

1. SMTP 연결 실패
   ├─ 원인: SMTP 설정 오류, 서버 다운
   ├─ 처리: 로깅, 사용자 통보
   └─ 재시도: 지수 백오프 (설정 가능)

2. Slack 웹훅 실패
   ├─ 원인: 웹훅 URL 만료, Slack 서비스 다운
   ├─ 처리: 로깅, 다른 채널로 폴백
   └─ 재시도: 지수 백오프 (설정 가능)

3. Redis 연결 실패
   ├─ 원인: Redis 서버 다운
   ├─ 처리: 중복 방지 무시 (모든 알림 전송)
   └─ 경고: 로깅

4. 채널 설정 오류
   ├─ 원인: 필수 필드 누락 (recipients, webhookUrl)
   ├─ 처리: 해당 채널 스킵, 다른 채널 계속
   └─ 경고: 로깅 + 사용자 통보

5. 타임아웃
   ├─ 원인: SMTP/Slack 응답 지연
   ├─ 처리: 타임아웃 발생, 로깅
   └─ 재시도: 설정 가능
```

### 에러 로깅 및 모니터링

```typescript
// 모든 에러는 Winston Logger로 기록
- ERROR: 심각한 오류 (채널 설정 오류, 네트워크 오류)
- WARN: 경고 (중복 방지, 타임아웃)
- DEBUG: 디버그 (중복 감지, 중복 방지 마크)

// 향후 에러 모니터링 서비스 통합
- Sentry, DataDog 등으로 실시간 모니터링
```

---

## 데이터 플로우

### 시나리오 1: 엔드포인트 DOWN 감지 시 알림 발송

```
Health Check Processor
  │
  ├─ 엔드포인트 체크 실행
  │   └─ previousStatus: UP → newStatus: DOWN
  │
  ├─ CheckResult 저장
  │   └─ status: 'failure', errorMessage: 'Connection timeout'
  │
  ├─ Endpoint 상태 업데이트
  │   └─ currentStatus: DOWN
  │
  ├─ Incident 생성
  │   └─ startedAt: now(), status: OPEN
  │
  ↓
NotificationService.sendAlertOnStatusChange()
  │
  ├─ 상태 변경 확인
  │   └─ UP → DOWN (알림 필요)
  │
  ├─ 활성 채널 조회
  │   └─ [Email, Slack]
  │
  ├─ 각 채널별 알림 전송
  │   │
  │   ├─ Email 채널
  │   │   ├─ DuplicatePreventionService.isDuplicate('alert:endpoint-id:DOWN')
  │   │   │   └─ False (처음 전송)
  │   │   ├─ EmailStrategy.send()
  │   │   │   └─ Nodemailer 전송
  │   │   └─ DuplicatePreventionService.markSent()
  │   │       └─ Redis에 TTL 300초로 기록
  │   │
  │   └─ Slack 채널
  │       ├─ DuplicatePreventionService.isDuplicate('alert:endpoint-id:DOWN')
  │       │   └─ False (처음 전송)
  │       ├─ SlackStrategy.send()
  │       │   └─ Webhook POST 전송
  │       └─ DuplicatePreventionService.markSent()
  │           └─ Redis에 TTL 300초로 기록
  │
  ↓
응답
  └─ 모든 채널로 알림 전송 완료
```

### 시나리오 2: 5분 내 중복 알림 방지

```
Time: T = 0초
  ├─ Endpoint: status UP → DOWN
  ├─ 알림 전송
  │   └─ Redis: alert:endpoint-id:DOWN = 'sent' (TTL: 300초)
  └─ ✅ 알림 전송됨

Time: T = 30초
  ├─ 재체크 (연속 실패)
  ├─ Endpoint: status 유지 (DOWN)
  ├─ DuplicatePreventionService.isDuplicate() → True
  └─ ❌ 알림 스킵 (중복 방지)

Time: T = 5분 1초
  ├─ Redis 캐시 만료
  ├─ 재체크 (여전히 DOWN)
  ├─ Endpoint: status 유지 (DOWN)
  ├─ DuplicatePreventionService.isDuplicate() → False (캐시 만료)
  └─ ✅ 알림 재전송
```

### 시나리오 3: 복구 알림

```
Time: T = 0분
  ├─ Endpoint: DOWN
  ├─ 알림 전송 (DOWN)
  └─ Redis: alert:endpoint-id:DOWN 기록

Time: T = 3분
  ├─ Health Check 재실행
  ├─ 응답 성공
  ├─ Endpoint: DOWN → UP 전환
  ├─ Incident.resolvedAt 설정
  ├─ NotificationService.sendAlertOnStatusChange()
  │   ├─ previousStatus: DOWN, newStatus: UP
  │   ├─ isDuplicate('alert:endpoint-id:UP') → False (처음)
  │   └─ 알림 전송 (UP/복구)
  └─ Redis: alert:endpoint-id:UP 기록
```

---

## 구현 체크리스트

### Phase 1: Notification 모듈 기본 구조
- [ ] `create-notification-channel.dto.ts` 작성
- [ ] `update-notification-channel.dto.ts` 작성
- [ ] `notification-channel-query.dto.ts` 작성
- [ ] `notification-channel.entity.ts` 검증
- [ ] `notification.strategy.ts` 인터페이스 작성
- [ ] `notification.service.ts` 기본 메서드 구현
  - [ ] `createChannel()`
  - [ ] `findAllChannels()`
  - [ ] `findChannelById()`
  - [ ] `updateChannel()`
  - [ ] `deleteChannel()`
  - [ ] `sendAlertOnStatusChange()`
- [ ] `notification.controller.ts` 엔드포인트 구현
- [ ] `notification.module.ts` 작성

### Phase 2: 이메일 알림 구현
- [ ] `mail.config.ts` 작성
- [ ] `email.strategy.ts` 구현
  - [ ] 이메일 제목 생성
  - [ ] HTML 템플릿 작성
  - [ ] 에러 처리
- [ ] Nodemailer 통합 테스트

### Phase 3: Slack 웹훅 통합
- [ ] `slack.strategy.ts` 구현
  - [ ] Block Kit 메시지 형식
  - [ ] 상태별 색상 구분
  - [ ] 에러 처리
- [ ] Slack 웹훅 통합 테스트

### Phase 4: 중복 알림 방지
- [ ] `duplicate-prevention.service.ts` 구현
  - [ ] `isDuplicate()` 메서드
  - [ ] `markSent()` 메서드
  - [ ] `clearKey()` 메서드
  - [ ] `clearAll()` 메서드 (테스트용)
- [ ] Redis 캐싱 테스트

### Phase 5: 알림 트리거 연결
- [ ] `health-check.processor.ts` 수정
  - [ ] previousStatus 저장
  - [ ] 상태 변경 감지
  - [ ] NotificationService 호출 추가
- [ ] `health-check.module.ts` 수정 (NotificationModule 임포트)
- [ ] 통합 테스트 (DOWN → 알림 → UP → 알림)

### Phase 6: 통합 테스트
- [ ] NotificationChannel CRUD API 테스트
  - [ ] POST /api/notification-channels (생성)
  - [ ] GET /api/notification-channels (목록)
  - [ ] GET /api/notification-channels/:id (상세)
  - [ ] PATCH /api/notification-channels/:id (수정)
  - [ ] DELETE /api/notification-channels/:id (삭제)
  - [ ] POST /api/notification-channels/:id/test (테스트)

- [ ] 이메일 알림 테스트
  - [ ] 테스트 이메일 주소로 알림 전송
  - [ ] 제목 및 본문 형식 확인

- [ ] Slack 알림 테스트
  - [ ] Slack 채널에 알림 메시지 수신
  - [ ] 메시지 형식 확인 (Block Kit)
  - [ ] 상태별 색상 확인

- [ ] 중복 방지 테스트
  - [ ] 첫 알림 전송 확인
  - [ ] 5초 후 같은 상태 변경 시 스킵 확인
  - [ ] 5분 후 새로운 알림 전송 확인

- [ ] 엔드포인트 DOWN/UP 통합 테스트
  - [ ] 엔드포인트 상태 DOWN 변경 시 알림 전송 확인
  - [ ] 엔드포인트 상태 UP 변경 시 복구 알림 전송 확인
  - [ ] 모든 활성 채널로 알림 전송 확인

- [ ] 에러 처리 테스트
  - [ ] 잘못된 이메일 주소로 전송 실패 처리
  - [ ] 잘못된 Slack 웹훅 URL로 전송 실패 처리
  - [ ] 오류 로깅 확인

---

## 환경 변수

```env
# Email (Gmail 예시)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
MAIL_FROM_ADDRESS=alerts@vigil.com
MAIL_FROM_NAME=Vigil Alert

# Slack
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL

# Redis (기존)
REDIS_HOST=localhost
REDIS_PORT=6379
```

---

## 관련 문서

- [FEATURE_SPECIFICATIONS.md](../docs/FEATURE_SPECIFICATIONS.md#4-알림-시스템) - 알림 시스템 명세
- [API_SPECIFICATIONS.md](../docs/API_SPECIFICATIONS.md#5-알림-채널-api) - 알림 채널 API
- [DATABASE_SCHEMA.md](../docs/DATABASE_SCHEMA.md#4-notification_channels) - 알림 채널 스키마

---

## 참고 자료

- [Nodemailer 공식 문서](https://nodemailer.com/)
- [Slack Incoming Webhooks](https://api.slack.com/messaging/webhooks)
- [Slack Block Kit](https://api.slack.com/block-kit)
- [Strategy Pattern](https://refactoring.guru/design-patterns/strategy)

---

**문서 작성**: 2025-10-21
**상태**: 설계 초안 완성
