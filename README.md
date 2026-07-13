# SecBank - Secure Banking API

[![CI](https://github.com/yourusername/secbank/actions/workflows/ci.yml/badge.svg)](https://github.com/yourusername/secbank/actions/workflows/ci.yml)

A production-grade secure banking backend built with **Fastify + TypeScript + PostgreSQL**.

## Security Scorecard

| Control | Status | Detail |
|---|---|---|
| Password hashing | ✅ bcrypt (cost 12) | `src/lib/password.ts` |
| JWT expiry | ✅ 15min access / 7d refresh | `src/lib/jwt.ts` |
| Rate limiting | ✅ 100 req/15min, stricter on /login | `src/index.ts` |
| SQL injection prevention | ✅ Parameterized queries via Prisma ORM | No raw SQL |
| Atomic transactions | ✅ DB-level row locking (`$transaction`) | `src/services/transaction.ts` |
| Audit coverage | ✅ 100% of state-changing endpoints | `src/middleware/audit.ts` |
| RBAC | ✅ Role-based access control | `src/middleware/rbac.ts` |
| Input validation | ✅ Zod schemas on all routes | `src/schemas/index.ts` |
| HTTP security headers | ✅ Helmet.js | `src/index.ts` |
| CORS | ✅ Restricted to origin | `src/index.ts` |
| Failed login tracking | ✅ Per IP and per email | `src/services/auth.ts` |
| Session management | ✅ Token hashing + revocation | `src/services/auth.ts` |
| Suspicious activity detection | ✅ Brute force + rapid transfer alerts | `src/services/auth.ts` |
| Container security | ✅ Non-root user, Alpine base | `Dockerfile` |
| Error sanitization | ✅ No stack traces in production | `src/index.ts` error handler |

## Quick Start

```bash
# Start Postgres
docker compose up -d postgres

# Install deps + migrate + seed
npm install
npx prisma generate
npx prisma migrate dev --name init
npx tsx prisma/seed.ts

# Start dev server
npm run dev
```

Open **http://localhost:3000** for the web UI, or **http://localhost:3000/docs** for Swagger API docs.

## Seed Credentials

| Role | Email | Password |
|---|---|---|
| Admin | admin@secbank.com | admin123 |
| User | user@secbank.com | user1234 |

## API Endpoints

### Auth
- `POST /register` - Register new user
- `POST /login` - Login, returns JWT pair
- `POST /refresh` - Refresh access token
- `GET /me` - Current user info

### Accounts
- `POST /accounts` - Create account
- `GET /accounts` - List your accounts
- `GET /accounts/:id` - Account details

### Transactions
- `POST /transactions/transfer` - Send money (atomic)
- `GET /transactions` - Your transaction history

### Admin
- `GET /admin/dashboard` - System stats
- `GET /admin/accounts` - All accounts
- `GET /admin/transactions` - All transactions
- `GET /admin/audit-logs` - All audit logs
- `GET /admin/security/failed-logins` - Failed login stats (hourly breakdown)
- `GET /admin/security/suspicious` - Suspicious activity flags
- `GET /admin/security/audit-log` - Recent audit entries
- `GET /admin/security/sessions` - Active sessions

## Architecture

See [docs/architecture.md](docs/architecture.md) for request flow diagrams and database schema.

## Threat Model

See [docs/threat-model.md](docs/threat-model.md) for STRIDE analysis, attack trees, and data flow diagrams with trust boundaries.

## Vulnerability Analysis

See [docs/vulnerability-race-condition.md](docs/vulnerability-race-condition.md) for a detailed writeup on a race condition in the transfer logic — from vulnerable code to exploit to fix with regression test.

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 20 + TypeScript (strict mode) |
| Framework | Fastify 5 |
| Database | PostgreSQL 16 |
| ORM | Prisma 5 |
| Validation | Zod |
| Auth | JWT (jsonwebtoken) + bcrypt |
| Container | Docker (multi-stage, non-root) |
| Test | Vitest |
| Docs | Swagger UI |
