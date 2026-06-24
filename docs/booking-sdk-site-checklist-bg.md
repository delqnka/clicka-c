# Booking SDK Checklist BG

Кратък вътрешен checklist за всеки нов сайт, който ще ползва Clicka booking
модала.

## 1. Първо в Clicka

Преди да връзваш сайта:

- създай salon в `/pa`
- задай финален slug
- провери `is_active = true`
- провери slug-а да е точно този, който ще сложиш във Vercel

Пример:

- бранд: `DiWorks`
- slug: `diworks`

Ако slug-ът е грешен, модалът няма да тръгне и ще видиш:

```text
Salon fetch failed: HTTP 404
```

## 2. Изисквания към сайта

Сайтът трябва да е:

- отделно repo
- отделен Vercel project
- със собствен домейн
- Next.js App Router по възможност

Сайтът не трябва да съдържа:

- custom booking backend
- custom booking database logic
- custom availability logic
- custom payment flow
- custom booking notifications

## 3. Задължителни env променливи

Във Vercel:

```bash
NEXT_PUBLIC_ENGINE_URL=https://www.clicka.bg
NEXT_PUBLIC_SALON_SLUG=diworks
NEXT_PUBLIC_SITE_URL=https://clientdomain.com
```

По желание:

```bash
NEXT_PUBLIC_BOOKING_SERVICE_ID=free-call
```

След промяна на env:

- винаги нов redeploy

## 4. Задължителни страници

Всеки сайт трябва да има:

- `/booking/success`
- `/booking/cancel`

Ако е двуезичен:

- `/bg/booking/success`
- `/bg/booking/cancel`

## 5. Най-бързият integration flow

В client site repo:

```bash
npx @clicka1/clicka@latest init
```

Или ръчно:

```bash
npm install @clicka1/booking
```

После:

- import на `@clicka1/booking/styles.css`
- един `BookingProvider` високо в app tree
- CTA бутоните да отварят booking modal

## 6. Позволени CTA варианти

Използвай едно от тези:

### Вариант A

```tsx
import { BookingButton } from '@clicka1/booking';

<BookingButton service="free-call">Book a Free Call</BookingButton>;
```

### Вариант B

```tsx
<button data-clicka-book="free-call">Book a Free Call</button>
```

### Вариант C

```tsx
import { useBooking } from '@clicka1/booking';

const { open } = useBooking();
<button onClick={() => open('free-call')}>Book a Free Call</button>;
```

## 7. Какво трябва да кажеш на AI-то

В prompt-а винаги казвай:

- това е само public marketing site
- booking трябва да ползва `@clicka1/booking`
- да не се прави custom booking backend
- да не се правят custom booking API routes
- да има booking CTA бутони
- да има success/cancel страници
- да има root `BookingProvider`

## 8. Най-честите грешки

### Бутонът отваря email

Провери:

- има ли `NEXT_PUBLIC_SALON_SLUG`
- има ли redeploy след env промяна
- има ли fallback логика към `mailto:`

### Console показва `Salon fetch failed: HTTP 404`

Провери:

- съществува ли slug-ът в `salons`
- съвпада ли slug-ът във Vercel с slug-а в DB
- активен ли е salon-ът

### Локално работи, live не работи

Провери:

- Production env във Vercel
- последния deploy
- дали domain и slug не са разместени

## 9. Минимален QA преди launch

Провери:

1. CTA бутонът отваря modal
2. няма redirect към външен booking tool
3. success page работи
4. cancel page работи
5. booking остава вътре в сайта
6. няма `HTTP 404` в console

## 10. Финално правило

AI-то прави сайта.

Clicka прави booking engine-а.

Не ги смесвай.
