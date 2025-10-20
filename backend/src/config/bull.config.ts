import { BullModuleOptions, BullRootModuleOptions } from '@nestjs/bull';
import { ConfigService } from '@nestjs/config';

export function getBullRootConfig(
  configService: ConfigService,
): BullRootModuleOptions {
  return {
    redis: {
      host: configService.get('REDIS_HOST', 'localhost'),
      port: configService.get('REDIS_PORT', 6379),
    },
  };
}

export function getHealthCheckQueueConfig(): BullModuleOptions {
  return {
    name: 'HEALTH_CHECK_QUEUE',
  };
}
