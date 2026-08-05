# Clicka Engine — Buyer Handoff

Практически документ за разработчик/предприемач, който придобива този кодбейз.
Целта е нулев guesswork в първия работен ден.

## Какво придобиваш

- Пълния Git repo (`Templates-CLicka`) с 730+ commits история
- Публикуван npm пакет `@clicka1/booking` (React SDK, drop-in booking widget)
- Next.js 14 App Router monorepo с админ панел, публично API v1, Telegram bot
- Neon Postgres схема с всички миграции в [db/](../db/)
- Stripe Connect интеграция (клиентски депозити → директно към салона)
- Per-salon Resend email конфигурация (encrypted API keys)
- Deployment конфигурация за Vercel ([vercel.json](../vercel.json))
- Sentry инструментация за prod monitoring

## Какво НЕ придобиваш автоматично

- Съществуващи клиентски договори — прехвърлянето изисква съгласие на всеки салон
- Stripe платформа account на продавача — купувачът си създава свой Connect платформа
- Neon база с реални клиентски данни — прехвърлянето изисква GDPR-compliant процес
- Vercel account/проекти — купувачът си настройва свои
- Domain портфолио (агенцията купува домейни ръчно) — това е ops практика, не asset
- Custom дизайни за конкретни клиентски сайтове (те са в отделни repo-та)

## Product философия — задължително четиво

**Преди всичко останало прочети [docs/project-vision.md](project-vision.md).**

Кодбейзът е дизайниран около една конкретна теза: **Clicka не е SaaS платформа**,
а white-label engine, който агенция вгражда в custom клиентски сайтове.
Нарушаването на тази теза (например добавяне на public marketing pages, plan upgrade
flows, subscription billing към клиентите) счупва фундамента и обезсмисля голяма част
от архитектурните решения (per-salon Resend, per-salon Stripe Connect, custom domain
без platform subdomain).

Ако купувачът иска да преработи в SaaS — това е валиден бизнес избор, но означава
на практика нов проект върху този кодбейз, не еволюция.

## Технически стак

| Слой | Технология | Забележка |
|---|---|---|
| Runtime | Next.js 14 App Router | React 18/19 compatible |
| Hosting | Vercel | Cron jobs изискват Pro план |
| Database | Neon Postgres (serverless) | HTTP driver с retry — [lib/db.ts](../lib/db.ts) |
| Payments | Stripe Connect | Per-salon accounts, не platform-level billing |
| Email | Resend | Per-salon, encrypted keys — [lib/encryption.ts](../lib/encryption.ts) |
| Auth (owners) | Custom session cookies | [db/admin-auth.sql](../db/admin-auth.sql) |
| Monitoring | Sentry | Client + server + edge configs в root |
| SDK | tsup + Tailwind | Публикуван като `@clicka1/booking` |

## Капацитет — реалистична оценка

Тестван до няколко салона в production. Архитектурно скалира далеч отвъд това:

| Инфраструктура | Месечна цена (USD) | Реалистичен таван |
|---|---|---|
| Vercel Pro + Neon Launch | ~$40 | 50–100 салона |
| Vercel Pro + Neon Scale | ~$90 | 200–500 салона |
| Vercel Pro + Neon Business | ~$700 | 1000–3000 салона |

**Реалният soft cap не е технически, а операционен**: всеки нов клиент изисква ръчна
DNS настройка от агенцията (по [project-vision.md](project-vision.md) — умишлено).
При 200+ клиента ще ти трябва dedicated ops човек.

## Известни ограничения (пълно разкриване)

Тези неща са реални и купувачът ще ги забележи сам. Изброявам ги честно, за да не
губим време в преговорите.

### 1. `salon_id` е `text` без FK

По исторически причини (backwards compat с миграция от друг тип primary key)
`salon_id` е `text` навсякъде, без foreign key към `salons.id`. Работи, но:

- Няма `ON DELETE CASCADE` — изтриване на салон оставя orphan записи
- Няма референтна цялост на DB ниво — разчита на app logic

За малък мащаб това не е проблем. За скалиране към стотици клиенти е добра идея да
се въведе proper FK — миграция от 1 ден с careful backfill.

### 2. Няма migrations tracker

Миграциите в [db/](../db/) са свободни `.sql` файлове, не се tracker-ват с
`drizzle-kit` / `prisma migrate` / подобно. Кои са приложени в production се знае
по конвенция, не програмно.

Препоръка: първата седмица след придобиване, въведи `drizzle-kit` или `node-pg-migrate`.

### 3. Cron jobs са глобално разположени във времето

[vercel.json](../vercel.json) crons се стартират в фиксиран UTC час. Работи за
единствен пазар (България). При expansion към други часови зони, cron-овете
трябва да са per-salon aware.

### 4. Артефакти от предишен SaaS pivot

Миграциите `migration-plan-billing.sql` и `migration-plan-lifecycle.sql` съществуват
исторически, но `migration-cleanup-saas.sql` ги drop-ва. Кодът вече не ги референцира
(проверено с grep). Оставени са за исторически audit, не за rollback.

### 5. `CAST(salon_id AS text)` на много места

Query pattern-ът има CAST-ове, които понякога пречат на index използване. За
малък мащаб не е проблем; за 100+ клиента заслужава `EXPLAIN ANALYZE` audit.

## Първи 7 дни след придобиване — препоръчан план

1. **Ден 1**: Прочети [project-vision.md](project-vision.md) и този документ. Setup
   локална среда: `.env.local` от продавача, `npm install`, `npm run dev`.
2. **Ден 2**: Настрой собствен Stripe Connect платформа account, собствен Neon
   проект, собствен Vercel team. Прехвърли DNS на `clicka.bg` (ако включен в сделката).
3. **Ден 3**: Пусни всички миграции от [db/](../db/) в реда, в който са в git log-а.
   Приложи и новата [migration-bookings-scale-indexes.sql](../db/migration-bookings-scale-indexes.sql).
4. **Ден 4**: Deploy на staging. Тествай booking flow end-to-end с тест Stripe акаунт.
5. **Ден 5**: Настрой Sentry с твои DSN-и. Провери, че error tracking работи.
6. **Ден 6**: Прегледай `scripts/audit-white-label.mjs` и го пусни — увери се, че
   няма Clicka branding в user-facing surfaces.
7. **Ден 7**: Ако сделката включва прехвърляне на клиенти, започни client migration
   разговори (нужно е тяхно съгласие, не се прави автоматично).

## Ключови файлове за навигация

- [docs/project-vision.md](project-vision.md) — архитектурна конституция
- [CLAUDE.md](../CLAUDE.md) — TL;DR за AI агенти
- [lib/db.ts](../lib/db.ts) — DB access с retry logic
- [lib/encryption.ts](../lib/encryption.ts) — per-salon Resend keys
- [sdk/booking/src/index.ts](../sdk/booking/src/index.ts) — публичен SDK surface
- [app/api/public/v1/](../app/api/public/v1/) — публичен API (за widget-а)
- [app/api/bookings/route.ts](../app/api/bookings/route.ts) — основен booking endpoint
- [vercel.json](../vercel.json) — cron jobs и headers

## Environment variables (задължителни)

Пълен списък е в `.env.example` (ако липсва — reference от продавача).
Ключови:

- `DATABASE_URL` — Neon Postgres
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` — платформа Stripe
- `RESEND_ENCRYPTION_KEY` — за декриптиране на per-salon API keys
- `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN` — error tracking
- `TELEGRAM_BOT_TOKEN` — за админ Telegram интеграцията
- `NEXT_PUBLIC_APP_URL` — за link генериране в emails

## Поддръжка и въпроси

Продавачът се задължава на [X дни / часа] safety net поддръжка след прехвърлянето
(договори конкретно). Извън това — купувачът е самостоятелен.

За архитектурни въпроси: първо провери git log-а. 730+ commits, повечето с ясни
съобщения, обясняват "защо" зад всяко решение.
