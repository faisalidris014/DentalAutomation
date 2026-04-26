# DentalFlow

**DentalFlow** is a dental practice automation platform built by [NiftyByte](https://niftybyte.com). It automates insurance eligibility verification, EOB processing, patient management, claims tracking, and multi-clinic IT administration through a polished, role-based UI.

The platform connects to Practice Management Systems (currently OpenDental) and insurance payers through extensible adapter patterns, with a PostgreSQL backend, JWT authentication, and a background job queue.

---

## Quick Start

```bash
npm install
cp .env.local.example .env.local   # Edit with your values
npm run db:migrate
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and log in with one of the seed accounts:

| Role | Email | Password |
|------|-------|----------|
| IT Admin | marcus@niftybyte.io | DentalFlow2026! |
| Staff Admin | sarah@brightsmiles.com | DentalFlow2026! |
| Staff User | jessica@brightsmiles.com | DentalFlow2026! |

See [docs/setup.md](docs/setup.md) for full environment setup instructions.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16.2 (App Router) |
| UI | React 19, styled-jsx |
| Language | TypeScript 5 (strict) |
| Database | PostgreSQL + Drizzle ORM |
| Auth | JWT (jose) + bcryptjs |
| Validation | Zod 4 |
| Icons | Lucide React |
| Charts | Chart.js + react-chartjs-2 |
| Fonts | DM Sans (UI), Space Mono (data) |

---

## Architecture

```
Browser (React 19)
  └─ Next.js App Router
       ├─ Pages (app/(app)/) ─── 11 role-gated routes
       ├─ API Routes (app/api/) ─── 27+ REST endpoints
       │    └─ Middleware: withErrorHandler → withAuth → withAudit → withValidation
       │    └─ Services: Auth, Eligibility, Sync, Queue, Notifications, Encryption
       │    └─ Adapters: PMS (OpenDental), Payer (DentalXChange)
       │    └─ Database: PostgreSQL (13 tables via Drizzle ORM)
       └─ Webhooks ─── OpenDental event receiver
```

See [docs/architecture.md](docs/architecture.md) for the full system overview.

---

## User Roles

| Role | Scope | Key Capabilities |
|------|-------|-----------------|
| **IT Admin** | All clinics | System-wide management, agents, clinic setup, payer configuration |
| **Staff Admin** | Own clinic | Insurance workflows, claims, EOB, staff management, settings |
| **Staff User** | Own clinic | Eligibility checks, recalls, claims tracking, notifications |

---

## Key Features

- **Eligibility Verification** -- Batch nightly, on-demand, and webhook-triggered insurance verification with PMS write-back
- **Patient Management** -- Synced from OpenDental with insurance status, appointments, claims
- **Claims Tracking** -- Submit, track, and manage denied claims
- **EOB Processing** -- Retrieval, triage, and auto-posting (Phase 3)
- **Background Jobs** -- PostgreSQL-backed queue with retry logic and execution logging
- **Webhook Integration** -- Real-time OpenDental event processing
- **Audit Logging** -- HIPAA-ready logging with PHI scrubbing
- **Multi-Tenancy** -- Clinic-scoped data isolation with role-based access

---

## Scripts

```bash
npm run dev           # Start development server
npm run build         # Production build
npm run start         # Start production server
npm run db:generate   # Generate Drizzle migrations
npm run db:migrate    # Run pending migrations
npm run db:push       # Push schema to DB (dev only)
npm run db:seed       # Seed development data
npm run db:studio     # Open Drizzle Studio
```

---

## Documentation

| Guide | Description |
|-------|-------------|
| [Developer Setup](docs/setup.md) | Prerequisites, environment variables, database setup, seed data |
| [Architecture](docs/architecture.md) | System overview, data flow, middleware chain, security layers |
| [Database Schema](docs/database.md) | All 13 tables with columns, types, indexes, relationships |
| [Authentication](docs/auth.md) | JWT tokens, refresh rotation, RBAC, clinic scoping |
| [API Reference](docs/api-reference.md) | All 27+ endpoints with request/response shapes |
| [Adapter Guide](docs/adapters.md) | How to add PMS and payer integrations |
| [Background Jobs](docs/jobs.md) | Job types, lifecycle, retry logic, worker setup |
| [Eligibility](docs/eligibility.md) | Verification flow, batch processing, payer classification |
| [Deployment](docs/deployment.md) | Vercel setup, production env vars, HIPAA checklist |

Additional design docs:
- [Screen Designs](DentalFlow_Screen_Designs.md) -- UI specifications for all pages
- [Screen Hierarchy](DentalFlow_Screen_Hierarchy.md) -- Page hierarchy and navigation
- [PRD](PRD.md) -- Full production build specification

---

## Design System

- **Theme**: Dark glassmorphic with cyan (#22d3ee) accent
- **Backgrounds**: Deep navy (#0b0f1a, #1a2235, #243049)
- **Status Colors**: Green (success), Amber (warning), Red (error), Purple (info)
- **Typography**: DM Sans for UI, Space Mono for data
- **Effects**: Backdrop blur, gradients, staggered animations, hover elevations

---

## Project Status

- **Phase 1** (Complete): Auth, patient/insurance sync, eligibility verification, job queue, notifications, audit logging
- **Phase 2** (Complete): Claims sync, appointment sync, advanced reporting
- **Phase 3** (Complete, mock clearinghouse): EOB retrieval, parser, 6-rule triage, auto-post, manual review, weekly reports. The DentalXChange `retrieveEOBs` adapter generates deterministic 835 documents for the demo; swap in real clearinghouse calls before production.
