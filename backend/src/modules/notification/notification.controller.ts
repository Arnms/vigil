import { Controller, Get, Post, Body, Patch, Delete, Param, Query, HttpCode, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { NotificationService } from './services/notification.service';
import { CreateNotificationChannelDto } from './dto/create-notification-channel.dto';
import { UpdateNotificationChannelDto } from './dto/update-notification-channel.dto';
import { NotificationChannelQueryDto } from './dto/notification-channel-query.dto';

@Controller('api/notification-channels')
@ApiTags('Notification Channels')
export class NotificationChannelController {
  constructor(private notificationService: NotificationService) {}

  /**
   * 알림 채널 등록
   */
  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: '알림 채널 등록' })
  @ApiResponse({ status: 201, description: 'Notification channel created' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async create(@Body() dto: CreateNotificationChannelDto) {
    return await this.notificationService.createChannel(dto);
  }

  /**
   * 알림 채널 목록 조회
   */
  @Get()
  @ApiOperation({ summary: '알림 채널 목록 조회' })
  @ApiResponse({ status: 200, description: 'List of notification channels' })
  async findAll(@Query() query: NotificationChannelQueryDto) {
    return await this.notificationService.findAllChannels(query);
  }

  /**
   * 알림 채널 상세 조회
   */
  @Get(':id')
  @ApiOperation({ summary: '알림 채널 상세 조회' })
  @ApiResponse({ status: 200, description: 'Notification channel details' })
  @ApiResponse({ status: 404, description: 'Channel not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return await this.notificationService.findChannelById(id);
  }

  /**
   * 알림 채널 수정
   */
  @Patch(':id')
  @ApiOperation({ summary: '알림 채널 수정' })
  @ApiResponse({ status: 200, description: 'Notification channel updated' })
  @ApiResponse({ status: 404, description: 'Channel not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateNotificationChannelDto,
  ) {
    return await this.notificationService.updateChannel(id, dto);
  }

  /**
   * 알림 채널 삭제
   */
  @Delete(':id')
  @ApiOperation({ summary: '알림 채널 삭제' })
  @ApiResponse({ status: 200, description: 'Notification channel deleted' })
  @ApiResponse({ status: 404, description: 'Channel not found' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.notificationService.deleteChannel(id);
    return { message: 'Notification channel deleted successfully' };
  }

  /**
   * 테스트 알림 전송
   */
  @Post(':id/test')
  @HttpCode(200)
  @ApiOperation({ summary: '테스트 알림 전송' })
  @ApiResponse({ status: 200, description: 'Test notification sent' })
  @ApiResponse({ status: 404, description: 'Channel not found' })
  async sendTestNotification(@Param('id', ParseUUIDPipe) id: string) {
    return await this.notificationService.sendTestNotification(id);
  }
}
