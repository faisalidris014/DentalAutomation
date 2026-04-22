import { SignJWT, jwtVerify } from 'jose';
import { getConfig } from '../../config';

export interface JWTPayload {
  sub: string;
  email: string;
  role: 'it_admin' | 'staff_admin' | 'staff_user';
  clinicId: string | null;
}

function getSecret(): Uint8Array {
  return new TextEncoder().encode(getConfig().auth.jwtSecret);
}

function parseExpiry(expiry: string): string {
  return expiry;
}

export async function generateAccessToken(user: {
  id: string;
  email: string;
  role: string;
  clinicId: string | null;
}): Promise<string> {
  const secret = getSecret();
  const expiry = parseExpiry(getConfig().auth.jwtExpiry);

  return new SignJWT({
    email: user.email,
    role: user.role,
    clinicId: user.clinicId,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(expiry)
    .sign(secret);
}

export async function verifyAccessToken(token: string): Promise<JWTPayload> {
  const secret = getSecret();

  const { payload } = await jwtVerify(token, secret);

  return {
    sub: payload.sub as string,
    email: payload.email as string,
    role: payload.role as JWTPayload['role'],
    clinicId: (payload.clinicId as string) ?? null,
  };
}
