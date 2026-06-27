# @clicka1/clicka

CLI for onboarding a client website to Clicka booking.

## Intended Flow

1. In Clicka, create the salon record from `/pa`.
2. Save the salon slug.
3. In the client website repo, run:

```bash
npx @clicka1/clicka init
```

If you want the direct executable form after install or via `npm exec`, use:

```bash
clicka1 init
```

The CLI then:

- installs `@clicka1/booking`
- creates a `ClickaProvider`
- mounts it in the root layout
- adds example env variables

It does not create the salon tenant itself.
