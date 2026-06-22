/**
 * Clicka Admin — design tokens.
 *
 * Single source of truth for colors, radii, spacing, motion used inside
 * `/admin/*`. Consumers must NOT write raw hex codes — import from here.
 * See `docs/admin-design-system.md` for usage rules and accent policy.
 */

export const tokens = {
  color: {
    bg: '#FFFFFF',
    surface: '#FFFFFF',
    surfaceMuted: '#FAFAFA',
    border: '#E5E3DE',
    borderStrong: '#D4D4D8',

    text: '#18181B',
    muted: '#71717A',
    subtle: '#A1A1AA',

    /** Primary CTA — neutral black. Use everywhere unless brand moment. */
    primary: '#18181B',
    primaryHover: '#27272A',
    primaryText: '#FFFFFF',

    /**
     * Brand gradient — pink → magenta → violet.
     * RESERVED for logo wordmark and mobile nav active state ONLY.
     * Do not use on CTAs, badges, or section backgrounds.
     */
    accent: {
      from: '#E11D48',
      mid: '#DB2777',
      to: '#A855F7',
      solid: '#DB2777',
    },

    success: { bg: '#D1FAE5', text: '#065F46', accent: '#10B981' },
    info:    { bg: '#DBEAFE', text: '#1E40AF', accent: '#3B82F6' },
    warning: { bg: '#FEF3C7', text: '#92400E', accent: '#F59E0B' },
    danger:  { bg: '#FEE2E2', text: '#991B1B', accent: '#EF4444' },
  },

  gradient: {
    /** Logo + brand moments only. See accent policy. */
    brand: 'linear-gradient(135deg, #E11D48 0%, #DB2777 50%, #A855F7 100%)',
  },

  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    pill: 999,
  },

  /** 8-point grid. */
  space: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
  },

  shadow: {
    sm: '0 1px 2px rgba(15,23,42,0.06), 0 1px 1px rgba(15,23,42,0.04)',
    md: '0 4px 12px -4px rgba(15,23,42,0.18), 0 1px 2px rgba(15,23,42,0.10)',
    lg: '0 10px 28px -8px rgba(15,23,42,0.28), 0 2px 4px rgba(15,23,42,0.14)',
    /** Primary CTA elevation. */
    primary:
      '0 1px 0 rgba(255,255,255,0.08) inset, 0 4px 12px -4px rgba(15,23,42,0.35), 0 1px 2px rgba(15,23,42,0.16)',
    primaryHover:
      '0 1px 0 rgba(255,255,255,0.10) inset, 0 8px 18px -6px rgba(15,23,42,0.40), 0 2px 4px rgba(15,23,42,0.18)',
  },

  motion: {
    fast: '120ms ease',
    base: '160ms ease',
    slow: '240ms cubic-bezier(0.4, 0, 0.2, 1)',
  },

  layout: {
    sidebarWidth: 196,
    contentMaxWidth: 960,
    headerHeightDesktop: 56,
    headerHeightMobile: 52,
    mobileBottomInset: 'calc(96px + env(safe-area-inset-bottom, 0px))',
  },

  z: {
    base: 1,
    header: 10,
    sticky: 20,
    dropdown: 30,
    overlay: 40,
    modal: 50,
    toast: 60,
  },
} as const;

/**
 * Status config for booking badges. Keep in sync with admin design system.
 */
export const BOOKING_STATUS_PALETTE = {
  pending:   { bg: tokens.color.warning.bg, text: tokens.color.warning.text, dot: tokens.color.warning.accent },
  confirmed: { bg: tokens.color.info.bg,    text: tokens.color.info.text,    dot: tokens.color.info.accent },
  completed: { bg: tokens.color.success.bg, text: tokens.color.success.text, dot: tokens.color.success.accent },
  cancelled: { bg: tokens.color.danger.bg,  text: tokens.color.danger.text,  dot: tokens.color.danger.accent },
} as const;

/**
 * Back-compat shim — existing components use `T.text`, `T.border`, etc.
 * Phase 2 will migrate them to read directly from `tokens`. Until then, keep
 * this alias so a single file move doesn't ripple through 4000 lines.
 */
export const T = {
  bg: tokens.color.bg,
  surface: tokens.color.surface,
  border: tokens.color.border,
  text: tokens.color.text,
  muted: tokens.color.muted,
  subtle: tokens.color.subtle,
  accent: tokens.color.primary,
  radius: tokens.radius.md,
  radiusLg: tokens.radius.lg,
  radiusSm: tokens.radius.sm,
} as const;
