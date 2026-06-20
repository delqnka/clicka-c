# Clicka Engine — Product Vision (Source of Truth)

> **For any AI agent (Claude, Codex, Cursor, etc.) reading this repo:** treat
> this document as the architectural constitution. When a request conflicts
> with anything below, stop and flag the conflict instead of defaulting to
> SaaS-shaped reasoning.

## Какво НЕ е този проект

Този проект **НЕ е SaaS платформа**.

Не продаваме:

- месечни абонаменти
- планове (Starter / Pro / Premium)
- trial периоди
- SMS пакети
- domain purchase
- domain billing
- marketplace за салони
- публичен каталог на салони
- профили в Clicka

Клиентът никога не трябва да се чувства като потребител на платформа.

## Какво Е този проект

Clicka е **white-label software engine**.

Той предоставя:

- Booking Engine
- Calendar Engine
- Client CRM
- Staff Management
- Admin Panel
- Stripe Connect integration
- Email notifications
- Custom domain management

Clicka е инфраструктура. Клиентът не трябва да знае, че Clicka съществува.

## Бизнес модел

Ние продаваме:

- custom website
- setup
- дизайн
- интеграция
- поддръжка

Ние **НЕ продаваме** достъп до платформа.

Всеки клиент получава собствен сайт. Примери:

- hairandart.bg
- paradise.bg
- salonurban.online

Клиентът купува сайт. Не купува акаунт в Clicka.

## Domain Philosophy

Домейнът се управлява от агенцията. Потокът е:

```
Клиент
  ↓ Плаща за сайт
Агенцията
  ↓ настройва домейна
  ↓ настройва DNS
  ↓ свързва сайта
```

Системата **може** да поддържа:

- domain connect
- DNS verification
- SSL verification

Системата **НЕ трябва** да поддържа:

- domain purchase
- domain checkout
- domain billing
- domain subscriptions

## Stripe Philosophy

Stripe се използва само за:

- клиентски депозити
- плащания към салона

Парите трябва да отиват директно към клиента чрез **Stripe Connect**.

Системата **НЕ трябва** да събира SaaS такси. Системата **НЕ трябва** да има:

- subscription billing
- plan renewals
- upgrade flows
- downgrade flows

## Booking Philosophy

Основната цел е:

```tsx
import { BookingWidget } from '@clicka/booking';

<BookingWidget salonSlug="paradise" />
```

Booking системата трябва да бъде reusable module. Не трябва да зависи от:

- clicka.bg
- iframe routing
- `/{slug}/book`
- marketing pages

Iframe widget е допустим само като fallback за WordPress или статични сайтове.
Основният сценарий е SDK.

## White-label Rule

Клиентът не трябва да вижда:

- clicka.bg
- Clicka branding
- Clicka emails
- Clicka URLs
- Clicka subdomains

Всички user-facing елементи трябва да използват:

- custom domain
- custom branding
- client-owned integrations

## Decision Filter

При всяка нова функционалност първо задавай въпроса:

> **"Това прави ли Clicka повече SaaS платформа?"**

Ако отговорът е "да", вероятно това е грешната посока.

Вторият въпрос е:

> **"Това помага ли на агенцията да доставя custom сайтове по-бързо?"**

Ако отговорът е "да", вероятно това е правилната посока.

## North Star

Целта **НЕ е**:

> "1000 салона да използват Clicka."

Целта **Е**:

> "Агенцията да може за минути да добавя Booking Engine към всеки нов custom сайт."

Clicka е engine. Сайтът е продуктът. Клиентът вижда сайта. Клиентът не вижда Clicka.
