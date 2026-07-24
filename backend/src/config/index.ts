import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: (process.env.CORS_ORIGIN || 'http://localhost:3000').split(',').map(s => s.trim()),

  db: {
    url: process.env.DATABASE_URL || 'postgresql://orgvault:orgvault@localhost:5432/orgvault',
    ssl: process.env.DATABASE_SSL === 'true',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-change-me',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  encryption: {
    key: process.env.ENCRYPTION_KEY || '',
  },

  storage: {
    localPath: process.env.LOCAL_STORAGE_PATH || './storage',
    s3: {
      endpoint: process.env.S3_ENDPOINT || 'https://s3.amazonaws.com',
      region: process.env.S3_REGION || 'us-east-1',
      bucket: process.env.S3_BUCKET || 'orgvault-data',
      accessKey: process.env.S3_ACCESS_KEY || '',
      secretKey: process.env.S3_SECRET_KEY || '',
    },
  },

  sync: {
    enabled: process.env.SYNC_ENABLED === 'true',
    intervalSeconds: parseInt(process.env.SYNC_INTERVAL_SECONDS || '300', 10),
  },

  audit: {
    enabled: process.env.AUDIT_LOG_ENABLED !== 'false',
  },
} as const;

export type Config = typeof config;
