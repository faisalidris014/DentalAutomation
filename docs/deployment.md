# Deployment Guide

Deploy the DentalFlow dental automation platform to Vercel with a PostgreSQL database.

## Prerequisites

- Vercel account with project linked
- PostgreSQL database (recommended: Neon or Supabase via Vercel Marketplace)
- OpenDental developer API key

## Vercel Project Setup

1. Link the repository to Vercel:

```bash
vercel link
```

Or connect via the Vercel dashboard under "New Project."

2. Framework is detected automatically as Next.js.
3. Build command: `npm run build` (default).
4. Output directory: `.next` (default).

## Environment Variables

Set all variables from the `.env.local` template (see `docs/setup.md`) in Vercel project settings under Settings > Environment Variables.

Production-specific requirements:

| Variable | Requirement |
|----------|------------|
| `DATABASE_URL` | PostgreSQL connection string with connection pooling (e.g., Neon pooler URL) |
| `DATABASE_SSL` | Must be `true` in production |
| `JWT_SECRET` | Min 32 chars. Generate: `openssl rand -hex 32`. Never reuse across environments. |
| `CREDENTIAL_ENCRYPTION_KEY` | Min 32 hex chars (64 char hex string = 32 bytes). Generate: `openssl rand -hex 32` |
| `WEBHOOK_SECRET` | Required in production. Shared with OpenDental webhook config. |
| `NODE_ENV` | `production` |
| `APP_URL` | Production URL (e.g., `https://dentalflow.vercel.app`) |
| `OD_DEVELOPER_KEY` | From OpenDental developer registration |
| `OD_API_BASE_URL` | `https://api.opendental.com/api/v1` for production |

Optional variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `JWT_EXPIRY` | `15m` | Access token lifetime |
| `REFRESH_TOKEN_EXPIRY_DAYS` | `7` | Refresh token lifetime in days |
| `BCRYPT_ROUNDS` | `12` | Password hashing cost factor (10-15) |
| `OD_SANDBOX_CUSTOMER_KEY` | -- | Only needed for sandbox/testing environments |

## Database

Recommended providers via Vercel Marketplace:

- **Neon** -- serverless PostgreSQL with connection pooling, branching, and autoscaling
- **Supabase** -- PostgreSQL with built-in auth, realtime, and storage

After provisioning:

```bash
# Run migrations
npm run db:migrate

# Seed initial data (one-time setup)
npm run db:seed
```

To run migrations automatically on each deploy, update the build script in `package.json`:

```json
{
  "scripts": {
    "build": "npm run db:migrate && next build"
  }
}
```

## Worker (Background Jobs)

The job queue worker must be invoked on a schedule. Use Vercel Cron Jobs.

Add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/internal/worker",
      "schedule": "*/1 * * * *"
    }
  ]
}
```

This invokes the worker every minute. The worker processes one job per invocation. For higher throughput, decrease the interval or invoke it multiple times per cycle.

The worker endpoint authenticates via `Authorization: Bearer {JWT_SECRET}`. Vercel Cron Jobs include the `CRON_SECRET` header automatically. For production, consider updating the worker auth to validate `CRON_SECRET` instead.

## Security Checklist

- [ ] `JWT_SECRET` is unique per environment (dev/staging/prod), min 32 chars
- [ ] `CREDENTIAL_ENCRYPTION_KEY` is unique per environment, 64 hex chars
- [ ] `DATABASE_SSL=true` for all non-local databases
- [ ] `WEBHOOK_SECRET` is set and shared with OpenDental webhook configuration
- [ ] All seed/default passwords changed from defaults
- [ ] Audit log table has retention policy (consider archiving after 90 days)
- [ ] Error handler PHI scrubbing is enabled (built-in, verify not disabled)

## HIPAA Considerations

- **Audit logging**: Every API call logged to `audit_log` table with user, action, IP, and timestamp.
- **PHI scrubbing**: Error handler in `server/middleware/errorHandler.ts` redacts SSN patterns, phone numbers, email addresses, insurance IDs, and dates of birth from error messages before logging.
- **Encryption at rest**: Payer credentials and PMS API keys encrypted with AES-256-GCM via `server/services/encryption/credentials.ts`.
- **Clinic isolation**: All queries scoped by `clinic_id`, enforced by `getClinicScope()` middleware.
- **Token security**: Access tokens expire in 15m, refresh tokens are one-time-use and stored hashed.
- **No PHI in URLs**: Patient data accessed by UUID, never by name or DOB in URL paths.

## Monitoring

- **Job health**: `GET /api/eligibility/stats` returns verification counts, failure rates, average duration, and last batch run time.
- **Notifications**: System auto-creates notifications for verification failures and batch summaries.
- **Payer health**: `payer_configs.health_status` tracks adapter health (healthy/degraded/down).
- **Clinic connectivity**: `GET /api/clinics/:id/health` tests PMS adapter connection.

## Build and Deploy

Preview deployment:

```bash
vercel
```

Production deployment:

```bash
vercel --prod
```

Or push to the `main` branch for automatic production deployment via Vercel Git integration.
