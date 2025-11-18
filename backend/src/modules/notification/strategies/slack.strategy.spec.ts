import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { SlackStrategy } from './slack.strategy';
import { of, throwError } from 'rxjs';

describe('SlackStrategy', () => {
  let strategy: SlackStrategy;
  let httpService: HttpService;

  const mockHttpResponse = { status: 200, data: 'ok' };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SlackStrategy,
        {
          provide: HttpService,
          useValue: {
            post: jest.fn().mockReturnValue(of(mockHttpResponse)),
          },
        },
      ],
    }).compile();

    strategy = module.get<SlackStrategy>(SlackStrategy);
    httpService = module.get<HttpService>(HttpService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('send', () => {
    const mockPayload = {
      endpointName: 'Test API',
      endpointUrl: 'https://api.example.com',
      status: 'DOWN',
      previousStatus: 'UP',
      timestamp: new Date(),
      responseTime: 5000,
      statusCode: 500,
      errorMessage: 'Internal Server Error',
    };

    it('should send Slack message successfully', async () => {
      const config = {
        webhookUrl: 'https://hooks.slack.com/services/XXX/YYY/ZZZ',
        channel: '#alerts',
        username: 'Vigil Bot',
      };

      await strategy.send(config, mockPayload);

      expect(httpService.post).toHaveBeenCalledWith(
        'https://hooks.slack.com/services/XXX/YYY/ZZZ',
        expect.objectContaining({
          username: 'Vigil Bot',
          channel: '#alerts',
          blocks: expect.any(Array),
        }),
      );
    });

    it('should throw error when webhook URL is not configured', async () => {
      const config = { channel: '#alerts' };

      await expect(strategy.send(config, mockPayload)).rejects.toThrow(
        'Slack webhook URL not configured',
      );
    });

    it('should handle HTTP errors gracefully', async () => {
      const config = {
        webhookUrl: 'https://hooks.slack.com/services/XXX/YYY/ZZZ',
      };

      (httpService.post as jest.Mock).mockReturnValueOnce(
        throwError(() => new Error('Network error')),
      );

      await expect(strategy.send(config, mockPayload)).rejects.toThrow('Network error');
    });

    it('should throw error for non-200 HTTP response', async () => {
      const config = {
        webhookUrl: 'https://hooks.slack.com/services/XXX/YYY/ZZZ',
      };

      (httpService.post as jest.Mock).mockReturnValueOnce(
        of({ status: 400, data: 'Bad Request' }),
      );

      await expect(strategy.send(config, mockPayload)).rejects.toThrow(
        'Slack webhook returned status 400',
      );
    });

    it('should generate correct message format for DOWN status', async () => {
      const config = {
        webhookUrl: 'https://hooks.slack.com/services/XXX/YYY/ZZZ',
        channel: '#alerts',
      };

      await strategy.send(config, mockPayload);

      const callArgs = (httpService.post as jest.Mock).mock.calls[0][1];
      expect(callArgs.blocks).toContainEqual(
        expect.objectContaining({
          type: 'header',
          text: expect.objectContaining({
            text: expect.stringContaining('🔴'),
          }),
        }),
      );
    });

    it('should generate correct message format for UP status', async () => {
      const config = {
        webhookUrl: 'https://hooks.slack.com/services/XXX/YYY/ZZZ',
      };

      const upPayload = { ...mockPayload, status: 'UP' };

      await strategy.send(config, upPayload);

      const callArgs = (httpService.post as jest.Mock).mock.calls[0][1];
      expect(callArgs.blocks).toContainEqual(
        expect.objectContaining({
          type: 'header',
          text: expect.objectContaining({
            text: expect.stringContaining('🟢'),
          }),
        }),
      );
    });

    it('should include endpoint name in message', async () => {
      const config = {
        webhookUrl: 'https://hooks.slack.com/services/XXX/YYY/ZZZ',
      };

      await strategy.send(config, mockPayload);

      const callArgs = (httpService.post as jest.Mock).mock.calls[0][1];
      const messageText = JSON.stringify(callArgs.blocks);
      expect(messageText).toContain('Test API');
    });

    it('should include endpoint URL in message', async () => {
      const config = {
        webhookUrl: 'https://hooks.slack.com/services/XXX/YYY/ZZZ',
      };

      await strategy.send(config, mockPayload);

      const callArgs = (httpService.post as jest.Mock).mock.calls[0][1];
      const messageText = JSON.stringify(callArgs.blocks);
      expect(messageText).toContain('https://api.example.com');
    });

    it('should include error message in details', async () => {
      const config = {
        webhookUrl: 'https://hooks.slack.com/services/XXX/YYY/ZZZ',
      };

      await strategy.send(config, mockPayload);

      const callArgs = (httpService.post as jest.Mock).mock.calls[0][1];
      const messageText = JSON.stringify(callArgs.blocks);
      expect(messageText).toContain('Internal Server Error');
    });

    it('should include response time in details', async () => {
      const config = {
        webhookUrl: 'https://hooks.slack.com/services/XXX/YYY/ZZZ',
      };

      await strategy.send(config, mockPayload);

      const callArgs = (httpService.post as jest.Mock).mock.calls[0][1];
      const messageText = JSON.stringify(callArgs.blocks);
      expect(messageText).toContain('5000');
    });

    it('should use default username when not provided', async () => {
      const config = {
        webhookUrl: 'https://hooks.slack.com/services/XXX/YYY/ZZZ',
      };

      await strategy.send(config, mockPayload);

      const callArgs = (httpService.post as jest.Mock).mock.calls[0][1];
      expect(callArgs.username).toBe('Vigil Alert');
    });

    it('should truncate long error messages', async () => {
      const config = {
        webhookUrl: 'https://hooks.slack.com/services/XXX/YYY/ZZZ',
      };

      const longErrorPayload = {
        ...mockPayload,
        errorMessage: 'a'.repeat(150),
      };

      await strategy.send(config, longErrorPayload);

      const callArgs = (httpService.post as jest.Mock).mock.calls[0][1];
      const messageText = JSON.stringify(callArgs.blocks);
      // 100자로 잘려야 함 (truncate에서 100 제한) + '...'이 추가됨
      expect(messageText).toContain('...');
    });

    it('should include timestamp in message', async () => {
      const config = {
        webhookUrl: 'https://hooks.slack.com/services/XXX/YYY/ZZZ',
      };

      await strategy.send(config, mockPayload);

      const callArgs = (httpService.post as jest.Mock).mock.calls[0][1];
      expect(callArgs.blocks).toContainEqual(
        expect.objectContaining({
          type: 'section',
          text: expect.objectContaining({
            text: expect.stringContaining('_'),
          }),
        }),
      );
    });

    it('should not include channel in message when not provided', async () => {
      const config = {
        webhookUrl: 'https://hooks.slack.com/services/XXX/YYY/ZZZ',
      };

      await strategy.send(config, mockPayload);

      const callArgs = (httpService.post as jest.Mock).mock.calls[0][1];
      expect(callArgs.channel).toBeUndefined();
    });
  });
});
