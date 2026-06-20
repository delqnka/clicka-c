# @clicka/booking-sdk

Типизиран клиент за публичното API на Clicka booking engine. Ползва се от
white-label custom фронтенди (paradise.bg, hairandart.bg, …) за да резервират
часове срещу централния engine deploy.

## Инсталиране

```bash
npm install @clicka/booking-sdk
```

(пакетът е workspace-local; за публикуване в private npm registry виж раздел
"Publishing" по-долу)

## Бърз старт

```ts
import { createBookingClient } from '@clicka/booking-sdk';

const client = createBookingClient({
  engineUrl: 'https://clicka.bg',
  apiKey:    process.env.CLICKA_API_KEY!,   // pk_live_…
  salonSlug: 'paradise',
});

const salon  = await client.getSalon();
const slots  = await client.getSlots({ date: '2026-07-01' });

const result = await client.createBooking({
  serviceSlug: 'haircut',
  staffMemberId: 'staff_123',
  startsAt:    '2026-07-01T10:00:00.000Z',
  clientName:  'Иван Иванов',
  clientPhone: '+359888123456',
  clientEmail: 'ivan@example.com',
});

if (result.ok) console.log('Booking created:', result.bookingId);
else console.error('Failed:', result.error);
```

## API ключове

Всеки салон има own API key в таблицата `public_api_keys`. Издава се от
платформения админ еднократно (никога не се пази plaintext — само sha256).
Engine-ът enforce-ва ключа когато `REQUIRE_PUBLIC_API_KEY=1` е сетнат.

## Scopes

- `read` — `getSalon`, `getStaff`, `getSlots`
- `book` — `createBooking`, `startCheckout`

## Грешки

`BookingApiError` се хвърля при HTTP грешка. Методите `createBooking` и
`startCheckout` обвиват грешките в `{ ok: false, error: string }`.

## TODO (следваща итерация)

- Bundle на `<BookingWidget>` React компонент (изисква standalone билд)
- React hook wrappers (`useSlots`, `useSalon`)
- Webhook receiver helpers
