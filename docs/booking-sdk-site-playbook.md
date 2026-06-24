# Booking SDK Site Playbook

Use this document when building any new client site that should use the Clicka
booking modal.

This is the repeatable process whether the site is built by hand, with Claude,
with Codex, or with another AI tool.

## North Star

Every client site should be:

- a separate repo
- a separate Vercel project
- a separate custom domain
- visually custom
- connected to Clicka for booking without rebuilding booking logic

The site owns:

- branding
- layout
- pages
- CTA placement
- copy
- visuals

Clicka owns:

- salon record
- services
- staff
- availability
- booking creation
- checkout flow
- notification flow

## The 2-Part Rule

Do not mix these two responsibilities.

### Part 1. Create the salon in Clicka

This happens in Clicka first.

Required outcome:

- salon exists in the `salons` table
- salon has the correct slug
- salon is active

Example:

- brand: `DiWorks`
- slug: `diworks`

If this part is wrong, the modal will fail with:

```text
Salon fetch failed: HTTP 404
```

### Part 2. Connect the site to the salon slug

This happens in the client site repo.

Required outcome:

- `@clicka1/booking` is installed
- the site wraps its app with `BookingProvider`
- CTA buttons open the modal
- env vars point to the correct slug

## Required Site Conditions

Any site that should work with the booking SDK must meet these conditions.

### Tech shape

Preferred:

- Next.js App Router
- React site
- own repo

Best path:

- `npx @clicka1/clicka@latest init`

### Required env vars

```bash
NEXT_PUBLIC_ENGINE_URL=https://www.clicka.bg
NEXT_PUBLIC_SALON_SLUG=diworks
NEXT_PUBLIC_SITE_URL=https://clientdomain.com
```

Optional but commonly useful:

```bash
NEXT_PUBLIC_BOOKING_SERVICE_ID=free-call
```

### Required pages

Every site should have:

- `/booking/success`
- `/booking/cancel`

If the site is bilingual, also add:

- `/bg/booking/success`
- `/bg/booking/cancel`

### Required CTA behavior

Every booking CTA should do one of these:

- use `BookingButton`
- use `useBooking().open(...)`
- keep the custom button markup and add `data-clicka-book`

The site should not send booking traffic to:

- Calendly
- Fresha
- email
- a separate Clicka-hosted public page

unless that is an intentional temporary fallback.

## Minimal Integration Pattern

### Root provider

```tsx
'use client';

import { BookingProvider } from '@clicka1/booking';
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
```

### Button option A

```tsx
import { BookingButton } from '@clicka1/booking';

<BookingButton service="free-call">Book a Free Call</BookingButton>;
```

### Button option B

```tsx
<button data-clicka-book="free-call">Book a Free Call</button>
```

### Button option C

```tsx
'use client';

import { useBooking } from '@clicka1/booking';

export function CustomButton() {
  const { open } = useBooking();

  return (
    <button type="button" onClick={() => open('free-call')}>
      Book a Free Call
    </button>
  );
}
```

## Exact Implementation Steps For Every New Site

Follow this order.

### Step 1. Create the salon in Clicka

Before touching the site:

1. create the salon from `/pa`
2. set the final slug
3. make sure it is active
4. verify the slug is the one you will use in env

### Step 2. Build the site without custom booking backend logic

The site may be fully custom, but do not build:

- booking tables
- booking database logic
- slot generation logic
- staff availability logic
- checkout logic
- booking notification logic

### Step 3. Prepare the site structure

Make sure the site has:

- a root layout or app shell
- booking success page
- booking cancel page
- clear CTA buttons

### Step 4. Install the SDK

```bash
npm install @clicka1/booking
```

Or use the CLI:

```bash
npx @clicka1/clicka@latest init
```

### Step 5. Wrap the app with `BookingProvider`

Mount it once near the root of the public site.

### Step 6. Connect CTA buttons

Choose one integration style and use it consistently:

- `BookingButton`
- `useBooking()`
- `data-clicka-book`

### Step 7. Add env vars in Vercel

Set:

- `NEXT_PUBLIC_ENGINE_URL`
- `NEXT_PUBLIC_SALON_SLUG`
- `NEXT_PUBLIC_SITE_URL`

Then redeploy.

### Step 8. Build locally

Before deploy:

```bash
npm install
npm run build
```

### Step 9. Test on live

Verify:

1. CTA opens modal
2. modal stays on the site
3. success redirect works
4. cancel redirect works
5. no email fallback appears unless intentionally configured

## Prompt Requirements For AI-Generated Sites

Use the rules below whenever Claude, Codex, Cursor, or another AI builds a new
site.

### What the prompt must say

The prompt must clearly say:

- this is a public marketing site only
- booking must use the existing Clicka booking SDK
- do not build a custom booking backend
- do not build custom booking database logic
- add booking CTA buttons
- add booking success and cancel pages
- keep the design custom but the booking orchestration reusable

### Copy-paste prompt

```text
Build a premium client website in Next.js App Router.

Important implementation rules:

1. This repo is only the public website.
2. Do NOT build a booking backend.
3. Do NOT build your own availability engine, booking database, payment logic, or booking API routes.
4. Booking must use the existing package `@clicka1/booking`.
5. Add one root `BookingProvider`.
6. Import `@clicka1/booking/styles.css`.
7. All booking CTA buttons must use one of these:
   - `BookingButton`
   - `useBooking().open(...)`
   - `data-clicka-book`
8. Read these env vars:
   - `NEXT_PUBLIC_ENGINE_URL`
   - `NEXT_PUBLIC_SALON_SLUG`
   - `NEXT_PUBLIC_SITE_URL`
9. Add these pages:
   - `/booking/success`
   - `/booking/cancel`
10. If the site is bilingual, add localized booking success and cancel pages too.
11. Keep the design fully custom, but leave all booking orchestration to Clicka.
12. Do not create a separate admin frontend in this repo.
13. The site must be easy to connect in minutes once the slug exists in Clicka.

Success means:

- fully custom branded site
- booking opens inside the site
- no external booking platform redirect
- no duplicate booking backend
- setup is finished mostly by env vars and CTA wiring
```

## Red Flags

If you see any of these, stop and fix them before launch.

- the site opens `mailto:` instead of the modal
- the site redirects to Calendly, Fresha, or another external booking tool
- the site creates its own booking backend
- the slug in Vercel does not match the slug in Clicka
- the salon exists in DB but is not active
- the button works locally but not on live because env changes were not redeployed
- the modal fails with `Salon fetch failed: HTTP 404`

## Fast Debug Flow

### Symptom: button opens email

Check:

1. is `NEXT_PUBLIC_SALON_SLUG` present on live
2. does the site have the latest deploy
3. is the CTA intentionally coded to fallback to email

### Symptom: console says `Salon fetch failed: HTTP 404`

Check:

1. does the slug exist in `salons`
2. is the slug exactly the same as the env value
3. is `is_active = true`

Useful query:

```sql
SELECT id, slug, name, is_active, custom_domain
FROM salons
WHERE slug = 'diworks';
```

### Symptom: modal still does not open after slug fix

Check:

1. redeploy happened after env change
2. browser console for provider error
3. CTA is actually using the SDK and not an old mailto link

## Final Rule

When building client sites fast with AI, keep this boundary strict:

- the AI builds the website
- Clicka handles the booking engine

That is what keeps delivery fast, repeatable, and much less fragile.
