# @clicka/booking-sdk

Типизиран клиент за публичното `v1` API на Clicka booking engine. Ползва се от
white-label custom фронтенди (paradise.bg, hairandart.bg, …) за да резервират
часове срещу централния engine deploy.

Ако целта е най-бързо свързване на сайт за 5 минути, ползвай
`@clicka/booking`, не този пакет. `@clicka/booking-sdk` е за случаите, в които
съзнателно правим custom booking UI.

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
  engineUrl: 'https://www.clicka.bg',
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

## Какво вика пакетът

Клиентът ползва само versioned public endpoints:

- `GET /api/public/v1/salons/:slug`
- `GET /api/public/v1/salons/:slug/staff`
- `GET /api/public/v1/salons/:slug/slots?date=YYYY-MM-DD&staffMemberId=...`
- `POST /api/public/v1/salons/:slug/bookings`
- `POST /api/public/v1/salons/:slug/booking-checkout`

Има backward-compatible нормализация за `slots`, ако backend върне стария
`occupied[]` shape.

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

## Препоръка

Не карай Claude, Cursor или друг AI да генерира собствен booking form, ако не е
абсолютно нужно. За standard salon сайт е по-добре AI-то да прави само
маркетинг страниците и бутоните, а booking flow-ът да остане в `@clicka/booking`.
