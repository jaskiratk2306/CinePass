import dotenv from 'dotenv';

dotenv.config();

export const ENV = {
  PORT: parseInt(process.env.PORT || '4000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL || '',
  JWT_SECRET: process.env.JWT_SECRET || 'dev-jwt-super-secret-key-cinema-hall-system-2025',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  HOLD_TTL_MINUTES: parseInt(process.env.HOLD_TTL_MINUTES || '5', 10),
  CANCEL_CUTOFF_HOURS: parseInt(process.env.CANCEL_CUTOFF_HOURS || '2', 10),
  MAX_SEATS_PER_HOLD: parseInt(process.env.MAX_SEATS_PER_HOLD || '8', 10),
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
};
