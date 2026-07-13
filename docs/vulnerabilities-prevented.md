# OWASP Top 10 — Vulnerabilities Prevented

## A01: Broken Access Control
- **RBAC middleware** (`requireRole`) gates all admin endpoints.
- **Account ownership verification** prevents users from accessing another user's accounts.
- **Route-level protection** via `authenticate` middleware on all private routes.

## A02: Cryptographic Failures
- Passwords hashed with **bcrypt (cost 12)** — resistant to brute-force and rainbow table attacks.
- JWT signed with **HMAC-SHA256** using a strong secret.
- HTTPS enforced in production via reverse proxy configuration.

## A03: Injection
- **Prisma ORM** parameterizes all queries — no raw SQL concatenation.
- **Zod validation** rejects malformed input before it reaches the database.
- User-supplied data never interpolated into SQL strings.

## A04: Insecure Design
- **Threat model** conducted before implementation (see `docs/threat-model.md`).
- **Security controls mapped to threats** (see `docs/security-controls.md`).
- **Rate limiting** built in by default, not bolted on after the fact.
- **Atomic transfers** designed at the architecture level to prevent race conditions.

## A05: Security Misconfiguration
- **Helmet.js** sets secure HTTP headers (CSP, X-Content-Type-Options, X-Frame-Options).
- **CORS** restricted to a single origin, not wildcard.
- **Error handler** suppresses stack traces in production.
- **Docker** runs as non-root user.
- **Environment validation** via Zod ensures all required config is present at startup.

## A06: Vulnerable and Outdated Components
- Dependencies declared in `package.json` with `^` ranges.
- Alpine-based Docker images minimize attack surface.
- Regular `npm audit` recommended in CI pipeline.

## A07: Identification and Authentication Failures
- **bcrypt** with cost factor 12 for password storage.
- **JWT** with 15-minute access tokens and 7-day refresh tokens.
- **Rate limiting** on auth endpoints to prevent brute force.
- **User deactivation check** (`isActive`) on every authenticated request.

## A08: Software and Data Integrity Failures
- **`$transaction`** ensures debit and credit happen atomically — no partial transfers.
- **Audit log** written in same scope as the action, preventing action-without-log scenarios.

## A09: Security Logging and Monitoring Failures
- **AuditLog table** records every state-changing action with userId, IP, user agent, and timestamp.
- **Structured error logging** via Fastify's built-in logger (pino).
- Admin dashboard exposes audit log querying for monitoring.

## A10: Server-Side Request Forgery (SSRF)
- Not applicable — the API does not fetch external URLs based on user input.
