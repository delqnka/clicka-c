# White-Label Engine Plan

## North Star

Clicka is the invisible software engine behind each client's custom site.

Clients and end customers should not need to know Clicka exists. Public client
sites are separate projects with their own domain, design, copy, assets, and
frontend code. They use Clicka only through backend APIs.

## Target Shape

- `clicka-c`: backend engine, admin, database, booking, calendar, payments,
  notifications, and internal operations.
- Client sites: separate Next.js projects, one per client.
- Public integration: stable `/api/public/*` endpoints and optional white-label
  booking widget.
- No production dependency on Clicka public salon middleware for client domains.
- No Clicka branding in customer-facing booking flows.

## 5-Minute Client Connection

1. Create the client salon record in the engine.
2. Deploy the engine with public Clicka UI disabled:
   - `CLICKA_ENGINE_ONLY=1`
3. Set the client site's environment variables:
   - `NEXT_PUBLIC_ENGINE_URL`
   - `NEXT_PUBLIC_SALON_SLUG`
   - `NEXT_PUBLIC_SITE_URL`
4. Mount `BookingProvider` from `@clicka1/booking`.
5. Put `BookingButton` or `data-clicka-book` on the public CTA buttons.
6. The custom site reads only versioned public endpoints when custom UI is needed.

## Public API Contract

- `GET /api/public/v1/salons/:slug`
- `GET /api/public/v1/salons/:slug/staff`
- `GET /api/public/v1/salons/:slug/slots?date=YYYY-MM-DD&staffMemberId=...`
- `POST /api/public/v1/salons/:slug/bookings`
- `POST /api/public/v1/salons/:slug/booking-checkout`

These endpoints are the contract for all custom client frontends.

## Migration Rules

- Do not add new client public sites inside `clicka-c`.
- Do not route client domains through `middleware.ts`.
- Keep legacy public salon routes only during migration.
- New client frontend work belongs in a separate repo/project.
- Admin/backend improvements stay in `clicka-c`.

## Current Gaps

- `clicka-c` still contains marketing/public salon frontend routes.
- Some public components and legal content expose Clicka branding.
- Legacy public frontend routes are hidden in engine-only deployments, but still
  exist in the repo during migration.
- Admin and notification copy still contains Clicka references in several
  places. This is acceptable only for internal/testing deployments until the
  admin brand layer is made configurable.
- Legacy booking management pages remain on the engine domain for old email
  links. New custom sites should use `returnUrl` and client-owned confirmation
  pages.

## Execution Order

1. Add `/api/public` contract.
2. Build a headless booking client/helper for custom sites.
3. Convert Paradise/Barber to consume only `/api/public`.
4. Remove client-site routing from `middleware.ts`.
5. Keep admin white-label capable through client-owned domains and branded `/admin` paths.
6. Later split marketing/internal platform UI from the engine if needed.

## Engine-Only Mode

Set `CLICKA_ENGINE_ONLY=1` on engine deployments that should not expose Clicka
marketing or legacy public salon pages. This hides:

- marketing/legal pages in `app/(marketing)`
- legacy salon public routes in `app/(salon-public)`
- in-repo custom site experiments in `app/(sites)`
- development preview/test pages

Admin, platform admin, API routes, booking management routes, and static engine
integration files remain available.

## Guardrail Check

Run this before deploys that are meant to behave as the invisible engine:

```bash
npm run audit:white-label
```

The check fails if the old middleware returns, if the drop-in widget starts
using iframe-based engine pages again, or if the neutral public helper regresses
to old Clicka-specific attributes.

## Next White-Label Phase

1. Add configurable engine/admin display identity:
   - product name
   - support email
   - sender name
   - Telegram bot name
2. Replace Clicka-specific text in admin-facing emails and admin UI with that
   configurable identity.
3. Move legacy marketing/legal/public salon pages out of the engine repo, or
   keep them permanently hidden behind `CLICKA_ENGINE_ONLY=1`.
4. Add a tiny custom-site starter that consumes only `/api/public`.
