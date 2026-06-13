import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  environment: process.env.NODE_ENV,

  // 10% трacing в prod — достатъчно за bottleneck detection
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Session replays: 2% нормални, 100% при error
  replaysSessionSampleRate: 0.02,
  replaysOnErrorSampleRate: 1.0,

  integrations: [
    Sentry.replayIntegration({
      maskAllText: false,
      blockAllMedia: false,
    }),
  ],

  // Игнорирай browser extension noise
  ignoreErrors: [
    'ResizeObserver loop limit exceeded',
    'ResizeObserver loop completed with undelivered notifications',
    /^No error$/,
    /ChunkLoadError/,
    // Instagram WebView native bridge errors — not our code
    /Java object is gone/,
    /Error invoking postMessage/,
    /Error invoking enableButtonsClickedMetaDataLogging/,
  ],

  beforeSend(event) {
    // Drop errors originating from Instagram's injected navigation_performance_logger
    const frames = event.exception?.values?.[0]?.stacktrace?.frames;
    if (frames?.some((f) => f.filename?.includes('navigation_performance_logger_android'))) {
      return null;
    }
    return event;
  },
});
