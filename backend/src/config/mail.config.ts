import nodemailer from 'nodemailer';

export interface MailConfig {
  transporter: nodemailer.Transporter;
  from: string;
}

export function getMailerConfig(): MailConfig {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  return {
    transporter,
    from: `"${process.env.MAIL_FROM_NAME || 'Vigil'}" <${process.env.SMTP_USER || 'alerts@vigil.com'}>`,
  };
}
