declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

export type BookingEventData = {
  serviceName?: string;
  value?: number;   // EUR
  currency?: string;
};

// Session key — resets on new browser session (tab close)
const BOOKING_STARTED_KEY = 'tracking_booking_started';

export function trackPageView() {
  window.fbq?.('track', 'PageView');
  window.gtag?.('event', 'page_view');
}

export function trackViewContent() {
  window.fbq?.('track', 'ViewContent');
}

export function trackLead() {
  window.fbq?.('track', 'Lead');
  window.gtag?.('event', 'generate_lead');
}

export function trackSignUp() {
  window.fbq?.('track', 'CompleteRegistration');
  window.gtag?.('event', 'sign_up');
}

/**
 * Fires booking_started only once per browser session.
 * Resets after a successful booking_completed so a new attempt in the same
 * tab counts again — but 5 modal opens without booking = 1 event.
 */
export function trackBookingStarted() {
  if (typeof sessionStorage === 'undefined') return;
  if (sessionStorage.getItem(BOOKING_STARTED_KEY)) return;
  sessionStorage.setItem(BOOKING_STARTED_KEY, '1');
  window.gtag?.('event', 'booking_started');
}

export function trackBookingCompleted({ serviceName, value, currency = 'EUR' }: BookingEventData = {}) {
  // Reset so a second booking in the same session fires booking_started again
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.removeItem(BOOKING_STARTED_KEY);
  }

  const metaParams: Record<string, unknown> = {};
  if (value != null && value > 0) {
    metaParams.value = value;
    metaParams.currency = currency;
  }
  if (serviceName) metaParams.content_name = serviceName;

  // Standard Meta event — агенции, оптимизиращи по стандартни Facebook события
  window.fbq?.('track', 'Schedule', metaParams);
  // Custom Meta event — агенции с custom конверсии в Events Manager
  window.fbq?.('trackCustom', 'BookingCompleted', { ...metaParams, service_name: serviceName });

  const ga4Params: Record<string, unknown> = {};
  if (value != null && value > 0) {
    ga4Params.value = value;
    ga4Params.currency = currency;
  }
  if (serviceName) ga4Params.service_name = serviceName;

  window.gtag?.('event', 'booking_completed', ga4Params);
}

/**
 * Fires a test custom event visible in Meta Events Manager.
 * Use from the admin Marketing tab to verify the pixel is loaded.
 */
export function trackMetaTest() {
  if (!window.fbq) return false;
  window.fbq('trackCustom', 'ClickaTest', { source: 'admin_test' });
  return true;
}
