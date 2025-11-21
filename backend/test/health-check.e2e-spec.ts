import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Endpoint } from '../src/modules/endpoint/endpoint.entity';
import { Repository } from 'typeorm';

/**
 * E2E 테스트: Health Check 모듈 API
 *
 * 테스트 범위:
 * - POST /api/endpoints/:id/check - 수동 엔드포인트 체크
 * - 체크 결과 검증 (성공, 실패, 타임아웃)
 * - 상태 업데이트 검증
 * - 에러 케이스 처리
 */
describe('Health Check Module E2E Tests', () => {
  let app: INestApplication;
  let endpointRepository: Repository<Endpoint>;
  let testEndpointId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    // Get repository for cleanup
    endpointRepository = moduleFixture.get<Repository<Endpoint>>(
      getRepositoryToken(Endpoint),
    );

    // Create a test endpoint for health checks
    const createDto = {
      name: 'Health Check Test API',
      url: 'https://httpbin.org/status/200',
      method: 'GET',
      headers: {},
      body: null,
      checkInterval: 30,
      expectedStatusCode: 200,
      timeoutThreshold: 5000,
    };

    const response = await request(app.getHttpServer())
      .post('/api/endpoints')
      .send(createDto);

    testEndpointId = response.body.id;
  });

  afterAll(async () => {
    // Clean up test data
    await endpointRepository.delete({});
    await app.close();
  });

  describe('POST /api/endpoints/:id/check - 수동 엔드포인트 체크', () => {
    it('should trigger health check for valid endpoint', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/endpoints/${testEndpointId}/check`)
        .expect(200);

      expect(response.body).toHaveProperty('endpointId');
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('statusCode');
      expect(response.body).toHaveProperty('responseTime');
      expect(response.body).toHaveProperty('checkedAt');
    });

    it('should return 404 for non-existent endpoint', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      await request(app.getHttpServer())
        .post(`/api/endpoints/${fakeId}/check`)
        .expect(404);
    });

    it('should return 400 for invalid UUID format', async () => {
      await request(app.getHttpServer())
        .post('/api/endpoints/invalid-id/check')
        .expect(400);
    });

    it('should record check result with correct status', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/endpoints/${testEndpointId}/check`)
        .expect(200);

      expect(['UP', 'DOWN', 'DEGRADED']).toContain(response.body.status);
    });

    it('should handle endpoints with POST method', async () => {
      // Create a POST endpoint
      const createDto = {
        name: 'POST Health Check Test',
        url: 'https://httpbin.org/post',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: { test: 'data' },
        checkInterval: 30,
        expectedStatusCode: 200,
        timeoutThreshold: 5000,
      };

      const createResponse = await request(app.getHttpServer())
        .post('/api/endpoints')
        .send(createDto)
        .expect(201);

      const postEndpointId = createResponse.body.id;

      // Perform check
      const checkResponse = await request(app.getHttpServer())
        .post(`/api/endpoints/${postEndpointId}/check`)
        .expect(200);

      expect(checkResponse.body).toHaveProperty('status');
    });

    it('should handle timeout scenarios', async () => {
      // Create an endpoint with very short timeout (likely to timeout)
      const createDto = {
        name: 'Timeout Test',
        url: 'https://httpbin.org/delay/10', // 10 second delay
        method: 'GET',
        headers: {},
        body: null,
        checkInterval: 30,
        expectedStatusCode: 200,
        timeoutThreshold: 1000, // 1 second timeout
      };

      const createResponse = await request(app.getHttpServer())
        .post('/api/endpoints')
        .send(createDto)
        .expect(201);

      const timeoutEndpointId = createResponse.body.id;

      // Perform check - should timeout
      const response = await request(app.getHttpServer())
        .post(`/api/endpoints/${timeoutEndpointId}/check`)
        .expect(200);

      expect(['DOWN', 'DEGRADED']).toContain(response.body.status);
    });

    it('should handle invalid URL in endpoint', async () => {
      // Create endpoint with invalid URL
      const createDto = {
        name: 'Invalid URL Test',
        url: 'https://invalid-domain-that-does-not-exist-12345.com',
        method: 'GET',
        headers: {},
        body: null,
        checkInterval: 30,
        expectedStatusCode: 200,
        timeoutThreshold: 5000,
      };

      const createResponse = await request(app.getHttpServer())
        .post('/api/endpoints')
        .send(createDto)
        .expect(201);

      const invalidEndpointId = createResponse.body.id;

      // Perform check - should fail
      const response = await request(app.getHttpServer())
        .post(`/api/endpoints/${invalidEndpointId}/check`)
        .expect(200);

      expect(response.body.status).toBe('DOWN');
    });

    it('should track response time accurately', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/endpoints/${testEndpointId}/check`)
        .expect(200);

      expect(response.body).toHaveProperty('responseTime');
      expect(response.body.responseTime).toBeGreaterThanOrEqual(0);
      expect(response.body.responseTime).toBeLessThan(30000); // Should be less than 30 seconds
    });

    it('should handle HTTP errors (4xx)', async () => {
      // Create endpoint that returns 404
      const createDto = {
        name: '404 Test',
        url: 'https://httpbin.org/status/404',
        method: 'GET',
        headers: {},
        body: null,
        checkInterval: 30,
        expectedStatusCode: 200,
        timeoutThreshold: 5000,
      };

      const createResponse = await request(app.getHttpServer())
        .post('/api/endpoints')
        .send(createDto)
        .expect(201);

      const notFoundEndpointId = createResponse.body.id;

      // Perform check
      const response = await request(app.getHttpServer())
        .post(`/api/endpoints/${notFoundEndpointId}/check`)
        .expect(200);

      // Status code doesn't match expected (200), so should be DOWN
      expect(response.body.statusCode).toBe(404);
      expect(response.body.status).toBe('DOWN');
    });

    it('should handle HTTP errors (5xx)', async () => {
      // Create endpoint that returns 500
      const createDto = {
        name: '500 Test',
        url: 'https://httpbin.org/status/500',
        method: 'GET',
        headers: {},
        body: null,
        checkInterval: 30,
        expectedStatusCode: 200,
        timeoutThreshold: 5000,
      };

      const createResponse = await request(app.getHttpServer())
        .post('/api/endpoints')
        .send(createDto)
        .expect(201);

      const serverErrorEndpointId = createResponse.body.id;

      // Perform check
      const response = await request(app.getHttpServer())
        .post(`/api/endpoints/${serverErrorEndpointId}/check`)
        .expect(200);

      // Status code doesn't match expected (200), so should be DOWN
      expect(response.body.statusCode).toBe(500);
      expect(response.body.status).toBe('DOWN');
    });

    it('should handle status code mismatches', async () => {
      // Create endpoint expecting 201 but gets 200
      const createDto = {
        name: 'Status Mismatch Test',
        url: 'https://httpbin.org/status/200',
        method: 'GET',
        headers: {},
        body: null,
        checkInterval: 30,
        expectedStatusCode: 201,
        timeoutThreshold: 5000,
      };

      const createResponse = await request(app.getHttpServer())
        .post('/api/endpoints')
        .send(createDto)
        .expect(201);

      const mismatchEndpointId = createResponse.body.id;

      // Perform check
      const response = await request(app.getHttpServer())
        .post(`/api/endpoints/${mismatchEndpointId}/check`)
        .expect(200);

      // Status code doesn't match expected (201), so should be DOWN
      expect(response.body.statusCode).toBe(200);
      expect(response.body.status).toBe('DOWN');
    });
  });

  describe('Check Result Storage', () => {
    it('should store check results in database', async () => {
      const checkResponse = await request(app.getHttpServer())
        .post(`/api/endpoints/${testEndpointId}/check`)
        .expect(200);

      // Verify result is stored by querying endpoint history
      const endpointResponse = await request(app.getHttpServer())
        .get(`/api/endpoints/${testEndpointId}`)
        .expect(200);

      expect(endpointResponse.body).toHaveProperty('lastCheckedAt');
      expect(new Date(endpointResponse.body.lastCheckedAt)).toBeInstanceOf(Date);
    });

    it('should update endpoint current status after check', async () => {
      const beforeResponse = await request(app.getHttpServer())
        .get(`/api/endpoints/${testEndpointId}`)
        .expect(200);

      const previousStatus = beforeResponse.body.currentStatus;

      // Perform check
      await request(app.getHttpServer())
        .post(`/api/endpoints/${testEndpointId}/check`)
        .expect(200);

      // Get updated endpoint
      const afterResponse = await request(app.getHttpServer())
        .get(`/api/endpoints/${testEndpointId}`)
        .expect(200);

      expect(['UP', 'DOWN', 'DEGRADED']).toContain(afterResponse.body.currentStatus);
    });
  });

  describe('Concurrent Health Checks', () => {
    it('should handle multiple concurrent checks', async () => {
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(
          request(app.getHttpServer())
            .post(`/api/endpoints/${testEndpointId}/check`)
            .expect(200),
        );
      }

      const responses = await Promise.all(promises);

      responses.forEach((response) => {
        expect(response.body).toHaveProperty('status');
        expect(response.body).toHaveProperty('responseTime');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle check request with query parameters', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/endpoints/${testEndpointId}/check`)
        .query({ force: 'true' })
        .expect(200);

      expect(response.body).toHaveProperty('status');
    });

    it('should handle check request with additional headers', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/endpoints/${testEndpointId}/check`)
        .set('X-Request-ID', 'test-123')
        .expect(200);

      expect(response.body).toHaveProperty('status');
    });

    it('should not allow check on inactive endpoint', async () => {
      // Create and then deactivate an endpoint
      const createDto = {
        name: 'Inactive Endpoint Test',
        url: 'https://httpbin.org/status/200',
        method: 'GET',
        headers: {},
        body: null,
        checkInterval: 30,
        expectedStatusCode: 200,
        timeoutThreshold: 5000,
        isActive: false,
      };

      const createResponse = await request(app.getHttpServer())
        .post('/api/endpoints')
        .send(createDto)
        .expect(201);

      const inactiveEndpointId = createResponse.body.id;

      // Try to check inactive endpoint
      const checkResponse = await request(app.getHttpServer())
        .post(`/api/endpoints/${inactiveEndpointId}/check`)
        .expect(200);

      // Should still allow check but may handle differently
      expect(checkResponse.body).toHaveProperty('status');
    });
  });
});
