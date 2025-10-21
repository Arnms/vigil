import { IsOptional, IsEnum, IsBoolean, IsNumber, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';
import { NotificationType } from '../notification-channel.entity';

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
  @Transform(({ value }) => (typeof value === 'string' ? parseInt(value, 10) : value))
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Transform(({ value }) => (typeof value === 'string' ? parseInt(value, 10) : value))
  limit?: number = 20;

  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isActive?: boolean;

  @IsOptional()
  @IsEnum(SortBy)
  sortBy?: SortBy = SortBy.CREATED;

  @IsOptional()
  @IsEnum(Order)
  order?: Order = Order.DESC;
}
