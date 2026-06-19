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
2. Set the client site's environment variables:
   - `NEXT_PUBLIC_ENGINE_URL`
   - `NEXT_PUBLIC_SALON_SLUG`
3. The custom site reads public salon data from `/api/public/salons/:slug`.
4. The custom site reads staff and occupied slots from `/api/public`.
5. The custom site creates bookings through `/api/public/bookings`.

## Public API Contract

- `GET /api/public/salons/:slug`
- `GET /api/public/salons/:slug/staff`
- `GET /api/public/salons/:slug/slots?date=YYYY-MM-DD&staffMemberId=...`
- `POST /api/public/bookings`

These endpoints are the contract for all custom client frontends.

## Migration Rules

- Do not add new client public sites inside `clicka-c`.
- Do not route client domains through `middleware.ts`.
- Keep legacy public salon routes only during migration.
- New client frontend work belongs in a separate repo/project.
- Admin/backend improvements stay in `clicka-c`.

## Current Gaps

- `clicka-c` still contains marketing/public salon frontend routes.
- `public/widget.js` still opens a Clicka-hosted iframe route.
- Some public components and legal content expose Clicka branding.
- `middleware.ts` still contains diagnostic/client-host routing from debugging.

## Execution Order

1. Add `/api/public` contract.
2. Build a headless booking client/helper for custom sites.
3. Convert Paradise/Barber to consume only `/api/public`.
4. Remove client-site routing from `middleware.ts`.
5. Keep admin white-label capable through client-owned admin domains.
6. Later split marketing/internal platform UI from the engine if needed.
