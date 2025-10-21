import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationChannel, NotificationType } from '../notification-channel.entity';
import { CreateNotificationChannelDto } from '../dto/create-notification-channel.dto';
import { UpdateNotificationChannelDto } from '../dto/update-notification-channel.dto';
import { NotificationChannelQueryDto } from '../dto/notification-channel-query.dto';
import { NotificationStrategy, NotificationPayload } from '../strategies/notification.strategy';
import { DuplicatePreventionService } from './duplicate-prevention.service';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private strategies: Map<NotificationType, NotificationStrategy>;

  constructor(
    @InjectRepository(NotificationChannel)
    private channelRepository: Repository<NotificationChannel>,
    private duplicatePreventionService: DuplicatePreventionService,
  ) {
    this.strategies = new Map();
  }

  /**
   * Strategy 등록 (모듈에서 호출)
   */
  registerStrategy(type: NotificationType, strategy: NotificationStrategy): void {
    this.strategies.set(type, strategy);
    this.logger.log(`Registered strategy for ${type}`);
  }

  /**
   * 알림 채널 생성
   */
  async createChannel(dto: CreateNotificationChannelDto): Promise<NotificationChannel> {
    const channel = this.channelRepository.create(dto);
    const savedChannel = await this.channelRepository.save(channel);
    this.logger.log(`Notification channel created: ${savedChannel.name} (${savedChannel.type})`);
    return savedChannel;
  }

  /**
   * 알림 채널 목록 조회
   */
  async findAllChannels(query: NotificationChannelQueryDto) {
    let qb = this.channelRepository.createQueryBuilder('channel');

    if (query.type) {
      qb = qb.where('channel.type = :type', { type: query.type });
    }

    if (query.isActive !== undefined) {
      qb = qb.andWhere('channel.isActive = :isActive', { isActive: query.isActive });
    }

    qb = qb.orderBy(`channel.${query.sortBy || 'createdAt'}`, query.order || 'DESC');

    const total = await qb.getCount();
    const page = query.page || 1;
    const limit = query.limit || 20;
    const data = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * 알림 채널 상세 조회
   */
  async findChannelById(id: string): Promise<NotificationChannel> {
    const channel = await this.channelRepository.findOne({ where: { id } });
    if (!channel) {
      throw new NotFoundException('Notification channel not found');
    }
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
    const updatedChannel = await this.channelRepository.save(channel);
    this.logger.log(`Notification channel updated: ${updatedChannel.id}`);
    return updatedChannel;
  }

  /**
   * 알림 채널 삭제 (Soft Delete)
   */
  async deleteChannel(id: string): Promise<void> {
    const channel = await this.findChannelById(id);
    channel.isActive = false;
    await this.channelRepository.save(channel);
    this.logger.log(`Notification channel deactivated: ${id}`);
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

      this.logger.log(`Test notification sent via ${channel.type}`);
      return { success: true, message: 'Test notification sent successfully' };
    } catch (error) {
      this.logger.error(`Test notification failed: ${error.message}`);
      return { success: false, message: `Failed to send test notification: ${error.message}` };
    }
  }

  /**
   * 상태 변경 시 알림 발송
   * (Health Check에서 호출될 메서드)
   *
   * @param endpoint 엔드포인트 정보
   * @param previousStatus 이전 상태
   * @param newStatus 새로운 상태
   * @param checkResult 헬스 체크 결과
   */
  async sendAlertOnStatusChange(
    endpoint: any,
    previousStatus: string,
    newStatus: string,
    checkResult: any,
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
      await this.sendNotificationWithDuplicatePrevention(
        channel,
        endpoint,
        newStatus,
        checkResult,
      );
    }
  }

  /**
   * 중복 방지 기능이 있는 알림 전송 (내부 메서드)
   */
  private async sendNotificationWithDuplicatePrevention(
    channel: NotificationChannel,
    endpoint: any,
    status: string,
    checkResult: any,
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
