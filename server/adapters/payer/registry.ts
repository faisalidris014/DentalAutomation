import type { IPayerAdapter } from './types';
import { PayerNotSupportedError } from './types';
import { DentalXChangeAdapter } from './clearinghouse/dentalxchange';
import type { DXCCredentialsBlob } from './clearinghouse/dentalxchange';
import { decrypt } from '../../services/encryption/credentials';

export interface PayerConfigLike {
  adapterKey: string;
  payerName: string;
  credentials?: string | null;
  /**
   * Drizzle types `payer_configs.featuresEnabled` as `unknown` (JSONB).
   * Kept as `unknown` here on purpose — `readEobMode()` narrows it explicitly
   * rather than using a `Record<string, ...>` cast (PATTERNS.md anti-pattern
   * line 556 forbids the silent widening).
   *
   * Optional so that callers passing a narrower shape (e.g. eligibility/engine.ts)
   * stay type-compatible.
   */
  featuresEnabled?: unknown;
}

/**
 * Decrypt a value if it looks encrypted (`iv:tag:ciphertext` format), otherwise
 * pass it through. Mirrors `pms/registry.ts:25–35` so the dual encrypted /
 * legacy-plaintext shape stays compatible.
 */
function tryDecrypt(value: string): string {
  if (value.includes(':')) {
    try {
      return decrypt(value);
    } catch {
      return value;
    }
  }
  return value;
}

/**
 * Normalize the on-disk DXC credentials blob into `DXCCredentialsBlob`.
 *
 * Two on-disk shapes are supported (RESEARCH.md Pitfall 6):
 *   - Legacy: a bare encrypted string → `{ eligibility: { apiKey: <plaintext> } }`
 *   - New:    an encrypted JSON blob   → parsed as-is into `DXCCredentialsBlob`
 *
 * Returns `null` when no credentials are configured.
 */
export function decryptDXCCredentials(
  encrypted: string | null | undefined,
): DXCCredentialsBlob | null {
  if (!encrypted) return null;
  const plaintext = tryDecrypt(encrypted);

  // Try JSON shape first (new); fall back to bare-string treatment (legacy).
  try {
    const parsed = JSON.parse(plaintext);
    if (parsed && typeof parsed === 'object') {
      return parsed as DXCCredentialsBlob;
    }
  } catch {
    // Not JSON — fall through to legacy treatment.
  }
  return { eligibility: { apiKey: plaintext } };
}

/**
 * Narrow `featuresEnabled` JSONB unknown into the literal `eobMode` union.
 * Returns `undefined` for any value outside the allowed union — the adapter
 * then applies its default precedence in `resolveMode()`.
 */
function readEobMode(
  featuresEnabled: unknown,
): 'mock' | 'sandbox' | 'production' | undefined {
  if (!featuresEnabled || typeof featuresEnabled !== 'object') return undefined;
  const features = featuresEnabled as Record<string, unknown>;
  const mode = features.eobMode;
  if (mode === 'mock' || mode === 'sandbox' || mode === 'production') return mode;
  return undefined;
}

export function getPayerAdapter(config: PayerConfigLike): IPayerAdapter {
  switch (config.adapterKey) {
    case 'clearinghouse.dentalxchange': {
      return new DentalXChangeAdapter(config.payerName, {
        eobMode: readEobMode(config.featuresEnabled),
        credentials: decryptDXCCredentials(config.credentials),
      });
    }
    // Future:
    // case 'medicaid.minnesota':
    //   return new MinnesotaMedicaidAdapter(config.credentials);
    default:
      throw new PayerNotSupportedError(config.adapterKey);
  }
}
