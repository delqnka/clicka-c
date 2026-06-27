# @clicka1/booking

White-label booking widget for salon sites powered by the Clicka engine API.

## What This Package Does

- makes booking easy to attach inside a React or Next.js site
- keeps the booking UX inside the client-owned website
- talks to Clicka only through the public engine API

This package does **not** create the salon tenant in Clicka.

That is a separate operator flow:

1. create the salon in Clicka from `/pa`
2. choose and save the slug
3. return the operator/admin magic link
4. use that slug in the client site integration

Example:

- salon created in Clicka: `diworks`
- client site integration uses: `salonSlug="diworks"`

## Install

```bash
npm install @clicka1/booking
```

Peer deps: `react ^18 || ^19`, `react-dom ^18 || ^19`, `lucide-react`.

## Recommended DX

### Fastest Manual Setup

```tsx
'use client';

import { BookingProvider, BookingButton } from '@clicka1/booking';
import '@clicka1/booking/styles.css';

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <BookingProvider
      salonSlug={process.env.NEXT_PUBLIC_SALON_SLUG}
      engineUrl={process.env.NEXT_PUBLIC_ENGINE_URL}
      successUrl={`${process.env.NEXT_PUBLIC_SITE_URL}/booking/success`}
      cancelUrl={`${process.env.NEXT_PUBLIC_SITE_URL}/booking/cancel`}
    >
      {children}
    </BookingProvider>
  );
}

export function HeroCta() {
  return <BookingButton service="free-call">Book a Free Call</BookingButton>;
}
```

### One-Command Onboarding

```bash
npx @clicka1/clicka init
```

The `clicka init` flow is meant to:

- add `@clicka1/booking`
- add the CSS import
- mount a provider near the app root
- add the required env placeholders
- make CTA wiring straightforward

## Environment Variables

Supported engine env names:

- `NEXT_PUBLIC_ENGINE_URL`
- `NEXT_PUBLIC_CLICKA_ENGINE`
- `NEXT_PUBLIC_CLICKA_API_URL`

Recommended client-site envs:

```bash
NEXT_PUBLIC_ENGINE_URL=https://www.clicka.bg
NEXT_PUBLIC_SALON_SLUG=diworks
NEXT_PUBLIC_SITE_URL=https://diworks.example
```

## Usage

```tsx
'use client';

import { BookingProvider, BookingButton } from '@clicka1/booking';
import '@clicka1/booking/styles.css';

export function Root({ children }: { children: React.ReactNode }) {
  return (
    <BookingProvider salonSlug="my-salon" engineUrl="https://www.clicka.bg">
      {children}
      <BookingButton>Book now</BookingButton>
    </BookingProvider>
  );
}
```

If you already have your own button markup, keep it and add the attribute:

```tsx
<button data-clicka-book>Book now</button>
<button data-clicka-book="free-call">Book a Free Call</button>
```

## API surface

### `BookingProvider`

| Prop | Type | Notes |
| --- | --- | --- |
| `salonSlug?` | `string` | Salon tenant slug. Falls back to env, meta tag, or `window` globals. |
| `engineUrl?` | `string` | Clicka engine origin. Falls back to env, meta tag, or `window` globals. |
| `locale?` | `string` | BCP-47 locale. Defaults from `<html lang>`, then browser locale. |
| `successUrl?` | `string` | Stripe success redirect on the client-owned site. |
| `cancelUrl?` | `string` | Stripe cancel redirect on the client-owned site. |
| `accentGradient?` | `string` | Accent styling override. |
| `formatPrice?` | `(n: number) => string` | Custom formatter. |
| `onEvent?` | `(name, payload?) => void` | Booking analytics hook. |
| `basePath?` | `string` | Prefix for legal links. |
| `autoTriggers?` | `boolean` | Enables `[data-clicka-book]` click delegation. Default: `true`. |
| `honorUrlParams?` | `boolean` | Auto-opens for `?service=` or `?book=1`. Default: `true`. |

### `BookingButton`

| Prop | Type | Notes |
| --- | --- | --- |
| `service?` | `string` | Pre-selects this service on open. |
| `...buttonProps` | `React.ButtonHTMLAttributes<HTMLButtonElement>` | Keeps consumer classes, styles, and handlers. |

### Advanced

The raw `BookingWidget` export still exists for custom control over state and
rendering.

## Engine API requirements

The SDK calls **only** these versioned public endpoints — `engineUrl + path`:

- `GET  /api/public/v1/salons/:slug/staff`
- `GET  /api/public/v1/salons/:slug/slots?date=YYYY-MM-DD&staffMemberId=…`
- `POST /api/public/v1/salons/:slug/bookings`
- `POST /api/public/v1/salons/:slug/booking-checkout`

All endpoints respond with permissive CORS (`Access-Control-Allow-Origin: *`).

## Styling

The widget ships a pre-compiled Tailwind CSS bundle (`dist/booking.css`). Import
it once at the top of your app or inside the component tree:

```ts
import '@clicka1/booking/styles.css';
```

No Tailwind config is required in the consumer project. The bundle is scoped to
utilities the widget actually uses.

## License

Public package for Clicka-powered client-site integrations.
