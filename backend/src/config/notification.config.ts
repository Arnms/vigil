import { registerAs } from '@nestjs/config';

export default registerAs('notification', () => ({
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  slack: {
    webhookUrl: process.env.SLACK_WEBHOOK_URL,
  },
}));
