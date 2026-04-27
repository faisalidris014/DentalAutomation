/**
 * Deterministic non-cryptographic hash used by the DentalXChange mock paths
 * to vary fixture data while staying reproducible across runs.
 *
 * Hoisted here from `dentalxchange.ts` during Phase 3.5 Plan 02 so
 * `dentalxchange-source-mock.ts` can import it without creating a circular
 * dependency back to its parent file. See PATTERNS.md §Open Conventions
 * item 4 (recommended: hoist).
 *
 * NOT cryptographically secure. Do not use for auth, signing, or anything
 * that requires collision resistance.
 */
export function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}
