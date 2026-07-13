# SecBank - Secure Banking API

[![CI](https://github.com/sudo-robi/SecBank/actions/workflows/ci.yml/badge.svg)](https://github.com/sudo-robi/SecBank/actions/workflows/ci.yml)

A backend system that simulates how a real bank's core services work, built specifically to showcase security engineering practices (which fits an auditing background well). It is built with **Fastify + TypeScript + PostgreSQL**.

## What the system does, end to end

1. **User registration** — A new user submits name/email/password. The API creates an account with a hashed password and an initial balance (e.g. $0 or a demo amount). The user can now log in.
2. **Login** — The user submits email/password. The server verifies the password matches the stored hash. If valid, it issues a JWT token. That token proves "this request came from this authenticated user" on every future request, without needing to re-send a password each time.
3. **Transfers** — An authenticated user sends money from their account to another account. The system checks they have sufficient balance, then deducts from the sender and adds to the receiver. Both changes happen **atomically** (either both succeed or neither does — money should never vanish or duplicate).
4. **Transaction history** — A user can view a list of their past transfers (sent and received) — like the "Activity" tab in a real banking app.
5. **Admin dashboard** — A special "admin" role can log in and see system-wide data ordinary users cannot: all users, all transactions, flagged suspicious activity, audit logs. This is where **RBAC (role-based access control)** actually matters — regular users must be blocked from reaching these endpoints even if they try.
6. **Audit trails** — Every meaningful action (register, login, transfer, admin action) is written to a permanent log: who did it, when, from where. This exists so that if something goes wrong later (fraud, dispute, bug), there is a record to investigate — which is what real banks are legally required to have.

## What the security add-ons are for, specifically

- **JWT authentication** — proves who is making each request without the server needing to store session state.
- **RBAC** — enforces that only admins can access admin-only actions, even if a regular user tries to guess/access those URLs directly.
- **Transaction logging** — the technical mechanism (structured logs written to DB or file) that captures each transfer's details.
- **Audit trails** — closely related but broader: a tamper-evident record of actions (not just transactions) across the whole system, used for accountability.

## Why the documentation matters

- **Threat model** — you sit down and ask "what could go wrong, and who would try to break this?" before/while building — e.g. "what if someone tries to transfer negative money?" or "what if two transfer requests hit at the same time?"
- **Security controls** — for every threat you identified, what specific thing in your code actually prevents it.
- **Vulnerabilities prevented** — mapping your controls to known real-world vulnerability categories (OWASP Top 10) so someone reviewing your project can see you are not just guessing, you are working from an established framework.

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
