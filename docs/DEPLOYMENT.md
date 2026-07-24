# 🚀 Deployment Guide — OrgVault Anywhere

OrgVault is designed to be deployed to any cloud provider. Here are the quickest paths.

---

## Option 1: Railway (Easiest — 5 minutes)

Railway gives you both Postgres + hosting in one click.

1. **Fork/clone this repo to GitHub**

2. **Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub**

3. **Add PostgreSQL**: Dashboard → New → Database → PostgreSQL
   - Railway auto-sets `DATABASE_URL`

4. **Set environment variables** in the Railway dashboard:
   ```
   DATABASE_SSL=true
   JWT_SECRET=<generate>
   ENCRYPTION_KEY=<generate>
   NODE_ENV=production
   CORS_ORIGIN=https://your-frontend-url.vercel.app
   ```

5. **Deploy** — Railway runs `npm start` from `backend/`. Set the root directory to `backend/` in Railway settings, or add a `railway.json`:

```json
{
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "cd backend && npm install && npm run build"
  },
  "deploy": {
    "startCommand": "cd backend && npm run migrate && npm start"
  }
}
```

6. **Frontend**: Deploy to Vercel (free) — connect the `frontend/` folder as a Vite project. Set `VITE_API_URL` to your Railway URL.

---

## Option 2: Render

1. **Backend Web Service** on [render.com](https://render.com):
   - Build Command: `cd backend && npm install && npm run build`
   - Start Command: `cd backend && node dist/migrate.js && node dist/index.js`
   - Add env vars (same as Railway)

2. **PostgreSQL**: Render → New → PostgreSQL. Copy the Internal Database URL.

3. **Frontend**: Render Static Site from `frontend/`:
   - Build: `npm install && npm run build`
   - Output: `dist`
   - Env: `VITE_API_URL=https://your-backend.onrender.com`

---

## Option 3: Fly.io

```bash
fly launch --path backend/
fly secrets set DATABASE_URL=... JWT_SECRET=... ENCRYPTION_KEY=...
fly deploy
```

---

## Option 4: VPS / Any Docker Host

```bash
# Build
docker build -t orgvault .

# Run (with env vars)
docker run -d -p 4000:4000 \
  -e DATABASE_URL=postgresql://... \
  -e DATABASE_SSL=true \
  -e JWT_SECRET=... \
  -e ENCRYPTION_KEY=... \
  -e NODE_ENV=production \
  -e CORS_ORIGIN=https://your-domain.com \
  orgvault
```

---

## Option 5: Supabase (DB) + Vercel (Frontend + Backend)

1. Create a Supabase project → copy the connection string
2. Deploy backend to Vercel as a Node.js serverless function (or use Railway for the backend)
3. Deploy frontend to Vercel

---

## Cloud Database Providers (just copy the URL)

| Provider | Free Tier | Connection String Format |
|---|---|---|
| **Neon** | 0.5 GB | `postgresql://user:pass@ep-xxxx.us-east-2.aws.neon.tech/db` |
| **Railway** | $5 credit | Auto-provisioned |
| **Render** | 1 GB free (90 days) | `postgresql://user:pass@dpg-xxxx.render.com/db` |
| **Supabase** | 500 MB | `postgresql://postgres.xxxx:pass@aws-0.pooler.supabase.com:6543/postgres` |
| **AWS RDS** | Free tier 20 GB | Standard PG URL |

**Important**: For all cloud databases, set `DATABASE_SSL=true`.

---

## 🔑 Generate Required Secrets

```bash
# JWT Secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Encryption Key (must be exactly 32 bytes / 64 hex chars)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 🏗️ Architecture When Deployed

```
Users (anywhere) ───→ Frontend (Vercel/Netlify)
                          │
                          │ HTTPS
                          ▼
                    Backend (Railway/Render/Fly)
                          │
                    ┌─────┴─────┐
                    ▼           ▼
              PostgreSQL      S3/MinIO
              (Cloud DB)    (Cloud Storage)
```

- **Frontend**: Static files served from CDN, loads instantly worldwide
- **Backend**: API server with JWT auth, any user with credentials can log in
- **Database**: Hosted PostgreSQL (Neon, Railway, etc.) — no local dependency
- **Files**: Local ephemeral storage backed by S3 for persistence across deployments
