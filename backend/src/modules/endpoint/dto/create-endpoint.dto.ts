import {
  IsString,
  IsUrl,
  IsEnum,
  IsObject,
  IsOptional,
  IsNumber,
  IsPositive,
  Min,
  Max,
  IsNotEmpty,
} from 'class-validator';
import { HttpMethod } from '../endpoint.entity';

export class CreateEndpointDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsUrl()
  @IsNotEmpty()
  url: string;

  @IsEnum(HttpMethod)
  @IsOptional()
  method?: HttpMethod = HttpMethod.GET;

  @IsObject()
  @IsOptional()
  headers?: Record<string, string>;

  @IsObject()
  @IsOptional()
  body?: Record<string, any>;

  @IsNumber()
  @IsPositive()
  @Min(30) // 최소 30초
  checkInterval: number; // 초 단위

  @IsNumber()
  @Min(100)
  @Max(599)
  expectedStatusCode?: number = 200;

  @IsNumber()
  @Min(1000)
  @Max(60000) // 1초 ~ 60초
  timeoutThreshold?: number = 5000; // 밀리초 단위
}
