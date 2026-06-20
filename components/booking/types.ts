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
   * Example: 'https://engine.clicka.bg'
   * Leave empty (default) when the site runs inside the engine repo.
   */
  engineUrl?: string;
};

