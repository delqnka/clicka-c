# Prompt For Claude / Cursor / Codex

Use this prompt when generating a new client salon site so the site is ready to
connect to Clicka in minutes instead of rebuilding booking from scratch.

```text
Build a premium salon website in Next.js for a real client brand.

Important architecture rules:

1. This website is only the public marketing site.
2. Do NOT build your own booking backend.
3. Do NOT build your own booking form logic, availability engine, calendar logic, payment flow, or database tables for bookings.
4. Booking must be handled by the existing Clicka SDK integration.
5. Install the booking integration from npm with `npm install @clicka1/booking` or use `npx @clicka1/clicka@latest init`.
6. Do NOT invent another booking package.
7. Do NOT write a custom booking implementation.
8. The site must include clear CTA buttons like "Резервирай", "Запази час", "Book now".
9. Every booking CTA should either:
   - use a `BookingButton` component from `@clicka1/booking`, or
   - keep the existing visual button markup and add `data-clicka-book`
10. Add one root `BookingProvider` near the top of the app tree.
11. Read these env vars:
   - `NEXT_PUBLIC_ENGINE_URL`
   - `NEXT_PUBLIC_BOOKING_API_KEY`
   - `NEXT_PUBLIC_SALON_SLUG`
   - `NEXT_PUBLIC_SITE_URL`
12. Strongly prefer creating these pages for a white-label return flow:
   - `/booking/success`
   - `/booking/cancel`
13. Keep the design fully custom and brand-focused, but leave booking orchestration to Clicka.
14. The public site keeps the branded admin entry on the same domain:
   - `clientdomain.com` = public site
   - `clientdomain.com/admin` = Clicka admin/engine
15. Do not build a separate admin frontend inside the client site project.
16. The code should be clean, production-ready, mobile-first, and easy to connect.

Implementation target:

- Use `@clicka1/booking`
- Install it from npm or via `npx @clicka1/clicka@latest init`
- Import `@clicka1/booking/styles.css`
- Mount `<BookingProvider />` once
- Use `BookingButton` or `data-clicka-book` on CTA buttons
- Keep the rest of the site custom

Success means:

- the site looks fully custom
- booking opens through Clicka
- no custom booking backend was created
- no duplicate booking form exists
- integration can be finished in about 5 minutes by setting env vars
```

## Minimal Integration Shape

```tsx
'use client';

import { BookingProvider, BookingButton } from '@clicka1/booking';
import '@clicka1/booking/styles.css';

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <BookingProvider
      salonSlug={process.env.NEXT_PUBLIC_SALON_SLUG}
      engineUrl={process.env.NEXT_PUBLIC_ENGINE_URL}
      apiKey={process.env.NEXT_PUBLIC_BOOKING_API_KEY}
      successUrl={`${process.env.NEXT_PUBLIC_SITE_URL}/booking/success`}
      cancelUrl={`${process.env.NEXT_PUBLIC_SITE_URL}/booking/cancel`}
    >
      {children}
    </BookingProvider>
  );
}

export function HeroCta() {
  return <BookingButton>Резервирай</BookingButton>;
}
```
