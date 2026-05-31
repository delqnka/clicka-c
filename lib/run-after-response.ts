import { waitUntil } from '@vercel/functions';

/** Keep background work alive after the HTTP response (Vercel) with local fallback. */
export function runAfterResponse(work: Promise<unknown>) {
  const tracked = work.catch((err) => {
    console.error('[runAfterResponse]', err);
  });

  try {
    waitUntil(tracked);
  } catch {
    void tracked;
  }
}
