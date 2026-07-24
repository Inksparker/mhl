# 🔐 OrgVault — Hybrid Secure Data Storage for Organizations

A **local-first, hybrid cloud** data storage platform for groups of companies. Stores files and structured data with AES-256-GCM encryption, multi-tenant isolation, and full audit logging.

## Architecture

```
┌─────────────────────────────────────────────┐
│                  Frontend                    │
│            (React + TypeScript)             │
└──────────────────┬──────────────────────────┘
                   │ REST API (JWT Auth)
┌──────────────────▼──────────────────────────┐
│               Backend API                    │
│        (Node.js + Express + TypeScript)      │
│                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │   Auth   │  │  Files   │  │  Records │   │
│  │  (JWT)   │  │  (REST)  │  │  (REST)  │   │
│  └──────────┘  └────┬─────┘  └────┬─────┘   │
│                     │              │         │
│  ┌──────────────────▼──────────────▼──────┐  │
│  │        Storage Layer (Hybrid)          │  │
│  │  ┌─────────────┐  ┌────────────────┐  │  │
│  │  │ Local Disk   │  │  S3 / MinIO    │  │  │
│  │  │ (encrypted)  │  │  (encrypted)   │  │  │
│  │  └─────────────┘  └────────────────┘  │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │PostgreSQL│  │  Audit   │  │   Sync   │   │
│  │(metadata)│  │   Log    │  │  Service │   │
│  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────┘
```

## Features

| Feature | Details |
|---------|---------|
| **Hybrid Storage** | Local-first, auto-sync to S3-compatible cloud |
| **Encryption** | AES-256-GCM at rest with per-file derived keys |
| **Multi-Tenancy** | Organization → Company hierarchy with isolation |
| **Files** | Upload, download, tag, folder, search, 500MB limit |
| **Structured Data** | Dynamic tables with JSONB records, optional field-level encryption |
| **Auth** | JWT with refresh token rotation, Argon2 password hashing |
| **RBAC** | 5 roles: superadmin, org_admin, company_admin, member, viewer |
| **Audit Log** | Full trail of all mutating operations |
| **API Keys** | Programmatic access with scoped permissions |
| **Rate Limiting** | Per-endpoint limits with stricter auth throttling |
| **Security** | Helmet, CORS, input validation ready |

## Quick Start

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Start Infrastructure (Docker)

```bash
docker compose up -d
# Starts PostgreSQL 16 + MinIO (S3-compatible)
```

### 3. Configure Environment

```bash
cp .env.example .env
# Edit .env — set JWT_SECRET and ENCRYPTION_KEY
```

Generate a secure encryption key:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. Run Migrations

```bash
npm run migrate
```

### 5. Start Server

```bash
npm run dev
# → http://localhost:4000
```

## API Overview

### Auth
```
POST /api/auth/register     — Create account + organization
POST /api/auth/login        — Login, get access + refresh tokens
POST /api/auth/refresh      — Rotate refresh token
POST /api/auth/logout       — Invalidate refresh token
```

### Organizations & Companies
```
GET    /api/orgs/current                — Get current org
PUT    /api/orgs/current                — Update org settings
GET    /api/orgs/:orgId/companies       — List companies
POST   /api/orgs/:orgId/companies       — Create company
GET    /api/orgs/:orgId/users           — List users
POST   /api/orgs/:orgId/encryption-key  — Generate org encryption key
```

### Files (Hybrid Storage)
```
POST   /api/storage/:orgId/files           — Upload file
GET    /api/storage/:orgId/files           — List files
GET    /api/storage/:orgId/files/:fileId   — Download file
GET    /api/storage/:orgId/files/:fileId/info — File metadata
DELETE /api/storage/:orgId/files/:fileId   — Soft delete
GET    /api/storage/:orgId/folders         — List folders
GET    /api/storage/:orgId/tags            — List tags
```

### Structured Data
```
POST   /api/data/:orgId/tables                        — Create table
GET    /api/data/:orgId/tables                        — List tables
POST   /api/data/:orgId/tables/:slug/records          — Create record
GET    /api/data/:orgId/tables/:slug/records          — List records
GET    /api/data/:orgId/tables/:slug/records/:id      — Get record
PUT    /api/data/:orgId/tables/:slug/records/:id      — Update record
DELETE /api/data/:orgId/tables/:slug/records/:id      — Delete record
POST   /api/data/:orgId/query                         — Query records
```

## Security Model

- **Encryption at rest**: Every file and sensitive record is encrypted with AES-256-GCM using a per-item derived key (PBKDF2 from master key + random salt)
- **Encryption in transit**: TLS via Helmet + HTTPS in production
- **Authentication**: Argon2id password hashing, JWT with 24h access / 7d refresh with rotation
- **Authorization**: 5-level RBAC enforced per-request
- **Audit**: Immutable audit log for all mutations with IP, user agent, timestamps
- **Data isolation**: All queries scoped to organization_id, company-level isolation

## Compliance Ready

The architecture supports:
- **SOC 2**: Complete audit trail, access controls, encryption
- **HIPAA**: AES-256 encryption, access logging, PHI isolation via encrypted records
- **GDPR**: Soft deletes, data export ready, organization-scoped data

## Sync Modes

1. **Local Only** (`SYNC_ENABLED=false`) — All data stays on local disk
2. **Hybrid with background sync** (`SYNC_ENABLED=true`) — Local writes immediately, uploads queued
3. **Full bidirectional** — `fullSync(orgId)` syncs all local↔cloud

## Tech Stack

- **Backend**: Node.js, TypeScript, Express, PostgreSQL, MinIO/S3
- **Auth**: JWT, Argon2, refresh token rotation
- **Encryption**: Node.js crypto (AES-256-GCM, PBKDF2)
- **Infrastructure**: Docker Compose (PostgreSQL 16, MinIO)
