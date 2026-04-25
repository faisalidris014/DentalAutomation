# DentalFlow -- Developer Setup Guide

## Prerequisites

- **Node.js** 20+ (required for native module compatibility)
- **PostgreSQL** 15+
- **npm** (ships with Node.js)

## Installation

```bash
git clone <repo-url>
cd DentalAutomation
npm install
```

## Environment Variables

All environment variables are validated at runtime via Zod (`server/config/index.ts`). The app will throw a descriptive error on startup if any required value is missing or malformed.

Copy the template below into `.env.local` at the project root and fill in the values:

```env
# ── Database ──────────────────────────────────────────────
DATABASE_URL=postgresql://user:password@localhost:5432/dentalflow
DATABASE_SSL=false

# ── Authentication ────────────────────────────────────────
# Min 32 chars. Generate with: openssl rand -hex 32
JWT_SECRET=
JWT_EXPIRY=15m
REFRESH_TOKEN_EXPIRY_DAYS=7
BCRYPT_ROUNDS=12

# ── Encryption ────────────────────────────────────────────
# Min 32 chars hex. Generate with: openssl rand -hex 32
CREDENTIAL_ENCRYPTION_KEY=

# ── OpenDental PMS Integration ────────────────────────────
OD_DEVELOPER_KEY=
OD_SANDBOX_CUSTOMER_KEY=
OD_API_BASE_URL=https://api.opendental.com/api/v1

# ── Webhooks ──────────────────────────────────────────────
# Optional in development, required in production
WEBHOOK_SECRET=

# ── App ───────────────────────────────────────────────────
NODE_ENV=development
APP_URL=http://localhost:3000

# ── Seed Script Only ──────────────────────────────────────
SEED_ADMIN_PASSWORD=DentalFlow2026!
```

### Variable Reference

| Variable | Required | Default | Notes |
|---|---|---|---|
| `DATABASE_URL` | Yes | -- | PostgreSQL connection string |
| `DATABASE_SSL` | No | `false` | Set `true` for hosted/production databases |
| `JWT_SECRET` | Yes | -- | Min 32 characters |
| `JWT_EXPIRY` | No | `15m` | Token lifetime (e.g. `15m`, `1h`) |
| `REFRESH_TOKEN_EXPIRY_DAYS` | No | `7` | Refresh token lifetime in days |
| `BCRYPT_ROUNDS` | No | `12` | Range: 10--15 |
| `CREDENTIAL_ENCRYPTION_KEY` | Yes | -- | Min 32 characters, hex |
| `OD_DEVELOPER_KEY` | Yes | -- | From OpenDental developer portal |
| `OD_SANDBOX_CUSTOMER_KEY` | No | -- | For sandbox/testing environments |
| `OD_API_BASE_URL` | No | `https://api.opendental.com/api/v1` | OpenDental API endpoint |
| `WEBHOOK_SECRET` | Prod only | -- | Required in production |
| `NODE_ENV` | No | `development` | `development`, `production`, or `test` |
| `APP_URL` | No | `http://localhost:3000` | Public-facing app URL |
| `SEED_ADMIN_PASSWORD` | No | `DentalFlow2026!` | Used only by `db:seed` script |

## Database Setup

### Available Scripts

| Script | Command | Description |
|---|---|---|
| `db:generate` | `drizzle-kit generate` | Generate Drizzle migrations from schema changes |
| `db:migrate` | `tsx server/db/migrate.ts` | Run pending migrations |
| `db:push` | `drizzle-kit push` | Push schema directly to DB (dev only, bypasses migrations) |
| `db:seed` | `tsx server/db/seed.ts` | Seed development data |
| `db:studio` | `drizzle-kit studio` | Open Drizzle Studio browser UI |

### First-Time Setup

```bash
npm run db:migrate
npm run db:seed
```

This creates the schema and populates the database with development data.

## Seed Data

The seed script (`server/db/seed.ts`) creates the following:

**Clinic**
- "Bright Smiles Dental" (Austin, TX) with OpenDental PMS config (placeholder credentials)

**Users** -- all share the password from `SEED_ADMIN_PASSWORD` (default: `DentalFlow2026!`):

| Email | Role | Clinic |
|---|---|---|
| `marcus@niftybyte.io` | IT Admin | None (system-wide) |
| `sarah@brightsmiles.com` | Staff Admin | Bright Smiles |
| `jessica@brightsmiles.com` | Staff User | Bright Smiles |

**Other Data**
- 10 patients with DOBs, phone, email, and balance
- 8 insurance records (Delta Dental, MetLife, Cigna -- all PPO except one HMO)
- 3 payer configs (Delta Dental, MetLife, Cigna via `clearinghouse.dentalxchange` adapter)
- 7 default settings (eligibility batch time, threshold days, EOB thresholds, recall intervals, feature flags)
- 2 sample notifications

## Running the App

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The app redirects to the login page. Use any of the seed credentials listed above.

## NPM Scripts Reference

| Script | Command | Description |
|---|---|---|
| `dev` | `next dev` | Start development server |
| `build` | `next build` | Create production build |
| `start` | `next start` | Start production server |
| `db:generate` | `drizzle-kit generate` | Generate Drizzle migrations from schema |
| `db:migrate` | `tsx server/db/migrate.ts` | Run pending migrations |
| `db:push` | `drizzle-kit push` | Push schema to DB (dev only) |
| `db:seed` | `tsx server/db/seed.ts` | Seed development data |
| `db:studio` | `drizzle-kit studio` | Open Drizzle Studio browser UI |

## Troubleshooting

**SSL errors connecting to PostgreSQL**
Set `DATABASE_SSL=false` in `.env.local` when running against a local PostgreSQL instance without SSL configured.

**bcrypt native module issues**
Ensure you are running Node.js 20+ and rebuild the module:
```bash
npm rebuild bcryptjs
```

**Config validation errors on startup**
The app validates all environment variables on first access via the Zod schema in `server/config/index.ts`. If you see `Invalid configuration` errors, check that your `.env.local` matches the template above -- paying attention to minimum lengths for `JWT_SECRET` and `CREDENTIAL_ENCRYPTION_KEY` (both require at least 32 characters).

**Drizzle migration errors**
Make sure your PostgreSQL server is running and `DATABASE_URL` is correct. You can verify connectivity with:
```bash
psql $DATABASE_URL -c "SELECT 1"
```
