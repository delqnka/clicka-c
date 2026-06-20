# @clicka/booking

White-label booking widget for salon sites powered by the Clicka engine API.

## Install

```bash
npm install @clicka/booking
```

Peer deps: `react ^18`, `react-dom ^18`, `lucide-react`.

## Usage

```tsx
'use client';

import { BookingWidget, type BookingWidgetHandle } from '@clicka/booking';
import '@clicka/booking/styles.css';
import { useRef } from 'react';

export function BookNowButton({ salon }: { salon: Record<string, unknown> }) {
  const ref = useRef<BookingWidgetHandle>(null);

  return (
    <>
      <button onClick={() => ref.current?.open()}>Book now</button>
      <BookingWidget
        ref={ref}
        slug="my-salon"
        salon={salon}
        engineUrl="https://engine.example.com"
        successUrl="https://my-salon.com/booking/success"
        cancelUrl="https://my-salon.com/booking/cancel"
        locale="en-US"
        formatPrice={(n) => `$${n.toFixed(2)}`}
        onEvent={(name, payload) => analytics.track(name, payload)}
      />
    </>
  );
}
```

## API surface

| Prop           | Type                                                      | Notes                                                                 |
| -------------- | --------------------------------------------------------- | --------------------------------------------------------------------- |
| `slug`         | `string`                                                  | Salon tenant identifier. Used in every public API request.            |
| `salon`        | `Record<string, unknown>`                                 | Raw salon record (services, opening hours, primary color, language).  |
| `engineUrl`    | `string`                                                  | Origin of the engine API (`https://engine.clicka.bg`).                |
| `successUrl?`  | `string`                                                  | Stripe success redirect. Keep users on the salon's own domain.        |
| `cancelUrl?`   | `string`                                                  | Stripe cancel redirect.                                               |
| `locale?`      | `string`                                                  | BCP-47, e.g. `'en-US'`. Defaults to `salon.language` or `'bg-BG'`.    |
| `formatPrice?` | `(n: number) => string`                                   | Custom price formatter. Default: `${n} €`.                            |
| `accentGradient?` | `string`                                              | CSS gradient for accent fills. Default: solid `primaryColor`.         |
| `onEvent?`     | `(name, payload?) => void`                                | Replaces internal `fbq`/`gtag` calls. Receives `booking_started` and `booking_completed`. |
| `basePath?`    | `string`                                                  | Prefix for `/terms` and `/privacy` legal links.                       |

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
import '@clicka/booking/styles.css';
```

No Tailwind config is required in the consumer project. The bundle is scoped to
utilities the widget actually uses.

## License

UNLICENSED — internal Clicka agency use.
