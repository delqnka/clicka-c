import 'server-only';

import { neon, type NeonQueryFunction } from '@neondatabase/serverless';

let rawSql: ReturnType<typeof neon> | null = null;

function getDb(): ReturnType<typeof neon> {
  if (!rawSql) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL не е зададена');
    }
    rawSql = neon(process.env.DATABASE_URL);
  }
  return rawSql;
}

const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 150;

function isRetryable(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as Record<string, unknown>;
  if (e['neon:retryable'] === true) return true;
  const msg = typeof e.message === 'string' ? e.message.toLowerCase() : '';
  return (
    msg.includes('control plane request failed') ||
    msg.includes('connection closed') ||
    msg.includes('connection terminated') ||
    msg.includes('fetch failed')
  );
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function withRetry<T>(run: () => Promise<T>): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await run();
    } catch (err) {
      lastErr = err;
      if (attempt === MAX_ATTEMPTS || !isRetryable(err)) throw err;
      await sleep(BASE_DELAY_MS * attempt);
    }
  }
  throw lastErr;
}

export const sql = ((strings: TemplateStringsArray, ...values: unknown[]) =>
  withRetry(() =>
    (getDb() as unknown as (s: TemplateStringsArray, ...v: unknown[]) => Promise<unknown[]>)(
      strings,
      ...values,
    ),
  )) as unknown as NeonQueryFunction<false, false>;

export async function sqlTransaction<T extends unknown[] = unknown[][]>(
  run: (txn: NeonQueryFunction<false, false>) => unknown[],
  opts?: { isolationMode?: 'ReadUncommitted' | 'ReadCommitted' | 'RepeatableRead' | 'Serializable' },
): Promise<T> {
  const db = getDb() as ReturnType<typeof neon> & {
    transaction: (
      run: (txn: NeonQueryFunction<false, false>) => unknown[],
      opts?: { isolationMode?: 'ReadUncommitted' | 'ReadCommitted' | 'RepeatableRead' | 'Serializable' },
    ) => Promise<T>;
  };
  return withRetry(() => db.transaction(run, opts));
}
