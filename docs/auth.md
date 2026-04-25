# Authentication and Authorization

## Overview

DentalFlow uses JWT-based authentication with refresh token rotation. Passwords are hashed with bcrypt. Authorization is role-based with three tiers: `it_admin`, `staff_admin`, and `staff_user`. All clinic-scoped data is automatically filtered by the authenticated user's clinic.

---

## JWT Access Tokens

- **Library:** `jose` (HS256)
- **Payload:** `{ sub: userId, email, role, clinicId }`
- **Expiry:** Configurable via `JWT_EXPIRY` env var (default `"15m"`)
- **Source:** `server/services/auth/jwt.ts`

| Function | Description |
|----------|-------------|
| `generateAccessToken(user)` | Returns a signed JWT string |
| `verifyAccessToken(token)` | Returns decoded payload; throws on invalid/expired |

---

## Refresh Token Rotation

**Source:** `server/services/auth/sessions.ts`

Refresh tokens are single-use, stored as SHA256 hashes (never plaintext), and expire after 7 days.

| Function | Behavior |
|----------|----------|
| `createRefreshToken(userId)` | Generates UUID, stores SHA256 hash + expiry in `refresh_tokens` table, returns plaintext token |
| `rotateRefreshToken(token)` | Validates hash, checks expiry and revocation, revokes old token, issues new access + refresh pair |
| `revokeRefreshToken(token)` | Sets `is_revoked = true` on the matching token |
| `revokeAllUserTokens(userId)` | Bulk revocation for forced logout across all sessions |

Reuse of a rotated token is rejected -- tokens are strictly one-time-use.

---

## Password Handling

**Library:** `bcryptjs`
**Source:** `server/services/auth/passwords.ts`

| Function | Behavior |
|----------|----------|
| `hashPassword(password)` | Bcrypt hash with configurable rounds (`BCRYPT_ROUNDS` env, default 12, min 10, max 15) |
| `comparePassword(password, hash)` | Constant-time comparison via bcrypt |
| `validatePasswordStrength(password)` | Returns `{ valid, errors[] }`. Requirements: 8+ chars, uppercase, lowercase, number |

---

## Auth Flows

### Login

```
POST /api/auth/login { email, password }
  -> Validate body (Zod: loginSchema)
  -> Query user by email
  -> Check user.isActive
  -> comparePassword(password, user.passwordHash)
  -> generateAccessToken(user)
  -> createRefreshToken(user.id)
  -> Update user.lastLoginAt
  -> Return { accessToken, refreshToken, user: { id, email, firstName, lastName, role, clinicId } }
```

### Token Refresh

```
POST /api/auth/refresh { refreshToken }
  -> rotateRefreshToken(token)
  -> Return { accessToken, refreshToken }
```

### Logout

```
POST /api/auth/logout { refreshToken }
  -> revokeRefreshToken(token)
  -> Return { success: true }
```

---

## withAuth Middleware

**Source:** `server/middleware/auth.ts`

```typescript
withAuth(allowedRoles: Role[], handler): wrappedHandler
```

1. Extracts Bearer token from `Authorization` header.
2. Calls `verifyAccessToken(token)` -- throws `AuthenticationError` (401) if invalid.
3. Checks `payload.role` against `allowedRoles` -- throws `AuthorizationError` (403) if not permitted.
4. Injects `AuthContext { user: { id, email, role, clinicId }, params? }` into the handler.

---

## Clinic Scope

```typescript
getClinicScope(user, requestedClinicId?): string | null
```

| Role | Behavior |
|------|----------|
| `it_admin` | Returns `requestedClinicId` if provided, otherwise `null` (all clinics) |
| `staff_admin` | Always returns `user.clinicId` (ignores requested) |
| `staff_user` | Always returns `user.clinicId` (ignores requested) |

---

## Role Permissions Matrix

| Endpoint | it_admin | staff_admin | staff_user |
|----------|----------|-------------|------------|
| `POST /api/auth/login` | public | public | public |
| `POST /api/auth/refresh` | public | public | public |
| `POST /api/auth/logout` | public | public | public |
| `GET /api/auth/me` | yes | yes | yes |
| `GET /api/patients` | yes | yes | yes |
| `GET /api/patients/:id` | yes | yes | yes |
| `GET /api/eligibility` | yes | yes | yes |
| `POST /api/eligibility/verify` | yes | yes | yes |
| `GET /api/eligibility/stats` | yes | yes | no |
| `GET/POST /api/clinics` | yes | no | no |
| `PUT /api/clinics/:id` | yes | no | no |
| `GET/POST /api/users` | yes | no | no |
| `PUT /api/users/:id` | yes | no | no |
| `GET /api/jobs` | yes | yes | yes |
| `GET /api/jobs/:id` | yes | yes | yes |
| `POST /api/jobs/:id/cancel` | yes | yes | no |
| `POST /api/jobs/:id/retry` | yes | yes | no |
| `GET /api/notifications` | yes | yes | yes |
| `PATCH /api/notifications/:id` | yes | yes | yes |
| `GET /api/settings` | yes | yes | no |
| `PUT /api/settings` | yes | yes | no |
| `GET /api/dashboard/kpis` | yes | yes | yes |
| `POST /api/webhooks/opendental` | no auth (secret header) | | |
| `POST /api/internal/worker` | Bearer `JWT_SECRET` (not user auth) | | |

---

## Frontend Token Management

**Source:** `lib/api.ts`

- Tokens are stored in **module-scoped variables** (memory only, never localStorage).
- `setTokens(access, refresh)` / `clearTokens()` / `getAccessToken()` / `getRefreshToken()`
- Every API request injects `Authorization: Bearer {accessToken}` via the request helper.
- On **401 response**: automatically calls `attemptRefresh()`, which POSTs to `/api/auth/refresh` and retries the original request.
- On **refresh failure**: dispatches an `auth:logout` custom event. `AuthContext` catches it and redirects to `/login`.
