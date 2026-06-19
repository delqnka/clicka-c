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
```

## Rules

- The custom site controls all public design and copy.
- Do not iframe engine pages for production client sites.
- Do not send public users to engine-hosted salon pages.
- Keep the engine domain out of visible navigation and page content.
