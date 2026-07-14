# SecBank - Secure Banking API

[![CI](https://github.com/sudo-robi/SecBank/workflows/CI/badge.svg)](https://github.com/sudo-robi/SecBank/actions/workflows/ci.yml)
[![License](https://img.shields.io/github/license/sudo-robi/SecBank.svg)](https://github.com/sudo-robi/SecBank/blob/main/LICENSE)
[![Live Demo](https://img.shields.io/badge/Live%20Demo-SecBank-38bdf8)](https://sec-bank-btok.vercel.app)

A backend system that simulates how a real bank's core services work, built specifically to showcase security engineering practices. It is built with **Fastify + TypeScript + PostgreSQL**.

> **Live demo:** https://sec-bank-btok.vercel.app

## Project Overview

This project is designed to demonstrate secure banking system architecture with:
- JWT authentication and role-based access control (RBAC)
- Atomic financial transactions with proper error handling
- Comprehensive audit trails for all security-relevant operations
- Robust input validation and security headers
- Containerized deployment with Docker

## Architecture

**Project Structure:**
```
/src
  ├── config/        # Environment and configuration
  ├── controllers/  # HTTP request handlers
  ├── lib/          # Services and utilities
  ├── middleware/   # Auth, validation, RBAC
  ├── routes/       # API route definitions
  ├── schemas/      # Zod validation schemas
  ├── services/     # Business logic
  └── types/        # TypeScript type definitions

/api              # Vercel/edge runtime handlers
/prisma           # Database schema
/docs             # Architecture and security documentation
/tests            # Test suite (Vitest)
```

## Key Features

### Security Scorecard

| Control | Status | Detail |
|---------|--------|--------|
| Password hashing | ✅ bcrypt (cost 12) | Secure password storage |
| JWT authentication | ✅ 15min access / 7d refresh | Stateless auth |
| Rate limiting | ✅ 100 req/15min, stricter on /login | Prevents brute force |
| Input validation | ✅ Zod schemas on all routes | Ensures type safety |
| Atomic transactions | ✅ DB-level row locking | Consistent transfers |
| RBAC | ✅ Role-based access control | Admin vs user separation |
| Audit trails | ✅ 100% of state-changing endpoints | Complete logging |
| Security headers | ✅ Helmet.js | Protection headers |

## Installation & Setup

### Prerequisites

- Node.js 20+ (with TypeScript support)
- PostgreSQL 16+
- Docker (for local development)

### Quick Start with Docker

```bash
# Start PostgreSQL in Docker
docker compose up -d

# Install dependencies and setup database
npm install
npx prisma generate
npx prisma migrate dev --name init
npx tsx prisma/seed.ts

# Start development server
npm run dev
```

### Quick Start without Docker

```bash
# Install dependencies and setup database
npm install
npx prisma generate
npx prisma migrate dev --name init
npx tsx prisma/seed.ts

# Start development server
npm run dev
```

## API Access

Once running:
- **Web Interface**: http://localhost:3000
- **API Documentation**: http://localhost:3000/docs

## Seed Credentials

| Role | Email | Password |
|------|-------|----------|
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
- `GET /admin/security/failed-logins` - Failed login stats
- `GET /admin/security/suspicious` - Suspicious activity flags

## Development

### Commands

```bash
# Run tests
npm test

# Run type check (recommended before changes)
npm run typecheck

# Run linting
npm run lint

# Watch mode for tests
npm run test:watch
```

### Testing

This project uses **Vitest** for testing. Tests cover:
- Authentication flows and security
- Transaction processing and atomicity
- RBAC enforcement
- Error handling scenarios

### Code Quality

- TypeScript (strict mode) for type safety
- ESLint for code linting
- Zod for runtime validation
- Prettier for code formatting

## Security & Deployment

### Threat Model
The system addresses common banking threats:

| Threat | Mitigation |
|--------|------------|
| SQL Injection | Parameterized queries via Prisma |
| Brute Force | Rate limiting per IP/email |
| Token Theft | JWT with short expiry, refresh tokens |
| Account Enumeration | Generic error messages |
| Race Conditions | Database row locking |
| Privilege Escalation | RBAC middleware enforcement |

### Deployment

#### Docker Production
```bash
# Build the application
docker compose build

# Run in production
 docker compose up -d --force-recreate
```

#### Vercel Deployment
```bash
git push to main branch
```
[Vercel Configuration](.vercel.yaml)

## API Documentation

Full API documentation is available at `/docs` (Swagger UI) when the server is running.

## Troubleshooting

### "Port already in use"
```bash
# Stop any running instances
pkill -f "node.*3000"
# or
lsof -ti:3000 | xargs kill -9
```

### Database Connection Issues
```bash
# Recreate migrations
docker compose down --rmi all
docker compose up -d
npx prisma migrate reset --force
npx tsx prisma/seed.ts
```

## Contributing

### Adding New Features
1. Add routes under `src/routes/
2. Implement controllers in `src/controllers/`
3. Write Zod schemas in `src/schemas/`
4. Add business logic services in `src/services/`
5. Create comprehensive tests in `tests/`
6. Update documentation as needed

### Adding Security Controls
1. Identify the new threat
2. Research OWASP Top 10 category
3. Implement security control
4. Add test coverage
5. Update threat model documentation

## Architecture Details

See [`docs/architecture.md`](docs/architecture.md) for:
- Component interaction diagrams
- Database schema
- Request flow
- Security layers

See [`docs/threat-model.md`](docs/threat-model.md) for:
- STRIDE threat analysis
- Attack trees
- Trust boundaries

See [`docs/vulnerability-race-condition.md`](docs/vulnerability-race-condition.md) for:
- Detailed vulnerability writeup
- Ex exploitation
- Fix analysis with regression tests

## Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Node.js 20 + TypeScript (strict mode) |
| Framework | Fastify 5 |
| Database | PostgreSQL 16 |
| ORM | Prisma 5 |
| Validation | Zod |
| Auth | JWT (jsonwebtoken) + bcrypt |
| Container | Docker (multi-stage, non-root) |
| Test | Vitest |
| Docs | Swagger UI |

## License

MIT

## Support

For questions or issues, please check:
- [Documentation](docs/) for implementation details
- [GitHub Issues](https://github.com/sudo-robi/SecBank/issues) for bug reports
- The code for debugging
