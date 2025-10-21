import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';

import { NotificationService } from './services/notification.service';
import { DuplicatePreventionService } from './services/duplicate-prevention.service';
import { NotificationChannel, NotificationType } from './notification-channel.entity';
import { NotificationChannelController } from './notification.controller';
import { EmailStrategy } from './strategies/email.strategy';

@Module({
  imports: [
    TypeOrmModule.forFeature([NotificationChannel]),
    HttpModule,
  ],
  providers: [
    NotificationService,
    DuplicatePreventionService,
    EmailStrategy,
  ],
  controllers: [NotificationChannelController],
  exports: [NotificationService, DuplicatePreventionService], // 다른 모듈에서 사용
})
export class NotificationModule {
  constructor(
    private notificationService: NotificationService,
    private emailStrategy: EmailStrategy,
  ) {
    // EmailStrategy 등록
    this.notificationService.registerStrategy(NotificationType.EMAIL, emailStrategy);
  }
}
