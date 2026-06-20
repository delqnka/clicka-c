/**
 * @clicka/booking-sdk — typed client for the public booking API.
 *
 * Used by external white-label frontends to talk to a Clicka engine deploy
 * (Clicka.bg or any other branded instance). All requests include the
 * salon's API key in the `X-API-Key` header.
 *
 * Example:
 *   const client = createBookingClient({
 *     engineUrl: 'https://clicka.bg',
 *     apiKey: process.env.CLICKA_API_KEY!,
 *     salonSlug: 'paradise',
 *   });
 *   const salon = await client.getSalon();
 *   const slots = await client.getSlots({ date: '2026-07-01' });
 *   const booking = await client.createBooking({ ... });
 */
import type {
  PublicSalon,
  PublicSlot,
  PublicStaffMember,
  CreateBookingInput,
  CreateBookingResult,
  CheckoutInput,
  CheckoutResult,
} from './types';

export type BookingClientConfig = {
  /** Engine origin, e.g. "https://clicka.bg". No trailing slash required. */
  engineUrl: string;
  /** Public API key issued for this salon. Format: pk_live_… */
  apiKey: string;
  /** The salon's slug on the engine. */
  salonSlug: string;
  /** Optional fetch override (for testing or custom retry/timeout). */
  fetchImpl?: typeof fetch;
};

export type BookingClient = {
  getSalon(): Promise<PublicSalon>;
  getStaff(): Promise<PublicStaffMember[]>;
  getSlots(args: { date: string; staffMemberId?: string }): Promise<PublicSlot[]>;
  createBooking(input: Omit<CreateBookingInput, 'salonSlug'>): Promise<CreateBookingResult>;
  startCheckout(input: Omit<CheckoutInput, 'salonSlug'>): Promise<CheckoutResult>;
};

class BookingApiError extends Error {
  constructor(public status: number, public body: unknown, message: string) {
    super(message);
    this.name = 'BookingApiError';
  }
}

export function createBookingClient(config: BookingClientConfig): BookingClient {
  const base = config.engineUrl.replace(/\/$/, '');
  const slug = encodeURIComponent(config.salonSlug);
  const fetchImpl = config.fetchImpl ?? fetch;

  async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetchImpl(`${base}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': config.apiKey,
        ...(init?.headers ?? {}),
      },
    });
    const text = await res.text();
    const body = text ? safeJsonParse(text) : null;
    if (!res.ok) {
      const message =
        (body && typeof body === 'object' && 'error' in body && typeof (body as { error: unknown }).error === 'string')
          ? (body as { error: string }).error
          : `HTTP ${res.status}`;
      throw new BookingApiError(res.status, body, message);
    }
    return body as T;
  }

  return {
    async getSalon() {
      const data = await request<{ salon: PublicSalon }>(`/api/public/salons/${slug}`);
      return data.salon;
    },

    async getStaff() {
      const data = await request<{ staff: PublicStaffMember[] }>(`/api/public/salons/${slug}/staff`);
      return data.staff;
    },

    async getSlots({ date, staffMemberId }) {
      const params = new URLSearchParams({ date });
      if (staffMemberId) params.set('staffMemberId', staffMemberId);
      const data = await request<{ slots: PublicSlot[]; date: string }>(
        `/api/public/salons/${slug}/slots?${params.toString()}`,
      );
      return data.slots ?? [];
    },

    async createBooking(input) {
      try {
        const data = await request<{ bookingId: string; status: 'pending' | 'confirmed'; message?: string }>(
          `/api/public/bookings`,
          { method: 'POST', body: JSON.stringify({ ...input, salonSlug: config.salonSlug }) },
        );
        return { ok: true, bookingId: data.bookingId, status: data.status, message: data.message };
      } catch (err) {
        if (err instanceof BookingApiError) return { ok: false, error: err.message };
        throw err;
      }
    },

    async startCheckout(input) {
      try {
        const data = await request<{ checkoutUrl: string; sessionId: string }>(
          `/api/public/booking-checkout`,
          { method: 'POST', body: JSON.stringify({ ...input, salonSlug: config.salonSlug }) },
        );
        return { ok: true, checkoutUrl: data.checkoutUrl, sessionId: data.sessionId };
      } catch (err) {
        if (err instanceof BookingApiError) return { ok: false, error: err.message };
        throw err;
      }
    },
  };
}

function safeJsonParse(s: string): unknown {
  try { return JSON.parse(s); } catch { return null; }
}

export { BookingApiError };
