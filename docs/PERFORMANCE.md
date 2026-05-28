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

**Measure a live salon:**

```bash
LIGHTHOUSE_URL=https://your-salon.clicka.bg node scripts/perf-report.mjs
```

Or Chrome DevTools → Performance / Lighthouse on mobile throttling.
