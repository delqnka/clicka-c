# New Client Site Manifest BG

Това е master документът за всеки нов сайт, който трябва да стане бързо,
чисто и без 2 дни booking проблеми.

Целта е:

- сайтът да е custom и бранднат
- booking-ът да тръгва за около 5 минути
- да няма custom booking backend
- да няма счупен integration flow

## Златното правило

Новият сайт е:

- public marketing site
- отделно repo
- отделен deploy
- отделен custom domain

Booking-ът не се прави наново.

Booking-ът винаги идва от Clicka engine-а.

## Какво трябва да съдържа един нов сайт

Всеки нов сайт трябва да има:

- homepage
- services page или services sections
- about section
- contact section
- booking CTA бутони
- по възможност `/booking/success`
- по възможност `/booking/cancel`

Ако сайтът е двуезичен:

- по възможност `/bg/booking/success`
- по възможност `/bg/booking/cancel`
- съдържанието да е последователно на двата езика

## Какъв да е стекът

Препоръчителният стек е:

- Next.js App Router
- React
- TypeScript по възможност
- отделен Vercel project

Ако AI-то ще генерира сайта:

- нека пише на TypeScript ако проектът е Next.js
- ако проектът е по-лек или static, JavaScript е ок

Правилото е:

- за Next.js client sites: TypeScript е предпочитан
- за по-прости static/Vite сайтове: JavaScript е ок, но booking wiring-ът трябва да е ясен

## На какъв език да е сайтът

Езикът на сайта е езикът на клиента.

Правило:

- ако салонът работи локално в България: първо `bg`, по желание и `en`
- ако таргетът е международен: първо `en`
- ако сайтът е двуезичен: booking CTA, success/cancel flow и admin wording да са консистентни

Не прави:

- смесен език
- половин BG / половин EN
- booking на един език и CTA на друг

## Какво AI-то няма право да прави

AI-то не трябва да прави:

- custom booking backend
- booking database tables
- availability engine
- slot generation logic
- custom checkout logic
- custom payment orchestration
- booking notifications logic
- отделен admin panel вътре в client site-а

Това е най-важното правило.

## Booking integration manifest

Всеки нов сайт трябва да е вързан така:

- пакет: `@clicka1/booking`
- root `BookingProvider`
- `apiKey` подаден изрично
- `engineUrl` подаден изрично
- `salonSlug` подаден изрично
- CTA бутони с `BookingButton` или `data-clicka-book`

## Задължителни env променливи

За Next.js сайт:

```env
NEXT_PUBLIC_ENGINE_URL=https://your-engine-domain.com
NEXT_PUBLIC_BOOKING_API_KEY=pk_live_xxxxxxxxxxxxxxxxx
NEXT_PUBLIC_SALON_SLUG=your-salon-slug
NEXT_PUBLIC_SITE_URL=https://clientdomain.com
```

За Vite сайт:

```env
VITE_ENGINE_URL=https://your-engine-domain.com
VITE_BOOKING_API_KEY=pk_live_xxxxxxxxxxxxxxxxx
VITE_SITE_URL=https://clientdomain.com
```

## Минимален provider за Next.js

```tsx
'use client';

import { BookingProvider } from '@clicka1/booking';
import '@clicka1/booking/styles.css';

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <BookingProvider
      salonSlug={process.env.NEXT_PUBLIC_SALON_SLUG}
      engineUrl={process.env.NEXT_PUBLIC_ENGINE_URL}
      apiKey={process.env.NEXT_PUBLIC_BOOKING_API_KEY}
      successUrl={`${process.env.NEXT_PUBLIC_SITE_URL}/booking/success`}
      cancelUrl={`${process.env.NEXT_PUBLIC_SITE_URL}/booking/cancel`}
    >
      {children}
    </BookingProvider>
  );
}
```

## Минимален provider за Vite / island script

```tsx
import { BookingProvider } from '@clicka1/booking';
import '@clicka1/booking/styles.css';

<BookingProvider
  salonSlug="your-salon-slug"
  engineUrl={import.meta.env.VITE_ENGINE_URL}
  apiKey={import.meta.env.VITE_BOOKING_API_KEY}
  successUrl={`${import.meta.env.VITE_SITE_URL}/booking/success`}
  cancelUrl={`${import.meta.env.VITE_SITE_URL}/booking/cancel`}
>
  {children}
</BookingProvider>
```

## Как се инсталира за 5 минути

Най-бързият вариант:

```bash
npx @clicka1/clicka@latest init
```

Това е правилният default path за нов site repo.

Ако трябва ръчно:

```bash
npm install @clicka1/booking
```

AI-то не трябва да гадае откъде идва booking integration-ът.

Винаги използвай едно от тези:

```bash
npx @clicka1/clicka@latest init
```

или:

```bash
npm install @clicka1/booking
```

Не прави:

- custom booking implementation
- друг booking npm package
- copy/paste booking код от стар проект

После:

1. import-ваш `@clicka1/booking/styles.css`
2. слагаш `BookingProvider` близо до root-а
3. подаваш `salonSlug`, `engineUrl`, `apiKey`
4. правиш CTA бутони с `BookingButton` или `data-clicka-book`
5. правиш success/cancel страници
6. слагаш env-овете
7. redeploy

Тези success/cancel страници са силно препоръчителни за чист white-label flow
на клиентския домейн. Engine-ът има fallback поведение, но branded client
pages дават по-добър UX.

## 5-минутен onboarding ред

1. Създай салона в `/pa`
2. Задай правилен slug
3. Издай API key
4. Сложи env в client site-а
5. Инсталирай `@clicka1/booking`
6. Монтирай `BookingProvider`
7. Вържи CTA бутоните
8. Redeploy
9. Тествай booking

## Exact AI prompt

```text
Build a premium client website in Next.js App Router.

This project is only the public marketing site.

Important architecture rules:

1. Do NOT build a custom booking backend.
2. Do NOT build booking tables, slot logic, availability logic, checkout logic, or payment orchestration.
3. Booking must use the existing Clicka package `@clicka1/booking`.
4. Install the booking integration from npm with `npm install @clicka1/booking` or run `npx @clicka1/clicka@latest init`.
5. Do NOT invent another booking package.
6. Do NOT write a custom booking implementation.
7. Add one root `BookingProvider` near the top of the app tree.
8. Pass these values explicitly to the provider:
   - `salonSlug`
   - `engineUrl`
   - `apiKey`
   - `successUrl`
   - `cancelUrl`
9. Read these env vars:
   - `NEXT_PUBLIC_ENGINE_URL`
   - `NEXT_PUBLIC_BOOKING_API_KEY`
   - `NEXT_PUBLIC_SALON_SLUG`
   - `NEXT_PUBLIC_SITE_URL`
10. Strongly prefer creating these pages for a white-label return flow:
   - `/booking/success`
   - `/booking/cancel`
11. Every booking CTA should either:
   - use `BookingButton` from `@clicka1/booking`, or
   - keep the custom button markup and add `data-clicka-book`
12. Do not build a separate admin frontend inside the client site project.
13. Keep the design fully custom, branded, mobile-first, and production-ready.
14. The site should be easy to connect in about 5 minutes after code generation.

Implementation target:

- use `@clicka1/booking`
- install it from npm or via `npx @clicka1/clicka@latest init`
- import `@clicka1/booking/styles.css`
- mount `BookingProvider` once
- pass `apiKey` explicitly
- keep the rest of the site fully custom

Success means:

- the site looks fully custom
- booking opens through Clicka
- no custom booking backend was created
- no duplicate booking form exists
- integration can be finished in about 5 minutes by setting env vars
```

## Final QA before launch

Провери:

1. modal-ът отваря ли се
2. salon fetch минава ли
3. slots зареждат ли се
4. booking submit минава ли
5. success/cancel работят ли
6. няма ли `401`
7. няма ли `404`

## Най-честите причини за провал

- грешен `salonSlug`
- липсващ `apiKey`
- provider без `apiKey` prop
- Vite сайт с `NEXT_PUBLIC_*` вместо `VITE_*`
- AI е направил собствен booking flow
- липсва redeploy след env промяна

## Финално правило

Сайтът е custom.

Booking-ът е Clicka.

Не ги смесвай.
