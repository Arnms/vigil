import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';
import { NotificationStrategy, NotificationPayload } from './notification.strategy';

@Injectable()
export class EmailStrategy implements NotificationStrategy {
  private readonly logger = new Logger(EmailStrategy.name);
  private transporter: nodemailer.Transporter;
  private from: string;

  constructor(private configService: ConfigService) {
    this.initializeTransporter();
  }

  private initializeTransporter(): void {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST', 'smtp.gmail.com'),
      port: this.configService.get<number>('SMTP_PORT', 587),
      secure: this.configService.get<string>('SMTP_SECURE', 'false') === 'true',
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASS'),
      },
    });

    this.from = `"${this.configService.get<string>('MAIL_FROM_NAME', 'Vigil')}" <${this.configService.get<string>('SMTP_USER', 'alerts@vigil.com')}>`;
  }

  async send(config: Record<string, any>, payload: NotificationPayload): Promise<void> {
    const { recipients } = config;

    if (!recipients || recipients.length === 0) {
      throw new Error('No email recipients configured');
    }

    const subject = this.generateSubject(payload);
    const htmlContent = this.generateHtmlContent(payload);

    try {
      await this.transporter.sendMail({
        from: this.from,
        to: recipients.join(','),
        subject,
        html: htmlContent,
      });

      this.logger.log(`Email sent to ${recipients.join(',')}`);
    } catch (error) {
      this.logger.error(`Email sending failed: ${error.message}`);
      throw error;
    }
  }

  private generateSubject(payload: NotificationPayload): string {
    const statusEmoji = payload.status === 'DOWN' ? '🔴' : '🟢';
    return `${statusEmoji} [Vigil] ${payload.endpointName} - ${payload.status}`;
  }

  private generateHtmlContent(payload: NotificationPayload): string {
    const statusColor = payload.status === 'DOWN' ? '#dc2626' : '#16a34a';
    const statusText = payload.status === 'DOWN' ? '장애 발생' : '복구됨';

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              line-height: 1.6;
              margin: 0;
              padding: 0;
              background-color: #f5f5f5;
            }
            .container {
              max-width: 600px;
              margin: 20px auto;
              background: white;
              border-radius: 8px;
              overflow: hidden;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .header {
              background: ${statusColor};
              color: white;
              padding: 30px 20px;
            }
            .header h2 {
              margin: 0;
              font-size: 20px;
              font-weight: 600;
            }
            .content {
              padding: 30px 20px;
            }
            .info-block {
              margin: 15px 0;
              padding: 12px 15px;
              background: #f9fafb;
              border-left: 4px solid ${statusColor};
              border-radius: 4px;
            }
            .label {
              font-weight: 600;
              color: #666;
              font-size: 12px;
              text-transform: uppercase;
              margin-bottom: 5px;
            }
            .value {
              color: #333;
              font-size: 14px;
              word-break: break-all;
            }
            .timestamp {
              font-size: 12px;
              color: #999;
              margin-top: 30px;
              text-align: right;
              border-top: 1px solid #eee;
              padding-top: 15px;
            }
            .footer {
              background: #f9fafb;
              padding: 15px 20px;
              text-align: center;
              font-size: 12px;
              color: #999;
              border-top: 1px solid #eee;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>${payload.endpointName} - ${statusText}</h2>
            </div>
            <div class="content">
              <div class="info-block">
                <div class="label">상태</div>
                <div class="value">${payload.status}</div>
              </div>

              ${payload.endpointUrl ? `
              <div class="info-block">
                <div class="label">URL</div>
                <div class="value">${this.escapeHtml(payload.endpointUrl)}</div>
              </div>
              ` : ''}

              ${payload.responseTime !== undefined ? `
              <div class="info-block">
                <div class="label">응답 시간</div>
                <div class="value">${payload.responseTime}ms</div>
              </div>
              ` : ''}

              ${payload.statusCode ? `
              <div class="info-block">
                <div class="label">HTTP 상태 코드</div>
                <div class="value">${payload.statusCode}</div>
              </div>
              ` : ''}

              ${payload.errorMessage ? `
              <div class="info-block">
                <div class="label">에러 메시지</div>
                <div class="value">${this.escapeHtml(payload.errorMessage)}</div>
              </div>
              ` : ''}

              ${payload.message ? `
              <div class="info-block">
                <div class="label">메시지</div>
                <div class="value">${this.escapeHtml(payload.message)}</div>
              </div>
              ` : ''}

              <div class="timestamp">
                ${payload.timestamp.toLocaleString('ko-KR')}
              </div>
            </div>
            <div class="footer">
              Vigil - API Monitoring Dashboard
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, (char) => map[char]);
  }
}
