import dotenv from 'dotenv';

// Load .env before any other module reads process.env.
dotenv.config({ quiet: true });

const toPort = (value, fallback) => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

export const env = Object.freeze({
  nodeEnv: process.env.NODE_ENV?.trim() || 'development',
  port: toPort(process.env.PORT, 5000),
  mongoUri: (process.env.MONGO_URI ?? '').trim(),
  clientUrl: (process.env.CLIENT_URL ?? 'http://localhost:5173').trim(),
  jwtSecret: process.env.JWT_SECRET || 'samadhan_dev_jwt_secret_9847239847',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  adminEmail: (process.env.ADMIN_EMAIL ?? 'admin@samadhan.local').trim(),
  adminPassword: process.env.ADMIN_PASSWORD || 'Admin@12345',
  cloudinaryCloudName: (process.env.CLOUDINARY_CLOUD_NAME ?? '').trim(),
  cloudinaryApiKey: (process.env.CLOUDINARY_API_KEY ?? '').trim(),
  cloudinaryApiSecret: (process.env.CLOUDINARY_API_SECRET ?? '').trim(),
  smtpHost: (process.env.SMTP_HOST ?? '').trim(),
  smtpPort: toPort(process.env.SMTP_PORT, 587),
  smtpSecure: (process.env.SMTP_SECURE ?? '').trim() === 'true',
  smtpUser: (process.env.SMTP_USER ?? '').trim(),
  smtpPass: process.env.SMTP_PASS ?? '',
  smtpFrom: (process.env.SMTP_FROM ?? 'Samadhan <no-reply@samadhan.local>').trim(),
  dispatchOverrideTo: (process.env.DISPATCH_OVERRIDE_TO ?? '').trim(),
  n8nWebhookUrl: (process.env.N8N_WEBHOOK_URL ?? '').trim(),
  n8nWebhookSecret: process.env.N8N_WEBHOOK_SECRET ?? '',
  enableCron: (process.env.ENABLE_CRON ?? 'true').trim() !== 'false',
});

export const isProduction = env.nodeEnv === 'production';
