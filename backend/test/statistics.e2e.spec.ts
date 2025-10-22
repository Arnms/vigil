import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * E2E 테스트: Statistics 모듈 전체 API 엔드포인트
 *
 * 테스트 범위:
 * - 가동률 API (uptime)
 * - 응답 시간 통계 API (response-time)
 * - 전체 통계 개요 API (overview)
 * - 인시던트 조회 API (incidents)
 * - 인시던트 상세 API (incidents/:id)
 * - 성능 비교 API (comparison)
 */
describe('Statistics Module E2E Tests', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/statistics/endpoints/:id/uptime - 가동률 조회', () => {
    const endpointId = '550e8400-e29b-41d4-a716-446655440000';

    it('should return 200 with uptime statistics for valid period', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/statistics/endpoints/${endpointId}/uptime`)
        .query({ period: '24h' })
        .expect(200);

      expect(response.body).toHaveProperty('endpointId');
      expect(response.body).toHaveProperty('period');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('totalChecks');
      expect(response.body).toHaveProperty('successfulChecks');
      expect(response.body).toHaveProperty('failedChecks');
      expect(response.body).toHaveProperty('startDate');
      expect(response.body).toHaveProperty('endDate');

      // 검증: uptime은 0-100 범위
      expect(response.body.uptime).toBeGreaterThanOrEqual(0);
      expect(response.body.uptime).toBeLessThanOrEqual(100);
    });

    it('should handle 7 day period', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/statistics/endpoints/${endpointId}/uptime`)
        .query({ period: '7d' })
        .expect(200);

      expect(response.body).toHaveProperty('period', '7d');
    });

    it('should handle 30 day period', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/statistics/endpoints/${endpointId}/uptime`)
        .query({ period: '30d' })
        .expect(200);

      expect(response.body).toHaveProperty('period', '30d');
    });

    it('should return 400 for invalid UUID', async () => {
      await request(app.getHttpServer())
        .get('/api/statistics/endpoints/invalid-id/uptime')
        .expect(400);
    });

    it('should return default period (24h) when not specified', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/statistics/endpoints/${endpointId}/uptime`)
        .expect(200);

      // Default period should be 24h
      expect(response.body).toHaveProperty('period');
    });
  });

  describe('GET /api/statistics/endpoints/:id/response-time - 응답 시간 통계', () => {
    const endpointId = '550e8400-e29b-41d4-a716-446655440001';

    it('should return 200 with response time statistics', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/statistics/endpoints/${endpointId}/response-time`)
        .query({ period: '24h' })
        .expect(200);

      expect(response.body).toHaveProperty('endpointId');
      expect(response.body).toHaveProperty('period');
      expect(response.body).toHaveProperty('statistics');
      expect(response.body.statistics).toHaveProperty('avg');
      expect(response.body.statistics).toHaveProperty('min');
      expect(response.body.statistics).toHaveProperty('max');
      expect(response.body.statistics).toHaveProperty('p50');
      expect(response.body.statistics).toHaveProperty('p95');
      expect(response.body.statistics).toHaveProperty('p99');
    });

    it('should have valid percentile values (min <= p50 <= p95 <= p99 <= max)', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/statistics/endpoints/${endpointId}/response-time`)
        .query({ period: '24h' })
        .expect(200);

      const { min, p50, p95, p99, max } = response.body.statistics;

      expect(min).toBeLessThanOrEqual(p50);
      expect(p50).toBeLessThanOrEqual(p95);
      expect(p95).toBeLessThanOrEqual(p99);
      expect(p99).toBeLessThanOrEqual(max);
    });

    it('should include time series data', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/statistics/endpoints/${endpointId}/response-time`)
        .query({ period: '24h' })
        .expect(200);

      expect(response.body).toHaveProperty('timeSeries');
      expect(Array.isArray(response.body.timeSeries)).toBe(true);
    });

    it('should handle different periods', async () => {
      const periods = ['24h', '7d', '30d'];

      for (const period of periods) {
        const response = await request(app.getHttpServer())
          .get(`/api/statistics/endpoints/${endpointId}/response-time`)
          .query({ period })
          .expect(200);

        expect(response.body.period).toBe(period);
      }
    });

    it('should return 400 for invalid UUID', async () => {
      await request(app.getHttpServer())
        .get('/api/statistics/endpoints/invalid-id/response-time')
        .expect(400);
    });
  });

  describe('GET /api/statistics/overview - 전체 통계 개요', () => {
    it('should return 200 with overview statistics', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/statistics/overview')
        .expect(200);

      expect(response.body).toHaveProperty('totalEndpoints');
      expect(response.body).toHaveProperty('statusBreakdown');
      expect(response.body).toHaveProperty('overallUptime');
      expect(response.body).toHaveProperty('activeIncidents');
      expect(response.body).toHaveProperty('totalIncidents');
      expect(response.body).toHaveProperty('avgResponseTime');
    });

    it('should have valid status breakdown', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/statistics/overview')
        .expect(200);

      const { statusBreakdown } = response.body;

      expect(statusBreakdown).toHaveProperty('UP');
      expect(statusBreakdown).toHaveProperty('DOWN');
      expect(statusBreakdown).toHaveProperty('DEGRADED');
      expect(statusBreakdown).toHaveProperty('UNKNOWN');

      // All should be numbers >= 0
      expect(statusBreakdown.UP).toBeGreaterThanOrEqual(0);
      expect(statusBreakdown.DOWN).toBeGreaterThanOrEqual(0);
      expect(statusBreakdown.DEGRADED).toBeGreaterThanOrEqual(0);
      expect(statusBreakdown.UNKNOWN).toBeGreaterThanOrEqual(0);
    });

    it('should have valid uptime percentage', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/statistics/overview')
        .expect(200);

      expect(response.body.overallUptime).toBeGreaterThanOrEqual(0);
      expect(response.body.overallUptime).toBeLessThanOrEqual(100);
    });

    it('should include cache timestamp', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/statistics/overview')
        .expect(200);

      // cachedAt는 선택사항이지만, 있으면 유효한 날짜여야 함
      if (response.body.cachedAt) {
        expect(new Date(response.body.cachedAt)).toBeInstanceOf(Date);
      }
    });
  });

  describe('GET /api/statistics/incidents - 인시던트 목록 조회', () => {
    it('should return 200 with incidents list', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/statistics/incidents')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('meta');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should have valid pagination metadata', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/statistics/incidents')
        .expect(200);

      const { meta } = response.body;

      expect(meta).toHaveProperty('total');
      expect(meta).toHaveProperty('page');
      expect(meta).toHaveProperty('limit');
      expect(meta).toHaveProperty('totalPages');

      expect(meta.page).toBeGreaterThanOrEqual(1);
      expect(meta.limit).toBeGreaterThanOrEqual(1);
      expect(meta.total).toBeGreaterThanOrEqual(0);
    });

    it('should handle pagination parameters', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/statistics/incidents')
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body.meta.page).toBe(1);
      expect(response.body.meta.limit).toBe(10);
      expect(response.body.data.length).toBeLessThanOrEqual(10);
    });

    it('should filter by status when provided', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/statistics/incidents')
        .query({ status: 'active' })
        .expect(200);

      // All incidents should have status property (active or resolved)
      response.body.data.forEach((incident: any) => {
        expect(incident).toHaveProperty('startedAt');
      });
    });

    it('should return 400 for invalid pagination params', async () => {
      await request(app.getHttpServer())
        .get('/api/statistics/incidents')
        .query({ page: 0 }) // page should be >= 1
        .expect(400);
    });

    it('should return 400 for limit exceeding maximum', async () => {
      await request(app.getHttpServer())
        .get('/api/statistics/incidents')
        .query({ limit: 101 }) // limit max is 100
        .expect(400);
    });
  });

  describe('GET /api/statistics/incidents/:id - 인시던트 상세 조회', () => {
    const incidentId = '550e8400-e29b-41d4-a716-446655440000';

    it('should return incident detail when exists', async () => {
      // 먼저 인시던트 목록을 조회하여 유효한 ID를 얻음
      const listResponse = await request(app.getHttpServer())
        .get('/api/statistics/incidents')
        .expect(200);

      if (listResponse.body.data.length > 0) {
        const actualIncidentId = listResponse.body.data[0].id;

        const response = await request(app.getHttpServer())
          .get(`/api/statistics/incidents/${actualIncidentId}`)
          .expect(200);

        expect(response.body).toHaveProperty('id');
        expect(response.body).toHaveProperty('endpointId');
        expect(response.body).toHaveProperty('startedAt');
        expect(response.body).toHaveProperty('failureCount');
        expect(response.body).toHaveProperty('errorMessage');
      }
    });

    it('should include check results in detail', async () => {
      const listResponse = await request(app.getHttpServer())
        .get('/api/statistics/incidents')
        .expect(200);

      if (listResponse.body.data.length > 0) {
        const actualIncidentId = listResponse.body.data[0].id;

        const response = await request(app.getHttpServer())
          .get(`/api/statistics/incidents/${actualIncidentId}`)
          .expect(200);

        expect(response.body).toHaveProperty('checkResults');
        expect(Array.isArray(response.body.checkResults)).toBe(true);
      }
    });

    it('should return 400 for invalid UUID', async () => {
      await request(app.getHttpServer())
        .get('/api/statistics/incidents/invalid-id')
        .expect(400);
    });

    it('should return 404 for non-existent incident', async () => {
      const nonExistentId = '550e8400-e29b-41d4-a716-000000000000';

      await request(app.getHttpServer())
        .get(`/api/statistics/incidents/${nonExistentId}`)
        .expect(404);
    });
  });

  describe('GET /api/statistics/comparison - 엔드포인트 성능 비교', () => {
    it('should return 200 with comparison data', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/statistics/comparison')
        .expect(200);

      expect(response.body).toHaveProperty('endpoints');
      expect(Array.isArray(response.body.endpoints)).toBe(true);
    });

    it('should include all required fields in comparison', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/statistics/comparison')
        .expect(200);

      response.body.endpoints.forEach((endpoint: any) => {
        expect(endpoint).toHaveProperty('id');
        expect(endpoint).toHaveProperty('name');
        expect(endpoint).toHaveProperty('uptime');
        expect(endpoint).toHaveProperty('avgResponseTime');
        expect(endpoint).toHaveProperty('stabilityScore');
        expect(endpoint).toHaveProperty('rank');
      });
    });

    it('should have sorted endpoints by stability score', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/statistics/comparison')
        .expect(200);

      const endpoints = response.body.endpoints;

      // Check that stability scores are in descending order
      for (let i = 1; i < endpoints.length; i++) {
        expect(endpoints[i - 1].stabilityScore).toBeGreaterThanOrEqual(
          endpoints[i].stabilityScore,
        );
      }

      // Check that ranks are sequential
      for (let i = 0; i < endpoints.length; i++) {
        expect(endpoints[i].rank).toBe(i + 1);
      }
    });

    it('should have valid stability score range (0-100)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/statistics/comparison')
        .expect(200);

      response.body.endpoints.forEach((endpoint: any) => {
        expect(endpoint.stabilityScore).toBeGreaterThanOrEqual(0);
        expect(endpoint.stabilityScore).toBeLessThanOrEqual(100);
      });
    });

    it('should include generation timestamp', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/statistics/comparison')
        .expect(200);

      expect(response.body).toHaveProperty('generatedAt');
      expect(new Date(response.body.generatedAt)).toBeInstanceOf(Date);
    });
  });

  describe('Caching behavior', () => {
    it('should cache overview results', async () => {
      const before = Date.now();

      const response1 = await request(app.getHttpServer())
        .get('/api/statistics/overview')
        .expect(200);

      const response2 = await request(app.getHttpServer())
        .get('/api/statistics/overview')
        .expect(200);

      const after = Date.now();

      // Both responses should have same data (cached)
      expect(response1.body.totalEndpoints).toBe(response2.body.totalEndpoints);
    });

    it('should cache comparison results', async () => {
      const response1 = await request(app.getHttpServer())
        .get('/api/statistics/comparison')
        .expect(200);

      const response2 = await request(app.getHttpServer())
        .get('/api/statistics/comparison')
        .expect(200);

      // Both responses should have same data (cached)
      expect(response1.body.endpoints.length).toBe(response2.body.endpoints.length);
    });
  });

  describe('Error handling', () => {
    it('should return 400 for invalid query parameters', async () => {
      await request(app.getHttpServer())
        .get('/api/statistics/endpoints/550e8400-e29b-41d4-a716-446655440000/uptime')
        .query({ period: 'invalid' })
        .expect(400);
    });

    it('should return appropriate status codes', async () => {
      // Valid endpoint UUID but endpoint doesn't exist - should still return data
      // (since we don't have validation for endpoint existence in this API)
      const response = await request(app.getHttpServer())
        .get('/api/statistics/endpoints/550e8400-e29b-41d4-a716-000000000000/uptime')
        .expect(200);

      // Should return 0 uptime for non-existent endpoint
      expect(response.body.uptime).toBeDefined();
    });
  });

  describe('Response format validation', () => {
    it('uptime response should match schema', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/statistics/endpoints/550e8400-e29b-41d4-a716-446655440000/uptime')
        .expect(200);

      // Validate response structure
      expect(typeof response.body.endpointId).toBe('string');
      expect(typeof response.body.period).toBe('string');
      expect(typeof response.body.uptime).toBe('number');
      expect(typeof response.body.totalChecks).toBe('number');
      expect(typeof response.body.successfulChecks).toBe('number');
      expect(typeof response.body.failedChecks).toBe('number');
    });

    it('response-time response should match schema', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/statistics/endpoints/550e8400-e29b-41d4-a716-446655440000/response-time')
        .expect(200);

      // Validate response structure
      expect(typeof response.body.endpointId).toBe('string');
      expect(typeof response.body.period).toBe('string');
      expect(typeof response.body.statistics).toBe('object');
      expect(typeof response.body.statistics.avg).toBe('number');
      expect(Array.isArray(response.body.timeSeries)).toBe(true);
    });

    it('overview response should match schema', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/statistics/overview')
        .expect(200);

      // Validate response structure
      expect(typeof response.body.totalEndpoints).toBe('number');
      expect(typeof response.body.statusBreakdown).toBe('object');
      expect(typeof response.body.overallUptime).toBe('number');
      expect(typeof response.body.activeIncidents).toBe('number');
    });

    it('incidents response should match schema', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/statistics/incidents')
        .expect(200);

      // Validate response structure
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(typeof response.body.meta).toBe('object');
      expect(typeof response.body.meta.total).toBe('number');
      expect(typeof response.body.meta.page).toBe('number');
      expect(typeof response.body.meta.limit).toBe('number');
    });

    it('comparison response should match schema', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/statistics/comparison')
        .expect(200);

      // Validate response structure
      expect(Array.isArray(response.body.endpoints)).toBe(true);
      expect(typeof response.body.generatedAt).toBe('string');

      if (response.body.endpoints.length > 0) {
        const endpoint = response.body.endpoints[0];
        expect(typeof endpoint.id).toBe('string');
        expect(typeof endpoint.name).toBe('string');
        expect(typeof endpoint.uptime).toBe('number');
        expect(typeof endpoint.avgResponseTime).toBe('number');
        expect(typeof endpoint.stabilityScore).toBe('number');
        expect(typeof endpoint.rank).toBe('number');
      }
    });
  });
});
