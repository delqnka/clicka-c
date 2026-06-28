import type { OpeningDayRecord } from '@/lib/salon-opening-hours';
import type { BookingBlock } from '@/lib/booking-blocks';
import type { CancelPolicyAction } from '@/lib/cancellation-policy';

export type { OpeningDayRecord, BookingBlock };

export type OccupiedSlot = { time: string; duration: number };

export type BookingSuccessDetails = {
  serviceName: string;
  dateLabel: string;
  time: string;
};

export type PublicStaffMember = {
  id: string;
  name: string;
  slug: string;
  bio: string | null;
  avatarUrl: string | null;
  serviceIds: string[];
};

/** One bookable row — either a base service or an expanded variant. */
export type BookingServiceItem = {
  id: string;
  name: string;
  description?: string;
  duration: number;
  price?: number;
  category?: string;
  images?: string[];
  variants?: { label: string; price: number; duration?: number }[];
  payment_type?: 'none' | 'deposit' | 'full';
  deposit_amount?: number;
  cancel_policy_hours?: number;
  cancel_policy_action?: CancelPolicyAction;
};

export type UseBookingFlowOptions = {
  /** Tenant identifier — maps to /api/bookings?slug= */
  slug: string;
  openingHours: OpeningDayRecord;
  bookingBlocks: BookingBlock[];
  /** Minutes between bookable slot starts. Must be one of 15|20|30|45|60. */
  slotIntervalMin: number;
  /** How many calendar days ahead to allow bookings. */
  bookingAdvanceDays: number;
  /** Expanded flat list of bookable rows (variants already split out). */
  bookingServices: BookingServiceItem[];
  /** Engine origin for cross-domain API calls (Variant B separate repos). */
  engineUrl?: string;
  /** Optional public API key sent as `X-API-Key` to the engine. */
  apiKey?: string;
  /**
   * Absolute URL Stripe should redirect to after a successful payment.
   * Default: engine origin `/booking/success` (do NOT rely on this in a white-label client site).
   */
  successUrl?: string;
  /** Absolute URL Stripe should redirect to if the user cancels checkout. */
  cancelUrl?: string;
  /** BCP-47 locale used for the success-message date label. Default 'bg-BG'. */
  locale?: string;
  /**
   * Optional analytics callback. If provided, the SDK fires `booking_started`
   * and `booking_completed` here instead of touching window.fbq / gtag.
   */
  onEvent?: (
    name: 'booking_started' | 'booking_completed',
    payload?: { serviceName?: string; value?: number; currency?: string },
  ) => void;
};

export type UseBookingFlowReturn = {
  // Modal visibility
  bookingOpen: boolean;
  open: (serviceId?: string) => void;
  close: () => void;

  // Service selection
  selectedServiceIdxs: number[];
  toggleService: (idx: number) => void;
  totalDuration: number;
  totalPrice: number;
  selectedServices: BookingServiceItem[];

  // Date / time
  selectedDate: string;
  setDate: (d: string) => void;
  selectedTime: string;
  setTime: (t: string) => void;
  timeSlots: string[] | 'closed' | null;
  minDate: string;
  maxDate: string;

  // Contact fields
  clientName: string;
  setClientName: (v: string) => void;
  clientPhone: string;
  setClientPhone: (v: string) => void;
  clientEmail: string;
  setClientEmail: (v: string) => void;
  notes: string;
  setNotes: (v: string) => void;

  // Staff (TEAM plan)
  staffMembers: PublicStaffMember[];
  selectedStaffMemberId: string | null;
  setStaffMemberId: (id: string) => void;

  // Submission
  isSubmitting: boolean;
  bookingError: string;
  bookingSuccess: string;
  bookingSuccessDetails: BookingSuccessDetails | null;
  submit: (e: React.FormEvent) => Promise<void>;
};

export type BookingWidgetHandle = {
  open: (serviceId?: string) => void;
  close: () => void;
};

export type BookingWidgetProps = {
  /** Business slug used for all API calls. */
  slug: string;
  /** Raw salon record straight from DB / getPublicSalonPageData. */
  salon: Record<string, unknown>;
  /** Pre-processed opening hours. Derived from salon if omitted. */
  openingHours?: OpeningDayRecord;
  /** Pre-processed booking blocks. Derived from salon if omitted. */
  bookingBlocks?: BookingBlock[];
  /** Base path for /terms and /privacy links. Default: ''. */
  basePath?: string;
  /**
   * Origin of the booking engine API.
   * Set this when the client site is a SEPARATE repo from the engine.
   * Example: 'https://app.alternine.co'
   * Leave empty (default) when the site runs inside the engine repo.
   */
  engineUrl?: string;
  /** Optional public API key sent as `X-API-Key` to the engine. */
  apiKey?: string;
  /** CSS gradient string for accent fills. Defaults to a solid gradient from primaryColor. */
  accentGradient?: string;
  /**
   * Stripe success redirect URL (white-label: keep users on the salon's own domain).
   * Should land on a page that reads `?booking_id=` from the query string.
   */
  successUrl?: string;
  /** Stripe cancel redirect URL. */
  cancelUrl?: string;
  /** BCP-47 locale for date/label formatting. If omitted, falls back to `salon.language`. */
  locale?: string;
  /** Pluggable price formatter. Default: `${n} €`. */
  formatPrice?: (amount: number) => string;
  /** Analytics callback. If provided, replaces direct window.fbq / gtag calls. */
  onEvent?: (
    name: 'booking_started' | 'booking_completed',
    payload?: { serviceName?: string; value?: number; currency?: string },
  ) => void;
};
