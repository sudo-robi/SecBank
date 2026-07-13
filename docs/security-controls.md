# Security Controls — SecBank API

| # | Threat | Control | Implementation |
|---|---|---|---|
| 1 | Spoofing | Password hashing | bcrypt with cost factor 12 (`src/lib/password.ts`) |
| 2 | Spoofing | JWT with short expiry | Access token: 15 min, refresh token: 7 days (`src/lib/jwt.ts`) |
| 3 | Spoofing | Brute-force prevention | `@fastify/rate-limit` on all routes (`src/index.ts`) |
| 4 | Tampering | Atomic transactions | Prisma `$transaction` wraps debit + credit (`src/services/transaction.ts`) |
| 5 | Tampering | Input validation | Zod schemas for all request bodies (`src/schemas/index.ts`) |
| 6 | Tampering | Balance guard | `source.balance.lessThan(amount)` check inside transaction (`src/services/transaction.ts:23`) |
| 7 | Repudiation | Audit logging | Every state change writes to `AuditLog` (`src/middleware/audit.ts`) |
| 8 | Repudiation | Timestamped logs | `createdAt` with `@default(now())` on all entities |
| 9 | Info disclosure | Secure headers | `@fastify/helmet` with CSP, X-Frame-Options, etc. (`src/index.ts`) |
| 10 | Info disclosure | CORS restriction | `@fastify/cors` with explicit origin, not `*` (`src/index.ts`) |
| 11 | Info disclosure | Error sanitization | Stack traces hidden in production (`src/index.ts` error handler) |
| 12 | DoS | Rate limiting | 100 req / 15 min window on all routes (`src/index.ts`) |
| 13 | Elevation of privilege | RBAC middleware | `requireRole('ADMIN')` on admin routes (`src/middleware/rbac.ts`) |
| 14 | Elevation of privilege | DB-backed user fetch | User role fetched from DB on every request, not just from JWT (`src/middleware/auth.ts`) |
| 15 | Elevation of privilege | Account ownership check | `getAccountById` filters by both `id` and `userId` (`src/services/account.ts:14`) |
| 16 | All | Parameterized queries | Prisma ORM prevents SQL injection by default |

## Environment & Deployment Controls

| Control | Detail |
|---|---|
| Secrets management | All secrets via environment variables (`.env`), never hardcoded. `.env` in `.gitignore`. |
| Docker hardening | Non-root `appuser` in Dockerfile; Alpine base images. |
| DB isolation | PostgreSQL runs in separate container; health checks on startup. |
| Dependency scanning | Regular `npm audit` recommended as part of CI. |
