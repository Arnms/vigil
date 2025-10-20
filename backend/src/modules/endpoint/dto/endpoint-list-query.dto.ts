import { Type } from 'class-transformer';
import { IsOptional, IsEnum, IsBoolean, IsNumber, Min, Max } from 'class-validator';
import { EndpointStatus } from '../endpoint.entity';

export enum SortBy {
  NAME = 'name',
  CREATED = 'createdAt',
  LAST_CHECKED = 'lastCheckedAt',
  STATUS = 'currentStatus',
}

export enum Order {
  ASC = 'ASC',
  DESC = 'DESC',
}

export class EndpointListQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsEnum(EndpointStatus)
  status?: EndpointStatus;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsEnum(SortBy)
  sortBy?: SortBy = SortBy.CREATED;

  @IsOptional()
  @IsEnum(Order)
  order?: Order = Order.DESC;
}
