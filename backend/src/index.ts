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

app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    syncEnabled: config.sync.enabled,
  });
});

// ─── Routes ─────────────────────────────────────────────────────────

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/orgs', orgRoutes);
app.use('/api/storage', fileRoutes);
app.use('/api/data', recordRoutes);

// ─── Serve frontend in production ───────────────────────────────────

const publicDir = path.resolve(__dirname, '../../frontend/dist');
if (fs.existsSync(publicDir)) {
  console.log(`[Static] Serving frontend from ${publicDir}`);
  app.use(express.static(publicDir));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'));
  });
} else {
  // API-only mode: 404 for unknown routes
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

// Ensure storage directory exists
const storageDir = path.resolve(config.storage.localPath);
if (!fs.existsSync(storageDir)) {
  fs.mkdirSync(storageDir, { recursive: true });
}

app.listen(config.port, () => {
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

  // Start sync service
  startSyncService();
});

export default app;
