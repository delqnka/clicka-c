# Clicka Admin — Design System

Living document. Source of truth for visual decisions inside the admin
dashboard (`/admin/*`). If something contradicts this doc, fix the code, not
the doc.

## Принципи

1. **Admin ≠ marketing.** Дашбордът се ползва ежедневно. Нисък визуален шум,
   неутрален primary, accent-ите са "moments", не "noise".
2. **Един source of truth.** Цветове, радиуси, sentiment палитри живеят в
   `lib/admin-theme.ts`. Никакви raw hex кодове в компонентите.
3. **CSS преди JS за стил.** Hover, focus, media queries и keyframes —
   `app/admin/admin-mobile.css`. `style={{}}` се ползва само за стойности,
   които зависят от runtime state.

## Accent policy

Розовият gradient (`#e11d48 → #db2777 → #a855f7`) има право да се появи
**САМО** в следните точки:

- Logo wordmark в header-а
- Mobile bottom nav active state (icon background)
- Brand moments в marketing surfaces (НЕ в админа)

Навсякъде другаде:

- Primary CTA → `tokens.color.primary` (`#18181B`, zinc-900)
- Secondary / ghost → transparent + 1px border
- Destructive → `tokens.color.danger.*`
- Success → `tokens.color.success.*`
- Info → `tokens.color.info.*`

## Sentiment палитри

Status badges и toast-ове ползват фиксирани двойки bg/text — никакви
ad-hoc цветове.

| Sentiment | bg        | text      | accent    |
| --------- | --------- | --------- | --------- |
| neutral   | `#FAFAFA` | `#18181B` | `#71717A` |
| success   | `#D1FAE5` | `#065F46` | `#10B981` |
| info      | `#DBEAFE` | `#1E40AF` | `#3B82F6` |
| warning   | `#FEF3C7` | `#92400E` | `#F59E0B` |
| danger    | `#FEE2E2` | `#991B1B` | `#EF4444` |

## Типография

- Семейство: Manrope (`--font-client-manrope`)
- Heading weight: 700, `letter-spacing: -0.025em`
- Body weight: 400 (на `<p>`, `<label>`, `<li>` → 300)
- Meta / small: 200
- Бутон label: 600, `letter-spacing: -0.01em`

## Радиуси

- `tokens.radius.sm` = 8 (бутони, инпути, small surfaces)
- `tokens.radius.md` = 12 (cards, panels)
- `tokens.radius.lg` = 16 (modals, hero surfaces)
- 999 (pill) — само за full-width form CTAs (sign-in pattern)

## Spacing

8-point grid. Padding/margin стойности са кратни на 4 или 8. Виж
`tokens.space` за стандартни стъпки.

## Motion

- Default duration: 160ms hover / 200ms enter / 300ms layout
- Easing: `ease` за hover, `cubic-bezier(0.4, 0, 0.2, 1)` за enter/exit
- Уважавай `prefers-reduced-motion: reduce` — всички анимации до 0.01ms

## Focus

Всеки interactive елемент трябва да има видим `:focus-visible` outline.
Текущ ring: `box-shadow: 0 0 0 3px rgba(24,24,27,0.12)` + border darken.
Никакъв `outline: none` без заместване.

## Какво НЕ правим в админа

- Розови / лилави gradient-и върху бутони, badge-ове, секции
- Glass / blur на повече от 2 повърхности едновременно
- Drop shadows над 24px blur (визуален шум)
- Icon-only бутони без `aria-label`
- Inline `style` за hover / focus (използвай CSS класове)
- `isMobile` JS check за layout — само за behavior (sheet vs modal etc.)
