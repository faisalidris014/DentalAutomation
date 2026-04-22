import { createHash } from 'crypto';

export interface DiffResult<T> {
  inserts: T[];
  updates: T[];
  unchanged: string[];
}

export function diffRecords<T>(
  existing: Map<string, { hash: string }>,
  incoming: T[],
  getKey: (item: T) => string,
  getHash: (item: T) => string,
): DiffResult<T> {
  const inserts: T[] = [];
  const updates: T[] = [];
  const unchanged: string[] = [];
  const seen = new Set<string>();

  for (const item of incoming) {
    const key = getKey(item);
    seen.add(key);
    const existingRecord = existing.get(key);

    if (!existingRecord) {
      inserts.push(item);
    } else {
      const newHash = getHash(item);
      if (existingRecord.hash !== newHash) {
        updates.push(item);
      } else {
        unchanged.push(key);
      }
    }
  }

  return { inserts, updates, unchanged };
}

export function hashRecord(fields: Record<string, unknown>): string {
  const sorted = JSON.stringify(fields, Object.keys(fields).sort());
  return createHash('md5').update(sorted).digest('hex');
}
