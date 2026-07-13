# Threat Model — SecBank API

## Data Flow Diagram with Trust Boundaries

```mermaid
graph TD
    subgraph "Trust Boundary: Internet"
        C[Client Browser]
        A[Attacker]
    end

    subgraph "Trust Boundary: DMZ / Web Layer"
        RL[Rate Limiter]
        HEL[Helmet - HTTP Headers]
        CORS[CORS Filter]
    end

    subgraph "Trust Boundary: Application"
        AUTH[JWT Auth Middleware]
        RBAC[RBAC Middleware]
        VAL[Zod Validation]
        CTRL[Controllers]
        SVC[Services]
    end

    subgraph "Trust Boundary: Data Layer"
        PR[Prisma ORM - Parameterized Queries]
        PG[(PostgreSQL)]
    end

    subgraph "Trust Boundary: Security Monitoring"
        AUDIT[Audit Logger]
        FAIL[Failed Login Tracker]
        SESS[Session Manager]
        SUSP[Suspicious Activity Detector]
    end

    C -->|HTTPS| RL
    A -->|HTTPS| RL
    
    RL --> HEL
    HEL --> CORS
    CORS --> AUTH
    
    AUTH -->|JWT + Role| RBAC
    RBAC -->|Validated Request| VAL
    VAL -->|Sanitized Input| CTRL
    
    CTRL --> SVC
    
    SVC -->|Atomic Transactions| PR
    SVC <-->|Log Actions| AUDIT
    SVC <-->|Track Attempts| FAIL
    SVC <-->|Manage Tokens| SESS
    SVC <-->|Analyze Patterns| SUSP
    
    PR <-->|Parameterized SQL| PG
    AUDIT -->|Write Logs| PG
    FAIL -->|Write Attempts| PG
    SESS -->|Manage Sessions| PG
    SUSP -->|Read Patterns| PG

    style C fill:#4ade80,stroke:#166534
    style A fill:#f87171,stroke:#991b1b
    style PG fill:#93c5fd,stroke:#1e40af
```

## STRIDE Analysis

| Threat | Category | Attack Vector | Impact | Severity | Mitigation |
|---|---|---|---|---|---|
| **Spoofing** | Authentication | JWT secret guessed; weak passwords brute-forced; refresh token stolen | Attacker impersonates any user | High | bcrypt cost 12, 15min access tokens, rate limiting, failed login tracking |
| **Tampering** | Integrity | MITM alters transfer amount; race condition double-spend | Unauthorized fund movement | Critical | Atomic `$transaction` with row locking, Zod input validation |
| **Repudiation** | Non-repudiation | User denies transfer; no record of admin actions | Cannot prove who did what | Medium | Every state change writes to AuditLog in same DB transaction |
| **Info Disclosure** | Confidentiality | JWT leakage via XSS; verbose error stack traces | Session hijacking; internal exposure | High | Helmet headers, restricted CORS, sanitized production errors |
| **DoS** | Availability | Brute-force login; resource exhaustion | Database pool exhaustion; legitimate users locked out | Medium | Rate limiting (100/15min), failed login tracking with IP blocking thresholds |
| **Elevation of Privilege** | Authorization | JWT role tampering; missing RBAC check | Unauthorized admin access | Critical | DB-backed user fetch per request, `requireRole` middleware |

## Attack Tree: Transfer Double-Spend

```mermaid
graph TD
    R[Goal: Drain Account via Race Condition] --> A1[Send Concurrent Transfers]
    R --> A2[Exploit Balance Check Window]
    
    A1 --> B1[Fire N simultaneous transfer requests]
    B1 --> C1[Each request reads balance before others deduct]
    C1 --> D1[Balance check passes N times]
    D1 --> E1[Total debited > actual balance]
    
    A2 --> B2[Balance read and debit are NOT atomic]
    B2 --> C2[TOCTOU race condition]
    C2 --> D2["Thread A: read balance=100 ✓"]
    C2 --> D3["Thread B: read balance=100 ✓"]
    D2 --> E1[Thread A: debit 100]
    D3 --> E2[Thread B: debit 100]
    E1 --> F[Balance goes negative]
    E2 --> F

    style R fill:#f87171,stroke:#991b1b
    style F fill:#f87171,stroke:#991b1b
    style C2 fill:#fbbf24,stroke:#92400e
```

## Mitigation: Atomic Transaction Flow

```mermaid
sequenceDiagram
    participant Client
    participant API as API Server
    participant DB as PostgreSQL

    Client->>API: Transfer $100 (Request 1)
    Client->>API: Transfer $100 (Request 2 - concurrent)
    
    API->>DB: BEGIN TRANSACTION (Request 1)
    API->>DB: SELECT balance FROM accounts WHERE id=X FOR UPDATE
    DB-->>API: balance=100
    API->>DB: UPDATE accounts SET balance=0 WHERE id=X
    API->>DB: INSERT transaction record
    API->>DB: COMMIT (Request 1)
    
    API->>DB: BEGIN TRANSACTION (Request 2)
    API->>DB: SELECT balance FROM accounts WHERE id=X FOR UPDATE
    DB-->>API: balance=0 (blocked until Request 1 committed)
    API->>API: balance=0 < 100 → INSUFFICIENT_FUNDS
    API->>DB: ROLLBACK (Request 2)
    
    API-->>Client: 200 OK (Request 1)
    API-->>Client: 400 Insufficient Funds (Request 2)
```
