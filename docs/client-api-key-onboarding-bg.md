# Client API Key Onboarding BG

Кратък вътрешен документ за това как връзваме нов клиентски сайт към Clicka
booking engine-а чрез `public_api_keys`.

Ползвай този flow за всеки нов salon сайт, който има собствен frontend, но
ползва централния Clicka backend за booking.

## Какво даваш и какво не даваш

Даваш на клиента:

- сайта
- дизайна
- текстовете
- `@clicka1/booking-sdk` или `@clicka1/booking`
- API key

Не даваш:

- Clicka backend кода
- базата за booking
- server env-овете
- логиката за availability, checkout, notifications, payments

Правилото е просто:

- frontend = клиентът може да го държи
- backend = остава при теб
- API key = ти решаваш дали работи

## Как работи моделът

Сайтът на клиента праща `X-API-Key` към Clicka.

Clicka проверява в `public_api_keys`:

- има ли такъв ключ
- revoke-нат ли е
- има ли нужните `scopes`

Ако всичко е наред:

- read заявките работят
- booking заявките работят

Ако ключът е revoke-нат:

- сайтът стои
- дизайнът стои
- booking flow-ът спира

## 5-стъпков onboarding за нов клиент

## 1. Създай salon в Clicka

Преди да вързваш сайта:

- създай salon в `/pa`
- задай финален `slug`
- провери `is_active = true`

Пример:

- brand: `Paradise`
- slug: `paradise`

## 2. Генерирай API key

Форматът е:

```txt
pk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

От него ти трябват 3 неща:

- `plaintext` key
- `sha256` hash
- `prefix`

Пример:

```txt
plaintext: pk_live_O-N5xJN-Spezf0w9UPpIkK6bUIlJXgaM
hash:      91a4ab7dde029d5f49eba108c5aabd6f8b0998c1c8171650b1021177b4ef1364
prefix:    pk_live_O-N5
```

## 3. Запиши ключа в базата

В базата пазиш само hash-а, никога plaintext ключа.

```sql
INSERT INTO public_api_keys (
  salon_id,
  key_prefix,
  key_hash,
  label,
  scopes
)
VALUES (
  'REAL_SALON_ID',
  'pk_live_O-N5',
  '91a4ab7dde029d5f49eba108c5aabd6f8b0998c1c8171650b1021177b4ef1364',
  'paradise.bg production',
  ARRAY['read','book']::text[]
);
```

Полезни полета:

- `label` = домейн + среда
- `scopes` = обикновено `read` и `book`

## 4. Сложи plaintext ключа в клиентския сайт

В `.env` на client site:

```env
NEXT_PUBLIC_BOOKING_API_KEY=pk_live_O-N5xJN-Spezf0w9UPpIkK6bUIlJXgaM
NEXT_PUBLIC_BOOKING_ENGINE_URL=https://app.alternine.co
```

Ако сайтът е със SDK:

```ts
import { createBookingClient } from '@clicka1/booking-sdk';

const client = createBookingClient({
  engineUrl: process.env.NEXT_PUBLIC_BOOKING_ENGINE_URL!,
  apiKey: process.env.NEXT_PUBLIC_BOOKING_API_KEY!,
  salonSlug: 'paradise',
});
```

След това SDK-то ще удря:

- `GET /api/public/v1/salons/:slug`
- `GET /api/public/v1/salons/:slug/staff`
- `GET /api/public/v1/salons/:slug/slots`
- `POST /api/public/v1/salons/:slug/bookings`
- `POST /api/public/v1/salons/:slug/booking-checkout`

## 5. QA преди launch

Провери:

1. `GET salon` работи
2. staff/slots се зареждат
3. booking заявката минава
4. success/cancel flow-ът работи
5. няма `401 Unauthorized` при активен ключ

## Как спираш клиент при неплащане

Най-простият вариант:

```sql
UPDATE public_api_keys
SET revoked_at = now()
WHERE salon_id = 'REAL_SALON_ID'
  AND revoked_at IS NULL;
```

От този момент:

- сайтът продължава да се зарежда
- booking UI може да се отвори
- backend-ът спира да приема booking заявки

Ако искаш да активираш пак ключа:

```sql
UPDATE public_api_keys
SET revoked_at = NULL
WHERE salon_id = 'REAL_SALON_ID';
```

## Най-важното правило

Не продаваш "цялата система".

Продаваш:

- custom сайт
- достъп до твоя booking engine

Достъпът е контролиран чрез API key, а API key-ът е под твой контрол.

Това е архитектурният lock-in:

- без правни заплахи
- без да им чупиш сайта
- без да им сваляш файлове

Просто revoke-ваш ключа и booking-ът спира.
