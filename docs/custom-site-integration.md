# Custom Site Integration Playbook

Use this as the repeatable setup for every new salon client.

## Goal

The client gets:

- their own repository
- their own public domain
- their own design and content
- their own booking flow inside their site

The engine stays invisible and provides:

- bookings
- availability
- staff
- payments
- notifications
- admin data

Target shape:

```text
client-site repo
  -> @clicka/booking SDK
  -> engine public API
  -> branded admin on /admin
```

Example:

```text
paradise.bg         -> custom salon website repo
paradise.bg/admin   -> engine admin
```

## Current State

As of 2026-06-20, the public custom-site setup is working and the engine now
supports branded admin access on the client custom domain itself.

Confirmed working target:

- custom public site on its own repo and own domain
- booking widget or custom booking UI talking to engine public API
- booking confirmation emails from salon-owned sender settings
- admin login and password-reset flows on `<client-domain>/admin`

Example:

```text
paradise.bg       -> custom salon site repo
paradise.bg/admin -> engine admin
```

Platform-domain admin still remains available as fallback:

- `slug.<engine-root-domain>/admin`

## Architecture Rules

For every new client:

- public website lives in its own repo
- public website deploys to its own Vercel project
- public domain points to that public site project
- booking UI lives inside the public site
- admin lives in the engine project
- customers never need to see the engine brand or engine domain

Do not:

- point the client public domain at the engine project
- iframe engine public pages
- send customers to engine-hosted public booking pages
- build the whole salon site inside the engine repo

## The Slug

Every salon still needs a slug.

That does not make the product "SaaS-facing". The slug is just the internal
tenant key the engine uses to know which salon record to load.

Example:

- domain: `paradise.bg`
- internal slug: `paradise`

The slug can stay completely invisible to the customer.

## What Goes In The Client Repo

Every new salon repo should contain:

- homepage and service pages
- booking trigger buttons
- booking success page
- booking cancel page
- optional legal pages
- optional analytics hooks

It should not contain:

- admin database logic
- admin auth logic
- booking storage logic
- payment orchestration logic
- notification sending logic

Those stay in the engine.

## Environment Variables For The Client Site

Set these in the custom salon repo:

```bash
NEXT_PUBLIC_ENGINE_URL=https://engine.example.com
NEXT_PUBLIC_SALON_SLUG=paradise
```

Optional:

```bash
NEXT_PUBLIC_SITE_URL=https://paradise.bg
```

Use `NEXT_PUBLIC_SITE_URL` when you want Stripe success or cancel redirects to
return the customer to the exact client site domain after checkout.

If the salon does not use paid deposits or full online payment yet, this value
is optional.

## Environment Variables For The Engine

Set this in the engine deployment that should behave as backend plus admin only:

```bash
CLICKA_ENGINE_ONLY=1
```

This keeps the engine out of the role of public marketing site.

## Booking Integration Options

There are two valid ways to connect a new salon site.

### Option A: Use `@clicka/booking`

Best for:

- fastest delivery
- repeatable integration
- modal booking inside the salon site
- AI-generated salon sites where we want booking to work immediately

Install:

```bash
npm install @clicka/booking
```

Use this exact pattern:

```tsx
'use client';

import { BookingProvider, BookingButton } from '@clicka/booking';
import '@clicka/booking/styles.css';

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
  return <BookingButton>Резервирай</BookingButton>;
}
```

Or if the site already has its own button markup, keep the markup and only add
the attribute:

```tsx
<button data-clicka-book>Резервирай</button>
<button data-clicka-book="haircut">Резервирай подстригване</button>
```

This is the preferred path for new client sites.

Do not make AI build:

- custom booking database logic
- custom availability calculation
- custom payment orchestration
- custom booking form that posts somewhere else

The site should own the design and CTA placement.
Clicka should own the booking flow.

### Option B: Build Custom UI On Top Of The Public API

Best for:

- highly custom booking UX
- unusual flows
- fully tailored UI beyond the default widget behavior
- cases where we explicitly accept slower integration work

Use the engine only through the public endpoints.
If speed matters more than custom UX, do not choose this option.

## Public API Contract

The custom site should talk only to public engine endpoints:

- `GET /api/public/v1/salons/:slug/staff`
- `GET /api/public/v1/salons/:slug/slots?date=YYYY-MM-DD&staffMemberId=...`
- `POST /api/public/v1/salons/:slug/bookings`
- `POST /api/public/v1/salons/:slug/booking-checkout`

The old unversioned public routes should not be the long-term contract for new
client sites.

## Minimal Data Fetch Example

```ts
const engineUrl = process.env.NEXT_PUBLIC_ENGINE_URL!;
const slug = process.env.NEXT_PUBLIC_SALON_SLUG!;

const staffRes = await fetch(
  `${engineUrl}/api/public/v1/salons/${slug}/staff`,
  { cache: 'no-store' }
);

const staffData = await staffRes.json();
```

## Minimal Checkout Example

Use this only when the salon takes deposits or full payment online.

```ts
const checkoutRes = await fetch(
  `${engineUrl}/api/public/v1/salons/${slug}/booking-checkout`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      bookingId,
      serviceName: 'Haircut',
      amountEuros: 20,
      paymentType: 'deposit',
      returnUrl: process.env.NEXT_PUBLIC_SITE_URL,
    }),
  }
);

const { checkoutUrl } = await checkoutRes.json();
window.location.href = checkoutUrl;
```

## Required Pages In The Client Site

At minimum, add:

- `/booking/success`
- `/booking/cancel`

These pages belong to the salon repo, not the engine repo.

That keeps the customer on the salon brand even after Stripe checkout.

## Public Domain Setup

For each client:

1. Create the custom salon repo.
2. Deploy it as its own Vercel project.
3. Point the public domain to that project.

Example:

```text
paradise.bg -> Vercel project: salon-paradise
```

Do not point:

```text
paradise.bg -> engine project
```

That is exactly how you end up with a green deploy and the wrong site or a 404.

## Admin Setup

## Recommended Target

The clean long-term architecture is:

```text
paradise.bg -> salon repo
paradise.bg/admin -> engine admin
```

This is the best model for an agency setup because:

- the public site stays isolated
- you never mix public rendering with admin rendering
- every client keeps their own branded domain structure

## Current Supported Reality

The current engine code resolves admin access primarily from:

- the salon custom domain itself on `/admin`
- or the engine root-domain salon subdomain on `/admin`

So today the safest working admin path is:

```text
https://paradise.bg/admin
```

or, if using the engine platform domain:

```text
https://paradise.<engine-root-domain>/admin
```

If you still want:

```text
https://admin.paradise.bg
```

you should treat that as an optional extra host, not as the default delivery
path and not as a launch blocker.

## Login Flow

The admin login flow should be:

1. salon owner opens the admin URL
2. if owner account exists, they see sign-in
3. if no password exists yet, they receive a set-password link by email
4. after setting password, they enter the admin dashboard

Current routes already present in the engine:

- `/admin`
- `/admin/sign-in`
- `/admin/set-password`

## Email Setup Per Client

Use one Resend account with many verified domains.

Example:

```text
Resend account
  - paradise.bg
  - koketna.bg
  - bella.bg
```

Per salon record, store:

- `email_from_name`
- `email_from`
- `resend_domain`

Example:

```text
email_from_name = "Paradise Salon"
email_from = "noreply@paradise.bg"
resend_domain = "paradise.bg"
```

This lets each client send white-label confirmations from their own domain
without creating a separate Resend account for every client.

## New Client Creation Checklist

Use this exact order.

1. Create a new salon record in the engine.
2. Assign internal slug.
3. Set salon email sender fields.
4. Verify the client domain in Resend.
5. Create the custom site repo.
6. Deploy the custom site to its own Vercel project.
7. Add `NEXT_PUBLIC_ENGINE_URL`.
8. Add `NEXT_PUBLIC_SALON_SLUG`.
9. Add `NEXT_PUBLIC_SITE_URL` if checkout redirects are needed.
10. Integrate `@clicka/booking` or custom public API calls.
11. Add `/booking/success`.
12. Add `/booking/cancel`.
13. Point the public domain to the custom site project.
14. Set engine deployment to `CLICKA_ENGINE_ONLY=1`.
15. Use `paradise.bg/admin` as the client admin URL when a custom domain is active.
16. Keep `paradise.<engine-root-domain>/admin` as fallback.
17. test booking end to end
18. test confirmation email
19. test admin sign-in

## Five-Minute Repeatable Delivery Template

For each new salon, the repeatable package is:

```text
1. Duplicate site starter repo
2. Change branding, content, images, services
3. Set 2 to 3 env vars
4. Set salon slug in engine
5. Connect domain
6. Verify sender domain in Resend
7. Test booking
8. Hand off admin URL
```

## What To Hand Off To The Client

At handoff, the client should receive:

- their public website URL
- their admin URL
- their login email
- instructions for password setup or reset

They should not need:

- Vercel access
- database access
- engine project knowledge
- separate Resend account

unless you explicitly want to give that to them.

## QA Before Every Launch

Check all of this before go-live:

- public site opens on the right domain
- no engine branding is visible
- booking modal opens inside the site
- booking is created successfully
- confirmation email arrives from the salon domain
- payment redirect returns to the salon domain
- admin entry path works
- password reset email works
- legal links stay on the salon domain

## Short Rule To Remember

For every client:

```text
public website = client repo
booking flow = SDK + engine API
admin = engine
branding = client only
```
