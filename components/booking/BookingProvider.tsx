'use client';

import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { BookingWidget } from './BookingWidget';
import type { BookingWidgetHandle } from './types';

export type BookingContextValue = {
  /**
   * Open the booking modal. Pass a service id to pre-select it. If the salon
   * record hasn't loaded yet, the call is queued and fired as soon as it does.
   */
  open: (service?: string) => void;
  /** Close the booking modal. No-op if it isn't open. */
  close: () => void;
  /** True once the salon record is loaded and the modal is mountable. */
  isReady: boolean;
  /** Non-null if the salon fetch failed (network, 404, etc.). */
  error: Error | null;
  /** The raw salon record once loaded, or null while loading / on error. */
  salon: Record<string, unknown> | null;
};

export const BookingContext = createContext<BookingContextValue | null>(null);

export type BookingProviderProps = {
  children?: React.ReactNode;
  /**
   * Salon slug. If omitted, the provider tries (in order):
   * 1. `window.__CLICKA_SALON_SLUG`
   * 2. `<meta name="clicka:salon" content="...">`
   * 3. `process.env.NEXT_PUBLIC_SALON_SLUG` (Next.js / Vite-replaced)
   * 4. `process.env.NEXT_PUBLIC_CLICKA_SALON`
   */
  salonSlug?: string;
  /**
   * Engine origin. If omitted, the provider tries (in order):
   * 1. `window.__CLICKA_ENGINE_URL`
   * 2. `<meta name="clicka:engine" content="...">`
   * 3. `process.env.NEXT_PUBLIC_CLICKA_ENGINE`
   * 4. `process.env.NEXT_PUBLIC_CLICKA_API_URL`
   * 5. Default: `https://clicka.bg`
   */
  engineUrl?: string;
  /**
   * BCP-47 locale. If omitted, the provider derives it from
   * `<html lang>`, then `<body data-lang>`, then `navigator.language`,
   * defaulting to `bg-BG`.
   */
  locale?: string;
  /** Stripe success URL. Defaults to current page with `?booked=1`. */
  successUrl?: string;
  /** Stripe cancel URL. Defaults to current page with `?cancelled=1`. */
  cancelUrl?: string;
  /** CSS gradient for accent fills. */
  accentGradient?: string;
  /** Custom price formatter. */
  formatPrice?: (amount: number) => string;
  /** Analytics callback (replaces internal fbq/gtag). */
  onEvent?: (
    name: 'booking_started' | 'booking_completed',
    payload?: { serviceName?: string; value?: number; currency?: string },
  ) => void;
  /** Prefix for `/terms` and `/privacy` legal links. */
  basePath?: string;
  /**
   * When true (default), the provider attaches a document-level click handler
   * that opens the modal for any element matching `[data-clicka-book]`.
   * The attribute value (when non-empty) is passed as the service id.
   */
  autoTriggers?: boolean;
  /**
   * When true (default), the provider opens the modal on mount if the URL
   * contains `?service=<id>` or `?book=1`.
   */
  honorUrlParams?: boolean;
};

function readGlobalString(key: string): string | undefined {
  if (typeof window === 'undefined') return undefined;
  const v = (window as unknown as Record<string, unknown>)[key];
  return typeof v === 'string' && v ? v : undefined;
}

function readMeta(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  return (
    document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)?.content || undefined
  );
}

function readEnv(key: string): string | undefined {
  try {
    const p = (typeof process !== 'undefined' ? process : undefined) as unknown as {
      env?: Record<string, string | undefined>;
    };
    const v = p?.env?.[key];
    return typeof v === 'string' && v ? v : undefined;
  } catch {
    return undefined;
  }
}

function resolveSlug(prop?: string): string | undefined {
  return (
    prop ||
    readGlobalString('__CLICKA_SALON_SLUG') ||
    readMeta('clicka:salon') ||
    readEnv('NEXT_PUBLIC_SALON_SLUG') ||
    readEnv('NEXT_PUBLIC_CLICKA_SALON')
  );
}

function resolveEngine(prop?: string): string {
  return (
    prop ||
    readGlobalString('__CLICKA_ENGINE_URL') ||
    readMeta('clicka:engine') ||
    readEnv('NEXT_PUBLIC_CLICKA_ENGINE') ||
    readEnv('NEXT_PUBLIC_CLICKA_API_URL') ||
    'https://clicka.bg'
  );
}

function resolveLocale(prop?: string): string {
  if (prop) return prop;
  if (typeof document !== 'undefined') {
    const htmlLang = document.documentElement.lang?.trim();
    if (htmlLang) {
      if (htmlLang === 'bg') return 'bg-BG';
      if (htmlLang === 'en') return 'en-US';
      return htmlLang;
    }
    const bodyLang = document.body?.dataset?.lang?.trim();
    if (bodyLang) return bodyLang === 'bg' ? 'bg-BG' : 'en-US';
  }
  if (typeof navigator !== 'undefined' && navigator.language) {
    return navigator.language;
  }
  return 'bg-BG';
}

function defaultReturnUrl(flag: 'booked' | 'cancelled'): string | undefined {
  if (typeof window === 'undefined') return undefined;
  return `${location.origin}${location.pathname}?${flag}=1`;
}

export function BookingProvider({
  children,
  salonSlug,
  engineUrl,
  locale,
  successUrl,
  cancelUrl,
  accentGradient,
  formatPrice,
  onEvent,
  basePath,
  autoTriggers = true,
  honorUrlParams = true,
}: BookingProviderProps) {
  const slug = useMemo(() => resolveSlug(salonSlug), [salonSlug]);
  const resolvedEngineUrl = useMemo(() => resolveEngine(engineUrl), [engineUrl]);
  const resolvedLocale = useMemo(() => resolveLocale(locale), [locale]);
  const resolvedSuccessUrl = useMemo(
    () => successUrl ?? defaultReturnUrl('booked'),
    [successUrl],
  );
  const resolvedCancelUrl = useMemo(
    () => cancelUrl ?? defaultReturnUrl('cancelled'),
    [cancelUrl],
  );

  const widgetRef = useRef<BookingWidgetHandle>(null);
  // pendingRef: undefined = no queued open. null = open without service.
  // string = open with that service id.
  const pendingRef = useRef<string | null | undefined>(undefined);
  const urlAutoOpenedRef = useRef(false);

  const [salon, setSalon] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<Error | null>(null);

  // ── Salon fetch ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!slug) {
      console.error(
        '[@clicka/booking] BookingProvider has no salon slug. Pass `salonSlug` ' +
          'or set NEXT_PUBLIC_SALON_SLUG / <meta name="clicka:salon"> / ' +
          'window.__CLICKA_SALON_SLUG.',
      );
      return;
    }
    let cancelled = false;
    const url = `${resolvedEngineUrl.replace(/\/$/, '')}/api/public/v1/salons/${encodeURIComponent(slug)}`;
    fetch(url, { cache: 'no-store' })
      .then((r) => {
        if (!r.ok) throw new Error(`Salon fetch failed: HTTP ${r.status}`);
        return r.json();
      })
      .then((d: { salon?: Record<string, unknown> }) => {
        if (cancelled) return;
        if (!d.salon) throw new Error('Empty salon response');
        setSalon(d.salon);
        setError(null);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        const err = e instanceof Error ? e : new Error(String(e));
        console.error('[@clicka/booking] salon fetch failed:', err);
        setError(err);
      });
    return () => {
      cancelled = true;
    };
  }, [resolvedEngineUrl, slug]);

  // ── Public open/close ──────────────────────────────────────────────────
  const open = useCallback(
    (service?: string) => {
      if (widgetRef.current && salon) {
        widgetRef.current.open(service || undefined);
      } else {
        pendingRef.current = service ?? null;
      }
    },
    [salon],
  );

  const close = useCallback(() => widgetRef.current?.close(), []);

  // ── Flush pending open() when salon finishes loading ───────────────────
  useEffect(() => {
    if (salon && widgetRef.current && pendingRef.current !== undefined) {
      const s = pendingRef.current;
      pendingRef.current = undefined;
      widgetRef.current.open(s || undefined);
    }
  }, [salon]);

  // ── Document-level click delegation ────────────────────────────────────
  // Listens to multiple attribute names so existing sites can keep their
  // markup. Primary: [data-clicka-book]. Legacy: [data-book-service],
  // [data-book]. The attribute *value* (when not empty / 'true') is passed
  // as the service id; otherwise the modal opens without preselect.
  useEffect(() => {
    if (!autoTriggers || typeof document === 'undefined') return;
    const SELECTOR = '[data-clicka-book],[data-book-service],[data-book]';
    const handler = (ev: Event) => {
      const t = ev.target as Element | null;
      if (!t) return;
      const trigger = t.closest<HTMLElement>(SELECTOR);
      if (!trigger) return;
      ev.preventDefault();
      const raw =
        trigger.getAttribute('data-clicka-book') ??
        trigger.getAttribute('data-book-service') ??
        trigger.getAttribute('data-book') ??
        '';
      const service = raw && raw !== 'true' ? raw : undefined;
      open(service);
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [autoTriggers, open]);

  // ── URL ?service=… / ?book=1 auto-open (once, on first salon load) ─────
  useEffect(() => {
    if (!honorUrlParams || !salon || urlAutoOpenedRef.current) return;
    if (typeof location === 'undefined') return;
    const params = new URLSearchParams(location.search);
    const initial = params.get('service');
    if (initial || params.has('book')) {
      urlAutoOpenedRef.current = true;
      open(initial || undefined);
    }
  }, [honorUrlParams, salon, open]);

  const value = useMemo<BookingContextValue>(
    () => ({ open, close, isReady: !!salon, error, salon }),
    [open, close, salon, error],
  );

  return (
    <BookingContext.Provider value={value}>
      {children}
      {salon && slug ? (
        <BookingWidget
          ref={widgetRef}
          slug={slug}
          salon={salon}
          engineUrl={resolvedEngineUrl}
          locale={resolvedLocale}
          successUrl={resolvedSuccessUrl}
          cancelUrl={resolvedCancelUrl}
          accentGradient={accentGradient}
          formatPrice={formatPrice}
          onEvent={onEvent}
          basePath={basePath}
        />
      ) : null}
    </BookingContext.Provider>
  );
}
