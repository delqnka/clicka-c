# Clicka Engine

**Before doing anything else, read [docs/project-vision.md](docs/project-vision.md).**
It is the architectural constitution of this project — treat it as binding.

## TL;DR for AI agents

- Clicka is **not** a SaaS platform. It is a white-label engine the agency
  embeds into client-owned custom websites.
- **Never propose** subscription billing, pricing pages, plan upgrades, domain
  purchase checkout, SMS packs, marketplace listings, or anything that turns
  Clicka into a platform end-clients sign up to.
- The only money flow allowed is **Stripe Connect → salon's own account**
  (booking deposits). Money never flows *to* Clicka inside the product.
- Domains: the agency buys + sets up DNS manually; the app only **connects**
  an already-bought domain to a salon (`/api/domain-connect`).
- White-label: end-clients must never see "Clicka" in branding, emails, URLs,
  or subdomains. Per-salon Resend (`lib/encryption.ts` + `getSalonResend()`)
  is the canonical example of how to honor this.

## Decision filter (apply to every feature request)

1. Does this make Clicka feel more like a SaaS platform? → likely wrong direction.
2. Does this help the agency ship custom client sites faster? → likely right direction.

If a user request appears to violate the vision doc, **stop and flag the
conflict before implementing**. Don't silently reinterpret as "they probably
meant…".
