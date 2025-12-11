import { ApiProperty } from '@nestjs/swagger';

/**
 * 상태 분포 응답 DTO
 */
export class StatusDistributionResponseDto {
  @ApiProperty({
    description: 'UP 상태 엔드포인트 수',
    example: 5,
  })
  UP: number;

  @ApiProperty({
    description: 'DOWN 상태 엔드포인트 수',
    example: 1,
  })
  DOWN: number;

  @ApiProperty({
    description: 'DEGRADED 상태 엔드포인트 수',
    example: 2,
  })
  DEGRADED: number;

  @ApiProperty({
    description: 'UNKNOWN 상태 엔드포인트 수',
    example: 0,
  })
  UNKNOWN: number;

  @ApiProperty({
    description: '전체 엔드포인트 수',
    example: 8,
  })
  total: number;

  @ApiProperty({
    description: '데이터 생성 시각',
    example: '2025-12-11T10:30:00.000Z',
  })
  generatedAt: Date;
}
