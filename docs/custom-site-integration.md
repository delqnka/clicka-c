# Custom Site Integration

Use this checklist for every new client site.

## Environment

Set these in the custom frontend project:

```bash
NEXT_PUBLIC_ENGINE_URL=https://your-engine-domain.com
NEXT_PUBLIC_SALON_SLUG=client-slug
```

The custom site should not render engine branding or link users to the engine
domain.

Set this in the engine deployment:

```bash
CLICKA_ENGINE_ONLY=1
```

## Fetch Public Data

```ts
const engineUrl = process.env.NEXT_PUBLIC_ENGINE_URL!;
const slug = process.env.NEXT_PUBLIC_SALON_SLUG!;

const salonRes = await fetch(`${engineUrl}/api/public/salons/${slug}`);
const { salon } = await salonRes.json();

const staffRes = await fetch(`${engineUrl}/api/public/salons/${slug}/staff`);
const { staff } = await staffRes.json();
```

## Check Occupied Slots

```ts
const res = await fetch(
  `${engineUrl}/api/public/salons/${slug}/slots?date=2026-06-20`
);
const { occupied } = await res.json();
```

The custom frontend owns the design and can compute visible slot buttons from
working hours, services, staff, and occupied ranges.

## Create Booking

```ts
await fetch(`${engineUrl}/api/public/bookings`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    salonSlug: slug,
    clientName: 'Client Name',
    clientPhone: '+359...',
    clientEmail: 'client@example.com',
    serviceName: 'Haircut',
    servicePrice: 40,
    serviceDuration: 45,
    date: '2026-06-20',
    time: '10:30',
  }),
});
```

## Start Payment Checkout

For paid bookings, pass the custom site's origin as `returnUrl`. Stripe will
send the customer back to the custom domain, not the engine domain.

```ts
const checkoutRes = await fetch(`${engineUrl}/api/public/booking-checkout`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    salonSlug: slug,
    bookingId,
    serviceName: 'Haircut',
    amountEuros: 20,
    paymentType: 'deposit',
    returnUrl: window.location.origin,
  }),
});

const { checkoutUrl } = await checkoutRes.json();
window.location.href = checkoutUrl;
```

## Browser Helper

For non-Next/custom static sites:

```html
<script
  src="https://your-engine-domain.com/engine-client.js"
  data-engine-url="https://your-engine-domain.com"
  data-salon="client-slug"
></script>
```

```js
const engine = window.BookingEngine.client;
const { salon } = await engine.getSalon();
await engine.createBooking({
  clientName: 'Client Name',
  clientPhone: '+359...',
  clientEmail: 'client@example.com',
  serviceName: 'Haircut',
  servicePrice: 40,
  serviceDuration: 45,
  date: '2026-06-20',
  time: '10:30',
});

const { checkoutUrl } = await engine.createCheckout({
  bookingId: 'booking-id',
  serviceName: 'Haircut',
  amountEuros: 20,
  paymentType: 'deposit',
});
```

## Drop-In Booking Widget

For a fast no-code style install, add this script and mark any button with
`data-book`. The modal is rendered on the client site and talks only to
`/api/public`; it does not iframe engine pages.

```html
<script
  src="https://your-engine-domain.com/widget.js"
  data-engine-url="https://your-engine-domain.com"
  data-salon="client-slug"
></script>

<button data-book>Book online</button>
```

Optional service preselect:

```html
<button data-book data-service="service-id">Book haircut</button>
```

## Rules

- The custom site controls all public design and copy.
- Do not iframe engine pages for production client sites.
- Do not send public users to engine-hosted salon pages.
- Keep the engine domain out of visible navigation and page content.
