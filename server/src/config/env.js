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
});

export const isProduction = env.nodeEnv === 'production';
