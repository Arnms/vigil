export class EndpointComparisonDto {
  endpointId: string;
  name: string;
  uptime24h: number;
  avgResponseTime: number;
  incidentCount: number;
  stabilityScore: number;
  rank: number;
}

export class ComparisonResponseDto {
  data: EndpointComparisonDto[];
  generatedAt: Date;
}
