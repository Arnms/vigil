import { DataSource } from 'typeorm';
import {
  NotificationChannel,
  NotificationType,
} from '../../modules/notification/notification-channel.entity';

export async function seedNotificationChannels(
  dataSource: DataSource,
): Promise<void> {
  const channelRepository = dataSource.getRepository(NotificationChannel);

  // Check if data already exists
  const existingCount = await channelRepository.count();
  if (existingCount > 0) {
    console.log('Notification channels already seeded, skipping...');
    return;
  }

  const sampleChannels = [
    {
      name: 'Default Email Channel',
      type: NotificationType.EMAIL,
      config: {
        recipients: ['admin@example.com', 'ops@example.com'],
      },
      isActive: true,
    },
    {
      name: 'Slack Alerts',
      type: NotificationType.SLACK,
      config: {
        webhookUrl: process.env.SLACK_WEBHOOK_URL || 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL',
        channel: '#alerts',
        username: 'Vigil Bot',
      },
      isActive: false, // Disabled by default until webhook is configured
    },
    {
      name: 'Critical Alerts Email',
      type: NotificationType.EMAIL,
      config: {
        recipients: ['critical@example.com'],
      },
      isActive: true,
    },
  ];

  await channelRepository.save(sampleChannels);
  console.log(`✅ Seeded ${sampleChannels.length} notification channels`);
}
