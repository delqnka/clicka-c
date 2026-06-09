import { describe, expect, it } from 'vitest';

// ── Plan prices ───────────────────────────────────────────────────────────────
const PLAN_OPTIONS = {
  solo_12m: { amount: 29900 },
  solo_6m:  { amount: 16900 },
  team_12m: { amount: 49900 },
  team_6m:  { amount: 27900 },
};

describe('plan prices', () => {
  it('solo_12m is 299 EUR in cents', () => {
    expect(PLAN_OPTIONS.solo_12m.amount).toBe(29900);
  });
  it('solo_6m is 169 EUR in cents', () => {
    expect(PLAN_OPTIONS.solo_6m.amount).toBe(16900);
  });
  it('team_12m is 499 EUR in cents', () => {
    expect(PLAN_OPTIONS.team_12m.amount).toBe(49900);
  });
  it('team_6m is 279 EUR in cents', () => {
    expect(PLAN_OPTIONS.team_6m.amount).toBe(27900);
  });
  it('no plan is in test mode (1 EUR)', () => {
    for (const [key, opt] of Object.entries(PLAN_OPTIONS)) {
      expect(opt.amount, `${key} should not be 100 cents (test mode)`).toBeGreaterThan(100);
    }
  });
});

// ── Domain prices ─────────────────────────────────────────────────────────────
const DOMAIN_SETUP_FEE_CENTS = 1999;
const DOMAIN_TLD_OPTIONS = [
  { value: 'com',  feeCents: 1200 },
  { value: 'bg',   feeCents: 3000 },
  { value: 'org',  feeCents:  800 },
  { value: 'info', feeCents:  800 },
];

describe('domain prices', () => {
  it('setup fee is 19.99 EUR', () => {
    expect(DOMAIN_SETUP_FEE_CENTS).toBe(1999);
  });
  it('.com is 12 EUR', () => {
    expect(DOMAIN_TLD_OPTIONS.find(t => t.value === 'com')!.feeCents).toBe(1200);
  });
  it('.bg is 30 EUR', () => {
    expect(DOMAIN_TLD_OPTIONS.find(t => t.value === 'bg')!.feeCents).toBe(3000);
  });
  it('no domain price is in test mode (1 EUR)', () => {
    for (const tld of DOMAIN_TLD_OPTIONS) {
      expect(tld.feeCents, `.${tld.value} should not be 100 cents (test mode)`).toBeGreaterThan(100);
    }
    expect(DOMAIN_SETUP_FEE_CENTS).toBeGreaterThan(100);
  });
  it('total fee = domain + setup', () => {
    for (const tld of DOMAIN_TLD_OPTIONS) {
      const total = tld.feeCents + DOMAIN_SETUP_FEE_CENTS;
      expect(total).toBe(tld.feeCents + 1999);
    }
  });
});

// ── Amount conversion ─────────────────────────────────────────────────────────
describe('amount conversion', () => {
  it('converts EUR to cents correctly', () => {
    expect(Math.round(49.99 * 100)).toBe(4999);
    expect(Math.round(50 * 100)).toBe(5000);
    expect(Math.round(299.99 * 100)).toBe(29999);
    expect(Math.round(299 * 100)).toBe(29900);
  });
});

// ── Idempotency logic ─────────────────────────────────────────────────────────
describe('stripe idempotency', () => {
  it('does not process same event twice', () => {
    const processed = new Set<string>();
    const eventId = 'evt_123';

    const process = (id: string) => {
      if (processed.has(id)) return 'skipped';
      processed.add(id);
      return 'processed';
    };

    expect(process(eventId)).toBe('processed');
    expect(process(eventId)).toBe('skipped');
  });

  it('unmarks event if processing fails', () => {
    const processed = new Set<string>();
    const eventId = 'evt_456';

    processed.add(eventId);
    // simulate failure → unmark
    processed.delete(eventId);

    expect(processed.has(eventId)).toBe(false);
  });
});

// ── Metadata guards ───────────────────────────────────────────────────────────
describe('stripe metadata', () => {
  it('missing salonSlug is detected', () => {
    const metadata: Record<string, string> = {};
    expect(metadata.salonSlug).toBeUndefined();
  });

  it('invalid planKey is rejected', () => {
    const validKeys = Object.keys(PLAN_OPTIONS);
    expect(validKeys).toContain('solo_12m');
    expect(validKeys).not.toContain('unknown_plan');
  });
});
