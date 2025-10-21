import { IsString, IsEnum, IsObject, IsNotEmpty, ValidateIf, IsArray, ArrayMinSize } from 'class-validator';
import { NotificationType } from '../notification-channel.entity';

export class CreateNotificationChannelDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(NotificationType)
  @IsNotEmpty()
  type: NotificationType;

  @IsObject()
  @IsNotEmpty()
  config: Record<string, any>;

  /**
   * config 필드 예시:
   *
   * EMAIL 타입:
   * {
   *   "recipients": ["admin@example.com", "team@example.com"],
   *   "smtpHost": "smtp.gmail.com",
   *   "smtpPort": 587,
   *   "smtpUser": "sender@example.com",
   *   "smtpPass": "encrypted_password"
   * }
   *
   * SLACK 타입:
   * {
   *   "webhookUrl": "https://hooks.slack.com/services/XXX/YYY/ZZZ",
   *   "channel": "#alerts",
   *   "username": "Vigil Bot"
   * }
   */
}
