import { registerAs } from '@nestjs/config';

export default registerAs('redis', () => {
  const config: any = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '0', 10),
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  };

  // Upstash Redis requires TLS in production
  if (process.env.REDIS_TLS === 'true') {
    config.tls = {};
  }

  return config;
});
