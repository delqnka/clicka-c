# Performance notes (Clicka salon + admin)

## What we optimized

- **Admin dashboard**: tab panels code-split (`lazy-admin-tabs`), deferred bookings filters, memoized service editor with per-row local draft + debounced commit.
- **Public salon page**: `DeferredSection` for portfolio, team, reviews, map; WebP URL hints via `publicImageUrl`; booking modals loaded with `next/dynamic`.
- **Uploads**: client-side WebP prep in `lib/client-image-prep.ts`.
- **API**: `/api/admin/verify` marked `force-dynamic` so `next build` does not hit Neon during static generation.

## Measure locally

```bash
npm run type-check
node scripts/perf-report.mjs
```

Optional Lighthouse against a deployed URL:

```bash
LIGHTHOUSE_URL=https://your-salon.example node scripts/perf-report.mjs
```

## Production Web Vitals

For real LCP/INP/CLS from users, use [Vercel Speed Insights](https://vercel.com/docs/speed-insights) or the [`web-vitals`](https://github.com/GoogleChrome/web-vitals) package reporting to your analytics endpoint.

## Bundle checks

After `npm run build`, inspect the route table in the terminal output for `/admin` and `/[slug]` first-load JS. Compare before/after when adding heavy client components.

### Client salon page (`/[slug]`) — reference (May 2026)

| Metric | Value |
|--------|--------|
| Route JS (page shell) | ~177 B |
| First Load JS | ~108 kB (incl. ~88 kB shared) |
| Salon-specific client chunk | ~20 kB over shared |

**Already in place:** LCP image preload (WebP hints), hero `fetchPriority="high"`, booking modals code-split, `DeferredSection` for portfolio/team/reviews/map/offers/services, `content-visibility: auto` on `.cv-defer`, `/api/image` AVIF/WebP via `Accept`, lazy below-fold images.

**Image delivery (May 2026):** widths snap to allowed sizes (`lib/image-delivery.ts`) so portfolio/hero never accidentally request full 2K originals. `/api/image` skips Sharp when no resize is needed; new uploads use `R2_PUBLIC_URL` CDN when configured (`NEXT_PUBLIC_R2_PUBLIC_URL` in client).

**LCP (May 2026):** Hero uses **`next/image` `priority`** on the R2 source URL — Vercel serves resized WebP via `/_next/image` (edge cache). Do not load raw JPEG from R2 on LCP. Re-upload cover photos to get WebP + `-lcp-640.webp` sidecar. `SalonLcpHead` preconnects R2 only; preload is handled by `next/image`.

**CSS / fonts (salon public):** Route groups `(salon-public)` / `(marketing)` each load a **scoped Tailwind bundle** (`salon.css` vs `marketing-tailwind.css`) via `@config` — salon pages no longer ship marketing utilities. Root `globals.base.css` has tokens/reset only. `x-clicka-salon-public` → Manrope only (not 5 marketing Google fonts). Marketing plain CSS in `app/(marketing)/marketing.css`. `experimental.optimizeCss` + critters. Hero critical CSS inlined in `SalonHeroLcp`.

**Home `/` routing (May 2026):** Middleware rewrites apex `/` → `/marketing-home`, custom domain `/` → `/salon-home` (each route group loads its own CSS).

**LCP sidecar (May 2026):** Upload generates `-lcp-640.webp`; `SalonHeroLcp` prefers `heroLcpVariantUrl()` (direct R2) with `<link rel="preload">` in `SalonLcpHead`. Re-upload cover photos for existing salons without sidecars.

**Cache invalidation (May 2026):** `revalidateSalonPublicCache()` on publish, site-settings PATCH, site-images PATCH — tags `salon-public-{slug}`, subdomain host, custom domain.

## Admin save slowness audit (Jun 2026)

### Root causes (before fix)

| Issue | Impact |
|--------|--------|
| `loadAdminSiteDataBySlug()` on every save (often **twice**) | Full salon row + large JSON (`services`, `gallery_images`, `portfolio_images`) parsed twice per click |
| `ALTER TABLE … ADD COLUMN IF NOT EXISTS` on hot path | Extra Neon round-trip on **every** load/save |
| `ensureSmsSchema()` awaited inside load | DDL batch on cold start, coupled to reads |
| Services auto-`UPDATE` on read when JSON shape differs | Hidden write on every full load |
| `resolveAdminGate` always queried primary owner | +1 DB query on every authenticated API call |
| `revalidateSalonPublicCache()` **before** HTTP response | Blocks response on many `revalidatePath` / `revalidateTag` calls |

### Fixes applied

- Schema migrations moved into `ensureAdminAuthSchema()` (once per instance).
- Auth: session checked **before** `getPrimaryOwnerForSalon` when cookie present.
- PATCH routes return only changed fields; client merges into `site` state (no full reload).
- Images PATCH uses `loadAdminImageFieldsBySlug()` (5 columns only).
- Public cache invalidation deferred via `deferRevalidateSalonPublicCache()` + `runAfterResponse`.

### Still heavier (expected)

- **Blog save**: N upserts + delete orphans (unchanged; already defers revalidate).
- **Image upload**: client WebP prep + R2 upload before PATCH.
- **Domain connect**: external DNS/Vercel API.
- **Google Calendar / reviews**: third-party APIs.

**Measure a live salon:**

```bash
LIGHTHOUSE_URL=https://your-salon.example.com node scripts/perf-report.mjs
```

Or Chrome DevTools → Performance / Lighthouse on mobile throttling.
