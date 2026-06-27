import * as Sentry from '@sentry/nextjs';

// Only init when we have a syntactically valid DSN. An empty/garbled value
// makes Sentry's edge bundle throw `TypeError: Invalid URL` on the first
// edge invocation, which surfaces as MIDDLEWARE_INVOCATION_FAILED / 500 on
// the affected route.
const rawDsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN || '';
let dsn: string | undefined;
try {
  if (rawDsn) {
    new URL(rawDsn);
    dsn = rawDsn;
  }
} catch {
  dsn = undefined;
}

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  });
}
