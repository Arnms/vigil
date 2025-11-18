import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EmailStrategy } from './email.strategy';

jest.mock('nodemailer');
import nodemailer from 'nodemailer';

describe('EmailStrategy', () => {
  let strategy: EmailStrategy;
  let configService: ConfigService;

  const mockTransporter = {
    sendMail: jest.fn().mockResolvedValue({ response: 'OK' }),
  };

  beforeEach(async () => {
    (nodemailer.createTransport as jest.Mock).mockReturnValue(mockTransporter);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailStrategy,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              const config: Record<string, any> = {
                SMTP_HOST: 'smtp.gmail.com',
                SMTP_PORT: 587,
                SMTP_SECURE: 'false',
                SMTP_USER: 'test@gmail.com',
                SMTP_PASS: 'password123',
                MAIL_FROM_NAME: 'Vigil',
              };
              return config[key] ?? defaultValue;
            }),
          },
        },
      ],
    }).compile();

    strategy = module.get<EmailStrategy>(EmailStrategy);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize transporter with correct config', () => {
      expect(nodemailer.createTransport).toHaveBeenCalledWith({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          user: 'test@gmail.com',
          pass: 'password123',
        },
      });
    });
  });

  describe('send', () => {
    const mockPayload = {
      endpointName: 'Test API',
      endpointUrl: 'https://api.example.com',
      status: 'DOWN',
      previousStatus: 'UP',
      timestamp: new Date(),
      responseTime: 5000,
      errorMessage: 'Connection timeout',
    };

    it('should send email successfully', async () => {
      const config = { recipients: ['test@example.com', 'admin@example.com'] };

      await strategy.send(config, mockPayload);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: expect.stringContaining('Vigil'),
          to: 'test@example.com,admin@example.com',
          subject: expect.stringContaining('Test API'),
          html: expect.stringContaining('DOWN'),
        }),
      );
    });

    it('should throw error when no recipients configured', async () => {
      const config = { recipients: [] };

      await expect(strategy.send(config, mockPayload)).rejects.toThrow(
        'No email recipients configured',
      );
    });

    it('should throw error when recipients is undefined', async () => {
      const config = {};

      await expect(strategy.send(config, mockPayload)).rejects.toThrow(
        'No email recipients configured',
      );
    });

    it('should handle SMTP errors gracefully', async () => {
      const smtpError = new Error('SMTP connection failed');
      (mockTransporter.sendMail as jest.Mock).mockRejectedValueOnce(smtpError);

      const config = { recipients: ['test@example.com'] };

      await expect(strategy.send(config, mockPayload)).rejects.toThrow('SMTP connection failed');
    });

    it('should generate correct subject for UP status', async () => {
      const config = { recipients: ['test@example.com'] };
      const upPayload = { ...mockPayload, status: 'UP' };

      await strategy.send(config, upPayload);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: expect.stringContaining('🟢'),
          subject: expect.stringContaining('UP'),
        }),
      );
    });

    it('should generate correct subject for DOWN status', async () => {
      const config = { recipients: ['test@example.com'] };

      await strategy.send(config, mockPayload);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: expect.stringContaining('🔴'),
          subject: expect.stringContaining('DOWN'),
        }),
      );
    });

    it('should include endpoint details in email content', async () => {
      const config = { recipients: ['test@example.com'] };

      await strategy.send(config, mockPayload);

      const callArgs = (mockTransporter.sendMail as jest.Mock).mock.calls[0][0];
      expect(callArgs.html).toContain('Test API');
      expect(callArgs.html).toContain('https://api.example.com');
      expect(callArgs.html).toContain('Connection timeout');
    });
  });
});
