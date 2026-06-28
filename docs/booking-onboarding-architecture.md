# Booking Onboarding Architecture

This flow is intentionally split into two separate responsibilities.

## 1. Clicka Operator Flow

This happens inside Clicka, not inside the client site package.

Target:

- create the salon record
- save the slug
- return operator/admin access

Suggested flow:

1. open `/pa`
2. create salon
3. choose slug such as `diworks`
4. return the magic link or admin invite

Result:

- Clicka now knows what `diworks` is
- the booking package can safely use that slug

## 2. Client Site Integration Flow

This happens inside the client-owned site.

Target:

- install `@clicka1/booking`
- mount `BookingProvider`
- import the CSS bundle
- connect CTA buttons

Suggested DX:

```bash
npx @clicka1/clicka init
```

Then:

```tsx
import { BookingProvider, BookingButton } from '@clicka1/booking';
import '@clicka1/booking/styles.css';
```

And:

```tsx
<BookingProvider salonSlug="diworks" engineUrl="https://app.alternine.co">
  <BookingButton service="free-call">Book a Free Call</BookingButton>
</BookingProvider>
```

## 3. Optional Non-React Layer

For pure HTML sites, keep a separate static embed target such as:

```text
https://app.alternine.co/sdk/booking.js
```

That layer is complementary to the React package, not a replacement for the
operator flow.
