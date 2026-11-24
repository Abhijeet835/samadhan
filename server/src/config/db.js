import mongoose from 'mongoose';

import { env } from './env.js';

const READY_STATES = Object.freeze({
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
});

let listenersAttached = false;

const attachConnectionListeners = () => {
  if (listenersAttached) return;
  listenersAttached = true;

  mongoose.connection.on('connected', () => {
    console.log('[db] MongoDB connection established.');
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('[db] MongoDB connection lost. Health check will report "disconnected".');
  });

  mongoose.connection.on('error', (error) => {
    console.error(`[db] MongoDB connection error: ${error.message}`);
  });
};

export const getDbState = () => READY_STATES[mongoose.connection.readyState] ?? 'disconnected';

/**
 * Connect to MongoDB Atlas. A missing or unreachable URI must never prevent the
 * API from booting — /api/health stays available for frontend health testing.
 */
export async function connectDB() {
  attachConnectionListeners();

  if (!env.mongoUri) {
    console.warn('[db] MONGO_URI is not set. Starting without a database connection.');
    console.warn('[db] Add MONGO_URI to server/.env and restart to enable persistence. Health will report db: "disconnected".');
    return null;
  }

  try {
    const connection = await mongoose.connect(env.mongoUri, {
      serverSelectionTimeoutMS: 8000,
      maxPoolSize: 10,
    });

    const { host, name } = connection.connection;
    console.log(`[db] MongoDB connected → ${host}/${name}`);
    return connection;
  } catch (error) {
    console.error(`[db] MongoDB connection failed: ${error.message}`);
    console.error('[db] API will keep running. Fix MONGO_URI and restart. Health will report db: "disconnected".');
    return null;
  }
}

export async function disconnectDB() {
  if (mongoose.connection.readyState === 0) return;

  try {
    await mongoose.disconnect();
    console.log('[db] MongoDB connection closed.');
  } catch (error) {
    console.error(`[db] Error while closing MongoDB connection: ${error.message}`);
  }
}
