import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import { config } from './config';
import { startSyncService } from './services/sync';

// Routes
import authRoutes from './routes/auth';
import orgRoutes from './routes/orgs';
import fileRoutes from './routes/files';
import recordRoutes from './routes/records';

const app = express();

// Trust proxy for rate limiting behind Railway/Vercel
app.set('trust proxy', 1);

// ─── Security Middleware ────────────────────────────────────────────

app.use(helmet());
app.use(cors({
  origin: config.nodeEnv === 'production'
    ? config.corsOrigin
    : true, // Allow all origins in dev for convenience
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
});
app.use(limiter);

// Stricter rate limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many authentication attempts, please try again later' },
});

// ─── Body Parsing ───────────────────────────────────────────────────

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Health Check ───────────────────────────────────────────────────

app.get('/health', async (_req, res) => {
  const health: Record<string, any> = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    uptime: process.uptime(),
    mode: config.nodeEnv,
    syncEnabled: config.sync.enabled,
    s3Configured: !!(config.storage.s3.accessKey && config.storage.s3.accessKey !== 'your-access-key'),
    storagePath: config.storage.localPath,
  };

  // Quick DB check
  try {
    const { pool } = require('./services/db');
    await pool.query('SELECT 1');
    health.database = 'connected';
  } catch {
    health.database = 'disconnected';
    health.status = 'degraded';
  }

  res.json(health);
});

// ─── Routes ─────────────────────────────────────────────────────────

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/orgs', orgRoutes);
app.use('/api/storage', fileRoutes);
app.use('/api/data', recordRoutes);

// ─── Serve frontend in production ───────────────────────────────────

// Resolve static directory: env var > Docker default > local dev path
const staticDir = process.env.STATIC_DIR
  || path.resolve('/app/public')  // Docker container
  || path.resolve(__dirname, '../../frontend/dist'); // local dev

if (fs.existsSync(staticDir)) {
  console.log(`[Static] Serving frontend from ${staticDir}`);
  app.use(express.static(staticDir));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(staticDir, 'index.html'));
  });
} else {
  console.log(`[Static] No frontend found at ${staticDir}, running API-only mode`);
  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });
}

// ─── Global Error Handler ───────────────────────────────────────────

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: config.nodeEnv === 'production' ? 'Internal server error' : err.message,
  });
});

// ─── Start Server ───────────────────────────────────────────────────

// ─── Startup validation ────────────────────────────────────────────

function validateConfig(): string[] {
  const warnings: string[] = [];

  if (config.nodeEnv === 'production') {
    // Check JWT secret isn't the default
    if (!config.jwt.secret || config.jwt.secret === 'dev-secret-change-me') {
      warnings.push('JWT_SECRET is using the default value — generate a secure key!');
    }

    // Check encryption key
    if (!config.encryption.key || config.encryption.key.length < 64) {
      warnings.push('ENCRYPTION_KEY is missing or too short — must be 64 hex characters (32 bytes)');
    }

    // Check CORS origin is set
    if (!config.corsOrigin || config.corsOrigin[0]?.includes('your-frontend')) {
      warnings.push('CORS_ORIGIN is using a placeholder — set it to your actual frontend URL');
    }

    // Check S3 config if sync is enabled
    if (config.sync.enabled) {
      if (!config.storage.s3.accessKey || config.storage.s3.accessKey === 'your-access-key') {
        warnings.push('SYNC_ENABLED=true but S3_ACCESS_KEY is not configured — cloud sync will fail');
      }
      if (!config.storage.s3.secretKey || config.storage.s3.secretKey === 'your-secret-key') {
        warnings.push('SYNC_ENABLED=true but S3_SECRET_KEY is not configured — cloud sync will fail');
      }
      if (!config.storage.s3.bucket || config.storage.s3.bucket === 'orgvault-data') {
        warnings.push('S3_BUCKET is using default value — set your bucket name');
      }
    }
  }

  return warnings;
}

// Ensure storage directory exists
const storageDir = path.resolve(config.storage.localPath);
if (!fs.existsSync(storageDir)) {
  fs.mkdirSync(storageDir, { recursive: true });
}

app.listen(config.port, () => {
  const warnings = validateConfig();

  console.log(`
╔══════════════════════════════════════════════════╗
║             🔐 OrgVault API Server               ║
║                                                  ║
║  Status:   Running                               ║
║  Port:     ${String(config.port).padEnd(37)}║
║  Mode:     ${config.nodeEnv.padEnd(37)}║
║  Sync:     ${String(config.sync.enabled).padEnd(37)}║
║  Storage:  ${config.storage.localPath.padEnd(37)}║
╚══════════════════════════════════════════════════╝
  `);

  // Show config warnings
  if (warnings.length > 0) {
    console.log('⚠️  Configuration warnings:');
    warnings.forEach((w) => console.log(`   - ${w}`));
    console.log('');
  }

  // Start sync service
  startSyncService();
});

export default app;
