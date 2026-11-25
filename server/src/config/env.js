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
  publicShareBaseUrl: (process.env.PUBLIC_SHARE_BASE_URL ?? 'http://localhost:5000').trim().replace(/\/+$/, ''),
  defaultSocialImageUrl: (process.env.DEFAULT_SOCIAL_IMAGE_URL ?? '').trim(),
  geminiApiKey: process.env.GEMINI_API_KEY ?? '',
  geminiModel: (process.env.GEMINI_MODEL ?? 'gemini-3.5-flash-lite').trim(),
  bufferApiKey: process.env.BUFFER_API_KEY ?? '',
  bufferChannelX: (process.env.BUFFER_CHANNEL_X ?? '').trim(),
  bufferChannelFb: (process.env.BUFFER_CHANNEL_FB ?? '').trim(),
  bufferChannelIg: (process.env.BUFFER_CHANNEL_IG ?? '').trim(),
  bufferPostMode: (process.env.BUFFER_POST_MODE ?? 'shareNow').trim() === 'addToQueue' ? 'addToQueue' : 'shareNow',
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN ?? '',
  telegramChatId: (process.env.TELEGRAM_CHAT_ID ?? '').trim(),
  redditSubreddit: (process.env.REDDIT_SUBREDDIT ?? '').trim(),
  uploadPostApiKey: process.env.UPLOAD_POST_API_KEY ?? '',
  uploadPostUser: (process.env.UPLOAD_POST_USER ?? '').trim(),
  redditClientId: process.env.REDDIT_CLIENT_ID ?? '',
  redditClientSecret: process.env.REDDIT_CLIENT_SECRET ?? '',
  redditRefreshToken: process.env.REDDIT_REFRESH_TOKEN ?? '',
  redditUserAgent: (process.env.REDDIT_USER_AGENT ?? 'samadhan-prototype/1.0').trim(),
  cronSecret: process.env.CRON_SECRET ?? '',
  allowDemoSeed: (process.env.ALLOW_DEMO_SEED ?? '').trim() === 'true',
  renderGitCommit: process.env.RENDER_GIT_COMMIT ?? null,
});

export const isProduction = env.nodeEnv === 'production';

// Boot-time validation in production: fail fast listing ALL problems, never
// printing secret values. Development keeps current leniency.
export function validateProductionEnv() {
  if (!isProduction) return [];
  const problems = [];
  if (!env.mongoUri) problems.push('MONGO_URI is required');
  if (!env.jwtSecret || env.jwtSecret.length < 32 || /example|dev_jwt|samadhan_dev/i.test(env.jwtSecret)) {
    problems.push('JWT_SECRET must be ≥32 chars and not an example/default value');
  }
  for (const url of env.clientUrl.split(',').map((s) => s.trim()).filter(Boolean)) {
    try { new URL(url); } catch { problems.push(`CLIENT_URL contains an invalid URL: ${url}`); }
  }
  if (!env.clientUrl) problems.push('CLIENT_URL is required');
  if (!env.publicShareBaseUrl) problems.push('PUBLIC_SHARE_BASE_URL is required');
  return problems;
}
