import { IsOptional, IsString, IsInt, Min, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryIncidentDto {
  @IsOptional()
  @IsString()
  endpointId?: string;

  @IsOptional()
  @IsIn(['active', 'resolved'])
  status?: 'active' | 'resolved';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;
}
