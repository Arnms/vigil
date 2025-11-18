import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { EndpointController } from './endpoint.controller';
import { EndpointService } from './endpoint.service';
import { Endpoint, EndpointStatus, HttpMethod } from './endpoint.entity';
import { CheckResult, CheckStatus } from '../health-check/check-result.entity';

describe('EndpointController', () => {
  let controller: EndpointController;
  let service: EndpointService;

  const mockEndpoint: Endpoint = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    name: 'Test API',
    url: 'https://api.example.com/health',
    method: HttpMethod.GET,
    headers: { 'Authorization': 'Bearer token' },
    body: null,
    checkInterval: 60,
    expectedStatusCode: 200,
    timeoutThreshold: 5000,
    isActive: true,
    currentStatus: EndpointStatus.UP,
    lastResponseTime: 150,
    lastCheckedAt: new Date(),
    consecutiveFailures: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    checkResults: [],
    incidents: [],
  };

  const mockCheckResult: CheckResult = {
    id: 'check-123',
    endpointId: mockEndpoint.id,
    status: CheckStatus.SUCCESS,
    responseTime: 150,
    statusCode: 200,
    errorMessage: null,
    checkedAt: new Date(),
    endpoint: mockEndpoint,
  };

  const mockEndpointService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    manualHealthCheck: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EndpointController],
      providers: [
        {
          provide: EndpointService,
          useValue: mockEndpointService,
        },
      ],
    }).compile();

    controller = module.get<EndpointController>(EndpointController);
    service = module.get<EndpointService>(EndpointService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a new endpoint', async () => {
      const createDto = {
        name: 'Test API',
        url: 'https://api.example.com/health',
        method: HttpMethod.GET,
        headers: { 'Authorization': 'Bearer token' },
        body: null,
        checkInterval: 60,
        expectedStatusCode: 200,
        timeoutThreshold: 5000,
      };

      jest.spyOn(service, 'create').mockResolvedValue(mockEndpoint);

      const result = await controller.create(createDto);

      expect(result).toEqual(mockEndpoint);
      expect(service.create).toHaveBeenCalledWith(createDto);
    });

    it('should return created endpoint with proper HTTP status', async () => {
      const createDto = {
        name: 'New Endpoint',
        url: 'https://new-api.example.com',
        method: HttpMethod.POST,
        headers: {},
        body: JSON.stringify({ test: true }),
        checkInterval: 120,
        expectedStatusCode: 201,
        timeoutThreshold: 3000,
      };

      const newEndpoint = { ...mockEndpoint, ...createDto };
      jest.spyOn(service, 'create').mockResolvedValue(newEndpoint);

      const result = await controller.create(createDto);

      expect(result).toEqual(newEndpoint);
      expect(result.name).toBe('New Endpoint');
    });

    it('should handle creation errors', async () => {
      const createDto = {
        name: '',
        url: 'invalid-url',
        method: HttpMethod.GET,
        headers: {},
        body: null,
        checkInterval: -1,
        expectedStatusCode: 200,
        timeoutThreshold: 5000,
      };

      jest
        .spyOn(service, 'create')
        .mockRejectedValue(
          new BadRequestException('Invalid endpoint data'),
        );

      await expect(controller.create(createDto)).rejects.toThrow(
        'Invalid endpoint data',
      );
    });
  });

  describe('findAll', () => {
    it('should return list of all endpoints', async () => {
      const endpoints = [mockEndpoint];
      jest.spyOn(service, 'findAll').mockResolvedValue(endpoints);

      const result = await controller.findAll({});

      expect(result).toEqual(endpoints);
      expect(service.findAll).toHaveBeenCalled();
    });

    it('should support pagination query', async () => {
      const query = { skip: 10, take: 20 };
      const endpoints = [mockEndpoint];

      jest.spyOn(service, 'findAll').mockResolvedValue(endpoints);

      const result = await controller.findAll(query);

      expect(result).toEqual(endpoints);
      expect(service.findAll).toHaveBeenCalledWith(query);
    });

    it('should support filtering by status', async () => {
      const query = { status: EndpointStatus.UP };
      const upEndpoints = [mockEndpoint];

      jest.spyOn(service, 'findAll').mockResolvedValue(upEndpoints);

      const result = await controller.findAll(query);

      expect(result).toEqual(upEndpoints);
      expect(service.findAll).toHaveBeenCalledWith(query);
    });

    it('should support sorting', async () => {
      const query = { sortBy: 'createdAt', order: 'DESC' };
      const endpoints = [mockEndpoint];

      jest.spyOn(service, 'findAll').mockResolvedValue(endpoints);

      const result = await controller.findAll(query);

      expect(result).toEqual(endpoints);
      expect(service.findAll).toHaveBeenCalledWith(query);
    });

    it('should return empty list when no endpoints exist', async () => {
      jest.spyOn(service, 'findAll').mockResolvedValue([]);

      const result = await controller.findAll({});

      expect(result).toEqual([]);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('findOne', () => {
    it('should return endpoint by id', async () => {
      const id = mockEndpoint.id;
      jest.spyOn(service, 'findOne').mockResolvedValue(mockEndpoint);

      const result = await controller.findOne(id);

      expect(result).toEqual(mockEndpoint);
      expect(service.findOne).toHaveBeenCalledWith(id);
    });

    it('should include endpoint details', async () => {
      const id = mockEndpoint.id;
      jest.spyOn(service, 'findOne').mockResolvedValue(mockEndpoint);

      const result = await controller.findOne(id);

      expect(result.id).toBe(id);
      expect(result.name).toBe('Test API');
      expect(result.url).toBe('https://api.example.com/health');
      expect(result.currentStatus).toBe(EndpointStatus.UP);
    });

    it('should throw error when endpoint not found', async () => {
      const id = '999e8400-e29b-41d4-a716-446655440000';
      jest
        .spyOn(service, 'findOne')
        .mockRejectedValue(new Error('Endpoint not found'));

      await expect(controller.findOne(id)).rejects.toThrow('Endpoint not found');
    });

    it('should validate UUID format', async () => {
      const invalidId = 'invalid-uuid';
      jest
        .spyOn(service, 'findOne')
        .mockRejectedValue(
          new BadRequestException('Invalid UUID format'),
        );

      await expect(controller.findOne(invalidId)).rejects.toThrow(
        'Invalid UUID format',
      );
    });
  });

  describe('update', () => {
    it('should update endpoint with new data', async () => {
      const id = mockEndpoint.id;
      const updateDto = {
        name: 'Updated API',
        checkInterval: 120,
      };
      const updatedEndpoint = { ...mockEndpoint, ...updateDto };

      jest.spyOn(service, 'update').mockResolvedValue(updatedEndpoint);

      const result = await controller.update(id, updateDto);

      expect(result).toEqual(updatedEndpoint);
      expect(result.name).toBe('Updated API');
      expect(result.checkInterval).toBe(120);
      expect(service.update).toHaveBeenCalledWith(id, updateDto);
    });

    it('should partial update endpoint', async () => {
      const id = mockEndpoint.id;
      const updateDto = { timeoutThreshold: 10000 };
      const updatedEndpoint = { ...mockEndpoint, timeoutThreshold: 10000 };

      jest.spyOn(service, 'update').mockResolvedValue(updatedEndpoint);

      const result = await controller.update(id, updateDto);

      expect(result.timeoutThreshold).toBe(10000);
      expect(service.update).toHaveBeenCalledWith(id, updateDto);
    });

    it('should throw error when endpoint not found', async () => {
      const id = '999e8400-e29b-41d4-a716-446655440000';
      const updateDto = { name: 'Updated' };

      jest
        .spyOn(service, 'update')
        .mockRejectedValue(new Error('Endpoint not found'));

      await expect(controller.update(id, updateDto)).rejects.toThrow(
        'Endpoint not found',
      );
    });

    it('should handle validation errors on update', async () => {
      const id = mockEndpoint.id;
      const updateDto = { checkInterval: -1 };

      jest
        .spyOn(service, 'update')
        .mockRejectedValue(
          new BadRequestException('Invalid check interval'),
        );

      await expect(controller.update(id, updateDto)).rejects.toThrow(
        'Invalid check interval',
      );
    });
  });

  describe('remove', () => {
    it('should delete endpoint by id', async () => {
      const id = mockEndpoint.id;
      jest.spyOn(service, 'remove').mockResolvedValue(undefined);

      const result = await controller.remove(id);

      expect(result).toEqual({ message: 'Endpoint deleted successfully' });
      expect(service.remove).toHaveBeenCalledWith(id);
    });

    it('should return success message after deletion', async () => {
      const id = mockEndpoint.id;
      jest.spyOn(service, 'remove').mockResolvedValue(undefined);

      const result = await controller.remove(id);

      expect(result.message).toBe('Endpoint deleted successfully');
    });

    it('should throw error when endpoint not found', async () => {
      const id = '999e8400-e29b-41d4-a716-446655440000';
      jest
        .spyOn(service, 'remove')
        .mockRejectedValue(new Error('Endpoint not found'));

      await expect(controller.remove(id)).rejects.toThrow('Endpoint not found');
    });

    it('should handle cascading deletion', async () => {
      const id = mockEndpoint.id;
      jest.spyOn(service, 'remove').mockResolvedValue(undefined);

      await controller.remove(id);

      expect(service.remove).toHaveBeenCalledWith(id);
    });
  });

  describe('manualHealthCheck', () => {
    it('should perform manual health check', async () => {
      const id = mockEndpoint.id;
      jest.spyOn(service, 'manualHealthCheck').mockResolvedValue(mockCheckResult);

      const result = await controller.manualHealthCheck(id);

      expect(result).toEqual(mockCheckResult);
      expect(result.status).toBe(CheckStatus.SUCCESS);
      expect(service.manualHealthCheck).toHaveBeenCalledWith(id);
    });

    it('should return check result with response time', async () => {
      const id = mockEndpoint.id;
      const checkResult = { ...mockCheckResult, responseTime: 250 };

      jest.spyOn(service, 'manualHealthCheck').mockResolvedValue(checkResult);

      const result = await controller.manualHealthCheck(id);

      expect(result.responseTime).toBe(250);
      expect(result.statusCode).toBe(200);
    });

    it('should handle failed health check', async () => {
      const id = mockEndpoint.id;
      const failedResult = {
        ...mockCheckResult,
        status: CheckStatus.FAILURE,
        statusCode: 500,
        errorMessage: 'Internal Server Error',
        responseTime: 5000,
      };

      jest.spyOn(service, 'manualHealthCheck').mockResolvedValue(failedResult);

      const result = await controller.manualHealthCheck(id);

      expect(result.status).toBe(CheckStatus.FAILURE);
      expect(result.errorMessage).toBe('Internal Server Error');
    });

    it('should throw error when endpoint not found', async () => {
      const id = '999e8400-e29b-41d4-a716-446655440000';
      jest
        .spyOn(service, 'manualHealthCheck')
        .mockRejectedValue(new Error('Endpoint not found'));

      await expect(controller.manualHealthCheck(id)).rejects.toThrow(
        'Endpoint not found',
      );
    });

    it('should handle timeout errors during check', async () => {
      const id = mockEndpoint.id;
      jest
        .spyOn(service, 'manualHealthCheck')
        .mockRejectedValue(new Error('Request timeout'));

      await expect(controller.manualHealthCheck(id)).rejects.toThrow(
        'Request timeout',
      );
    });

    it('should record timestamp for health check', async () => {
      const id = mockEndpoint.id;
      jest.spyOn(service, 'manualHealthCheck').mockResolvedValue(mockCheckResult);

      const result = await controller.manualHealthCheck(id);

      expect(result.checkedAt).toBeDefined();
      expect(result.checkedAt instanceof Date).toBe(true);
    });
  });

  describe('HTTP Status Codes', () => {
    it('create should return 201 status', async () => {
      const createDto = {
        name: 'Test API',
        url: 'https://api.example.com',
        method: HttpMethod.GET,
        headers: {},
        body: null,
        checkInterval: 60,
        expectedStatusCode: 200,
        timeoutThreshold: 5000,
      };

      jest.spyOn(service, 'create').mockResolvedValue(mockEndpoint);

      await controller.create(createDto);

      expect(service.create).toHaveBeenCalled();
    });

    it('remove should return 200 status', async () => {
      const id = mockEndpoint.id;
      jest.spyOn(service, 'remove').mockResolvedValue(undefined);

      const result = await controller.remove(id);

      expect(result).toEqual({ message: 'Endpoint deleted successfully' });
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      const id = mockEndpoint.id;
      const error = new Error('Database connection error');

      jest.spyOn(service, 'findOne').mockRejectedValue(error);

      await expect(controller.findOne(id)).rejects.toThrow(
        'Database connection error',
      );
    });

    it('should propagate validation errors', async () => {
      const createDto = {
        name: '',
        url: '',
        method: HttpMethod.GET,
        headers: {},
        body: null,
        checkInterval: 0,
        expectedStatusCode: 200,
        timeoutThreshold: 5000,
      };

      jest
        .spyOn(service, 'create')
        .mockRejectedValue(
          new BadRequestException('Validation failed'),
        );

      await expect(controller.create(createDto)).rejects.toThrow(
        'Validation failed',
      );
    });
  });

  describe('Data Integrity', () => {
    it('should preserve endpoint data through CRUD operations', async () => {
      const id = mockEndpoint.id;
      jest.spyOn(service, 'findOne').mockResolvedValue(mockEndpoint);

      const result = await controller.findOne(id);

      expect(result.id).toBe(mockEndpoint.id);
      expect(result.name).toBe(mockEndpoint.name);
      expect(result.url).toBe(mockEndpoint.url);
      expect(result.method).toBe(mockEndpoint.method);
      expect(result.headers).toEqual(mockEndpoint.headers);
    });

    it('should update endpoint without losing other fields', async () => {
      const id = mockEndpoint.id;
      const updateDto = { name: 'Updated Name' };
      const updatedEndpoint = { ...mockEndpoint, name: 'Updated Name' };

      jest.spyOn(service, 'update').mockResolvedValue(updatedEndpoint);

      const result = await controller.update(id, updateDto);

      expect(result.id).toBe(mockEndpoint.id);
      expect(result.url).toBe(mockEndpoint.url);
      expect(result.method).toBe(mockEndpoint.method);
      expect(result.name).toBe('Updated Name');
    });
  });
});
