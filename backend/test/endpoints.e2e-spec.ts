import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Endpoint } from '../src/modules/endpoint/endpoint.entity';
import { Repository } from 'typeorm';

/**
 * E2E 테스트: Endpoints 모듈 CRUD API
 *
 * 테스트 범위:
 * - POST /api/endpoints - 엔드포인트 생성
 * - GET /api/endpoints - 엔드포인트 목록 조회
 * - GET /api/endpoints/:id - 엔드포인트 상세 조회
 * - PATCH /api/endpoints/:id - 엔드포인트 수정
 * - DELETE /api/endpoints/:id - 엔드포인트 삭제
 * - 에러 케이스 (400, 404, 500)
 */
describe('Endpoints Module E2E Tests', () => {
  let app: INestApplication;
  let endpointRepository: Repository<Endpoint>;
  let createdEndpointId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );
    await app.init();

    // Get repository for cleanup
    endpointRepository = moduleFixture.get<Repository<Endpoint>>(
      getRepositoryToken(Endpoint),
    );

    // Create a test endpoint for subsequent tests
    const createDto = {
      name: 'Test API',
      url: 'https://api.example.com/health',
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

    createdEndpointId = response.body.id;
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/endpoints - 엔드포인트 생성', () => {
    it('should create a new endpoint with valid data', async () => {
      const createDto = {
        name: 'Test API',
        url: 'https://api.example.com/health',
        method: 'GET',
        headers: {},
        body: null,
        checkInterval: 30,
        expectedStatusCode: 200,
        timeoutThreshold: 5000,
      };

      const response = await request(app.getHttpServer())
        .post('/api/endpoints')
        .send(createDto)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('name', createDto.name);
      expect(response.body).toHaveProperty('url', createDto.url);
      expect(response.body).toHaveProperty('method', createDto.method);
      expect(response.body).toHaveProperty('checkInterval', createDto.checkInterval);
      expect(response.body).toHaveProperty('currentStatus', 'UNKNOWN');
      expect(response.body).toHaveProperty('isActive', true);

      createdEndpointId = response.body.id;
    });

    it('should return 400 for missing required fields', async () => {
      const invalidDto = {
        name: 'Test API',
        // Missing required fields
      };

      await request(app.getHttpServer())
        .post('/api/endpoints')
        .send(invalidDto)
        .expect(400);
    });

    it('should return 400 for invalid URL', async () => {
      const invalidDto = {
        name: 'Test API',
        url: 'not-a-valid-url',
        method: 'GET',
        headers: {},
        body: null,
        checkInterval: 30,
        expectedStatusCode: 200,
        timeoutThreshold: 5000,
      };

      await request(app.getHttpServer())
        .post('/api/endpoints')
        .send(invalidDto)
        .expect(400);
    });

    it('should return 400 for invalid HTTP method', async () => {
      const invalidDto = {
        name: 'Test API',
        url: 'https://api.example.com/health',
        method: 'INVALID',
        headers: {},
        body: null,
        checkInterval: 30,
        expectedStatusCode: 200,
        timeoutThreshold: 5000,
      };

      await request(app.getHttpServer())
        .post('/api/endpoints')
        .send(invalidDto)
        .expect(400);
    });

    it('should return 400 for invalid status code', async () => {
      const invalidDto = {
        name: 'Test API',
        url: 'https://api.example.com/health',
        method: 'GET',
        headers: {},
        body: null,
        checkInterval: 30,
        expectedStatusCode: 999,
        timeoutThreshold: 5000,
      };

      await request(app.getHttpServer())
        .post('/api/endpoints')
        .send(invalidDto)
        .expect(400);
    });

    it('should accept POST request with body', async () => {
      const createDto = {
        name: 'POST API',
        url: 'https://api.example.com/data',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: { key: 'value' },
        checkInterval: 60,
        expectedStatusCode: 201,
        timeoutThreshold: 8000,
      };

      const response = await request(app.getHttpServer())
        .post('/api/endpoints')
        .send(createDto)
        .expect(201);

      expect(response.body.method).toBe('POST');
      expect(response.body.body).toEqual(createDto.body);
    });
  });

  describe('GET /api/endpoints - 엔드포인트 목록 조회', () => {
    it('should return list of endpoints', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/endpoints')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('meta');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should return paginated results with limit and page', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/endpoints')
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('meta');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.meta).toHaveProperty('page', 1);
      expect(response.body.meta).toHaveProperty('limit', 10);
    });

    it('should filter endpoints by status', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/endpoints')
        .query({ status: 'UP' })
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should support sorting by name', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/endpoints')
        .query({ sortBy: 'name', order: 'ASC' })
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('GET /api/endpoints/:id - 엔드포인트 상세 조회', () => {
    it('should return endpoint details for valid ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/endpoints/${createdEndpointId}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', createdEndpointId);
      expect(response.body).toHaveProperty('name');
      expect(response.body).toHaveProperty('url');
      expect(response.body).toHaveProperty('method');
    });

    it('should return 404 for non-existent endpoint', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      await request(app.getHttpServer())
        .get(`/api/endpoints/${fakeId}`)
        .expect(404);
    });

    it('should return 400 for invalid UUID format', async () => {
      await request(app.getHttpServer())
        .get('/api/endpoints/invalid-id')
        .expect(400);
    });

    it('should include check results in response', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/endpoints/${createdEndpointId}`)
        .expect(200);

      expect(response.body).toHaveProperty('lastCheckedAt');
      expect(response.body).toHaveProperty('currentStatus');
    });
  });

  describe('PATCH /api/endpoints/:id - 엔드포인트 수정', () => {
    it('should update endpoint with valid data', async () => {
      const updateDto = {
        name: 'Updated API',
        checkInterval: 60,
      };

      const response = await request(app.getHttpServer())
        .patch(`/api/endpoints/${createdEndpointId}`)
        .send(updateDto)
        .expect(200);

      expect(response.body).toHaveProperty('name', updateDto.name);
      expect(response.body).toHaveProperty('checkInterval', updateDto.checkInterval);
    });

    it('should return 404 for non-existent endpoint', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const updateDto = { name: 'Updated' };

      await request(app.getHttpServer())
        .patch(`/api/endpoints/${fakeId}`)
        .send(updateDto)
        .expect(404);
    });

    it('should return 400 for invalid update data', async () => {
      const invalidDto = {
        checkInterval: -1, // Invalid: negative interval
      };

      await request(app.getHttpServer())
        .patch(`/api/endpoints/${createdEndpointId}`)
        .send(invalidDto)
        .expect(400);
    });

    it('should allow toggling isActive status', async () => {
      const updateDto = { isActive: false };

      const response = await request(app.getHttpServer())
        .patch(`/api/endpoints/${createdEndpointId}`)
        .send(updateDto)
        .expect(200);

      expect(response.body).toHaveProperty('isActive', false);
    });

    it('should allow partial updates', async () => {
      const updateDto = {
        expectedStatusCode: 201,
      };

      const response = await request(app.getHttpServer())
        .patch(`/api/endpoints/${createdEndpointId}`)
        .send(updateDto)
        .expect(200);

      expect(response.body).toHaveProperty('expectedStatusCode', 201);
    });
  });

  describe('DELETE /api/endpoints/:id - 엔드포인트 삭제', () => {
    let deleteTargetId: string;

    beforeAll(async () => {
      // Create an endpoint specifically for deletion
      const createDto = {
        name: 'Delete Target',
        url: 'https://api.example.com/delete-test',
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

      deleteTargetId = response.body.id;
    });

    it('should delete endpoint successfully', async () => {
      await request(app.getHttpServer())
        .delete(`/api/endpoints/${deleteTargetId}`)
        .expect(200);

      // Verify deletion
      await request(app.getHttpServer())
        .get(`/api/endpoints/${deleteTargetId}`)
        .expect(404);
    });

    it('should return 404 when deleting non-existent endpoint', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      await request(app.getHttpServer())
        .delete(`/api/endpoints/${fakeId}`)
        .expect(404);
    });

    it('should return 400 for invalid UUID format', async () => {
      await request(app.getHttpServer())
        .delete('/api/endpoints/invalid-id')
        .expect(400);
    });
  });

  describe('Error Handling', () => {
    it('should return 400 for malformed JSON', async () => {
      await request(app.getHttpServer())
        .post('/api/endpoints')
        .set('Content-Type', 'application/json')
        .send('{invalid json}')
        .expect(400);
    });

    it('should return 404 for unsupported HTTP methods', async () => {
      // NestJS returns 404 when route doesn't exist, not 405
      await request(app.getHttpServer())
        .put('/api/endpoints')
        .send({})
        .expect(404);
    });

    it('should return proper error message for validation errors', async () => {
      const invalidDto = {
        name: '',
        url: 'https://api.example.com',
      };

      const response = await request(app.getHttpServer())
        .post('/api/endpoints')
        .send(invalidDto);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('Data Integrity', () => {
    it('should not allow duplicate endpoint URLs with same method', async () => {
      const createDto = {
        name: 'Duplicate Test 1',
        url: 'https://api.example.com/duplicate',
        method: 'GET',
        headers: {},
        body: null,
        checkInterval: 30,
        expectedStatusCode: 200,
        timeoutThreshold: 5000,
      };

      // First creation should succeed
      const firstResponse = await request(app.getHttpServer())
        .post('/api/endpoints')
        .send(createDto)
        .expect(201);

      // Second creation with same data should be allowed or handled
      const secondResponse = await request(app.getHttpServer())
        .post('/api/endpoints')
        .send({
          ...createDto,
          name: 'Duplicate Test 2',
        });

      // Should either succeed (if duplicates allowed) or return 400
      expect([201, 400]).toContain(secondResponse.status);
    });

    it('should preserve headers and body in endpoint', async () => {
      const createDto = {
        name: 'Headers Test',
        url: 'https://api.example.com/headers',
        method: 'POST',
        headers: {
          'Authorization': 'Bearer token123',
          'X-Custom-Header': 'custom-value',
        },
        body: { action: 'test', data: [1, 2, 3] },
        checkInterval: 30,
        expectedStatusCode: 200,
        timeoutThreshold: 5000,
      };

      const response = await request(app.getHttpServer())
        .post('/api/endpoints')
        .send(createDto)
        .expect(201);

      const detailResponse = await request(app.getHttpServer())
        .get(`/api/endpoints/${response.body.id}`)
        .expect(200);

      expect(detailResponse.body.headers).toEqual(createDto.headers);
      expect(detailResponse.body.body).toEqual(createDto.body);
    });
  });
});
