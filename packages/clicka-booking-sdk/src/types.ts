/** Shape of the salon profile returned by GET /api/public/salons/:slug */
export type PublicSalon = {
  id: string;
  slug: string;
  name: string;
  category: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  address: string | null;
  about: string | null;
  cover_image_url: string | null;
  logo_image_url: string | null;
  gallery_images: unknown[];
  instagram_username: string | null;
  facebook_username: string | null;
  google_maps_url: string | null;
  working_hours: Record<string, { open: string; close: string; closed: boolean }>;
  opening_hours: unknown;
  services: unknown[];
  team: unknown[];
  template_id: number | null;
  primary_color: string | null;
  primary_color_light: string | null;
};

export type PublicStaffMember = {
  id: string;
  slug: string;
  name: string;
  role: string | null;
  photoUrl: string | null;
  serviceSlugs: string[];
};

/**
 * A time window already taken on the salon's calendar for a given date.
 * Returned by `getSlots()` so external UIs can mark these as unavailable
 * when rendering a slot grid generated from the salon's working hours.
 * `start` / `end` are Sofia local time without timezone suffix.
 */
export type PublicSlot = {
  start: string;
  end: string;
  available: false;
};

export type CreateBookingInput = {
  salonSlug: string;
  serviceSlug: string;
  staffMemberId?: string;
  startsAt: string;       // ISO datetime
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  notes?: string;
};

export type CreateBookingResult = {
  ok: true;
  bookingId: string;
  status: 'pending' | 'confirmed';
  message?: string;
} | {
  ok: false;
  error: string;
};

export type CheckoutInput = {
  salonSlug: string;
  serviceSlug: string;
  staffMemberId?: string;
  startsAt: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  successUrl: string;
  cancelUrl: string;
};

export type CheckoutResult = {
  ok: true;
  checkoutUrl: string;
  sessionId: string;
} | {
  ok: false;
  error: string;
};
