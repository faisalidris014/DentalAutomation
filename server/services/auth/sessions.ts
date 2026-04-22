import { createHash, randomUUID } from 'crypto';
import { eq, and } from 'drizzle-orm';
import { db } from '../../db/connection';
import { refreshTokens, users } from '../../db/schema';
import { getConfig } from '../../config';
import { generateAccessToken } from './jwt';

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function createRefreshToken(userId: string): Promise<string> {
  const token = randomUUID();
  const tokenHash = hashToken(token);
  const expiryDays = getConfig().auth.refreshTokenExpiryDays;
  const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);

  await db.insert(refreshTokens).values({
    userId,
    tokenHash,
    expiresAt,
  });

  return token;
}

export async function rotateRefreshToken(token: string): Promise<{
  accessToken: string;
  refreshToken: string;
}> {
  const tokenHash = hashToken(token);

  const [existing] = await db
    .select()
    .from(refreshTokens)
    .where(
      and(
        eq(refreshTokens.tokenHash, tokenHash),
        eq(refreshTokens.isRevoked, false),
      )
    )
    .limit(1);

  if (!existing) {
    throw new Error('Invalid refresh token');
  }

  if (existing.expiresAt < new Date()) {
    await db
      .update(refreshTokens)
      .set({ isRevoked: true })
      .where(eq(refreshTokens.id, existing.id));
    throw new Error('Refresh token expired');
  }

  // Revoke old token
  await db
    .update(refreshTokens)
    .set({ isRevoked: true })
    .where(eq(refreshTokens.id, existing.id));

  // Get user for new access token
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, existing.userId))
    .limit(1);

  if (!user) {
    throw new Error('User not found');
  }

  // Create new tokens
  const accessToken = await generateAccessToken({
    id: user.id,
    email: user.email,
    role: user.role,
    clinicId: user.clinicId,
  });

  const newRefreshToken = await createRefreshToken(user.id);

  return { accessToken, refreshToken: newRefreshToken };
}

export async function revokeRefreshToken(token: string): Promise<void> {
  const tokenHash = hashToken(token);
  await db
    .update(refreshTokens)
    .set({ isRevoked: true })
    .where(eq(refreshTokens.tokenHash, tokenHash));
}

export async function revokeAllUserTokens(userId: string): Promise<void> {
  await db
    .update(refreshTokens)
    .set({ isRevoked: true })
    .where(eq(refreshTokens.userId, userId));
}
