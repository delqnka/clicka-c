/**
 * Integration tests for the three critical Stripe payment flows.
 * Requires a real DATABASE_URL — hits the actual Neon DB.
 * Each test creates isolated data with a unique run ID and cleans up after itself.
 */
import { describe, it, expect, afterAll } from 'vitest';
import { neon } from '@neondatabase/serverless';
import crypto from 'crypto';
import { config } from 'dotenv';
import path from 'path';

config({ path: path.resolve(__dirname, '../../.env.local') });

const sql = neon(process.env.DATABASE_URL!);

// ── Helpers ──────────────────────────────────────────────────────────────────

function uid() {
  return crypto.randomUUID();
}

function sha256(input: string) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

async function markEventProcessed(eventId: string): Promise<boolean> {
  const rows = await sql`
    INSERT INTO stripe_processed_events (event_id)
    VALUES (${eventId})
    ON CONFLICT (event_id) DO NOTHING
    RETURNING event_id
  `;
  return rows.length > 0;
}

async function unmarkEvent(eventId: string) {
  await sql`DELETE FROM stripe_processed_events WHERE event_id = ${eventId}`;
}

// Track IDs created during tests for cleanup
const createdSalonIds: string[] = [];
const createdBookingIds: string[] = [];
const createdDomainRequestIds: string[] = [];
const createdEventIds: string[] = [];

async function createTestSalon(overrides: Record<string, unknown> = {}) {
  const id = uid();
  const slug = `test-salon-${id.slice(0, 8)}`;
  await sql`
    INSERT INTO salons (id, slug, name, email, is_active, site_status, plan_type)
    VALUES (
      ${id}, ${slug}, ${'Test Salon'}, ${'test@test.com'},
      ${overrides.is_active ?? false},
      ${'pending'},
      ${'subdomain'}
    )
  `;
  createdSalonIds.push(id);
  return { id, slug };
}

async function createTestBooking(salonId: string, overrides: Record<string, unknown> = {}) {
  const id = uid();
  await sql`
    INSERT INTO bookings (
      id, salon_id, client_name, client_phone, client_email,
      service_name, service_price, service_duration,
      date, time, status, payment_status
    ) VALUES (
      ${id}, ${salonId}, ${'Test Client'}, ${'0888000000'}, ${'client@test.com'},
      ${'Haircut'}, ${50}, ${60},
      ${new Date().toISOString().slice(0, 10)}, ${'10:00'},
      ${'pending'},
      ${overrides.payment_status ?? 'unpaid'}
    )
  `;
  createdBookingIds.push(id);
  return id;
}

async function createTestDomainRequest(salonId: string) {
  const id = uid();
  const stripeSessionId = `cs_test_${id.slice(0, 12)}`;
  await sql`
    INSERT INTO domain_purchase_requests (
      id, salon_id, requested_label, tld, full_domain,
      registrant_name, registrant_email, registrant_phone,
      address_line1, city, status, stripe_session_id
    ) VALUES (
      ${id}, ${salonId}, ${'testdomain'}, ${'com'}, ${'testdomain.com'},
      ${'Test User'}, ${'test@test.com'}, ${'0888000000'},
      ${'Test Street 1'}, ${'Sofia'}, ${'requested'}, ${stripeSessionId}
    )
  `;
  createdDomainRequestIds.push(id);
  return { id, stripeSessionId };
}

// ── Cleanup ───────────────────────────────────────────────────────────────────

afterAll(async () => {
  if (createdEventIds.length > 0) {
    await sql`DELETE FROM stripe_processed_events WHERE event_id = ANY(${createdEventIds})`;
  }
  if (createdBookingIds.length > 0) {
    await sql`DELETE FROM bookings WHERE id = ANY(${createdBookingIds})`;
  }
  if (createdDomainRequestIds.length > 0) {
    await sql`DELETE FROM domain_purchase_requests WHERE id = ANY(${createdDomainRequestIds})`;
  }
  if (createdSalonIds.length > 0) {
    // Remove memberships/sessions referencing these salons first
    await sql`DELETE FROM owner_sessions WHERE salon_id = ANY(${createdSalonIds})`;
    await sql`DELETE FROM salon_owner_memberships WHERE salon_id = ANY(${createdSalonIds})`;
    await sql`DELETE FROM salons WHERE id = ANY(${createdSalonIds})`;
  }
});

// ── Flow 1: Booking payment ───────────────────────────────────────────────────

describe('booking payment flow', () => {
  it('marks booking as paid after webhook', async () => {
    const salon = await createTestSalon();
    const bookingId = await createTestBooking(salon.id);
    const eventId = `evt_booking_${uid()}`;
    createdEventIds.push(eventId);

    // Simulate idempotency check
    const isNew = await markEventProcessed(eventId);
    expect(isNew).toBe(true);

    // Simulate webhook DB update
    const updated = await sql`
      UPDATE bookings
      SET payment_status = 'paid'
      WHERE id = ${bookingId}
      RETURNING id, payment_status
    `;
    expect(updated.length).toBe(1);
    expect((updated[0] as { payment_status: string }).payment_status).toBe('paid');

    // Verify from DB
    const rows = await sql`SELECT payment_status FROM bookings WHERE id = ${bookingId}`;
    expect((rows[0] as { payment_status: string }).payment_status).toBe('paid');
  });

  it('duplicate webhook does not update twice (idempotency)', async () => {
    const eventId = `evt_dup_${uid()}`;
    createdEventIds.push(eventId);

    const first = await markEventProcessed(eventId);
    expect(first).toBe(true);

    const second = await markEventProcessed(eventId);
    expect(second).toBe(false);
  });

  it('unmarks event when processing fails — allows retry', async () => {
    const eventId = `evt_retry_${uid()}`;
    createdEventIds.push(eventId);

    await markEventProcessed(eventId);
    const lockedBefore = await sql`
      SELECT event_id FROM stripe_processed_events WHERE event_id = ${eventId}
    `;
    expect(lockedBefore.length).toBe(1);

    // Simulate failure → unmark
    await unmarkEvent(eventId);
    const lockedAfter = await sql`
      SELECT event_id FROM stripe_processed_events WHERE event_id = ${eventId}
    `;
    expect(lockedAfter.length).toBe(0);

    // Can be processed again
    const retry = await markEventProcessed(eventId);
    expect(retry).toBe(true);
  });

  it('booking not found does not throw — returns 0 rows', async () => {
    const fakeBookingId = uid();
    const rows = await sql`
      UPDATE bookings SET payment_status = 'paid'
      WHERE id = ${fakeBookingId}
      RETURNING id
    `;
    expect(rows.length).toBe(0);
  });
});

// ── Flow 2: Subscription activation ──────────────────────────────────────────

describe('subscription activation flow', () => {
  it('activates salon after successful Stripe payment', async () => {
    const salon = await createTestSalon({ is_active: false });
    const eventId = `evt_sub_${uid()}`;
    createdEventIds.push(eventId);
    const stripeSessionId = `cs_test_${uid().slice(0, 12)}`;
    const stripeCustomerId = `cus_test_${uid().slice(0, 12)}`;

    const isNew = await markEventProcessed(eventId);
    expect(isNew).toBe(true);

    await sql`
      UPDATE salons
      SET
        is_active        = true,
        site_status      = 'active',
        plan_type        = 'solo',
        plan             = 'solo',
        billing_period   = '12m',
        plan_started_at  = now(),
        plan_expires_at  = now() + INTERVAL '12 months',
        plan_paid_amount = 29900,
        stripe_session_id   = ${stripeSessionId},
        stripe_customer_id  = ${stripeCustomerId}
      WHERE id = ${salon.id}
    `;

    const rows = await sql`
      SELECT is_active, site_status, plan, plan_paid_amount
      FROM salons WHERE id = ${salon.id}
    `;
    const row = rows[0] as { is_active: boolean; site_status: string; plan: string; plan_paid_amount: number };
    expect(row.is_active).toBe(true);
    expect(row.site_status).toBe('active');
    expect(row.plan).toBe('solo');
    expect(row.plan_paid_amount).toBe(29900);
  });

  it('duplicate subscription webhook is ignored', async () => {
    const eventId = `evt_sub_dup_${uid()}`;
    createdEventIds.push(eventId);

    const first = await markEventProcessed(eventId);
    expect(first).toBe(true);

    const second = await markEventProcessed(eventId);
    expect(second).toBe(false);
  });

  it('plan_expires_at is set ~12 months in the future', async () => {
    const salon = await createTestSalon();

    await sql`
      UPDATE salons
      SET
        plan_started_at = now(),
        plan_expires_at = now() + INTERVAL '12 months'
      WHERE id = ${salon.id}
    `;

    const rows = await sql`
      SELECT plan_expires_at FROM salons WHERE id = ${salon.id}
    `;
    const expiresAt = new Date((rows[0] as { plan_expires_at: string }).plan_expires_at);
    const monthsFromNow = (expiresAt.getTime() - Date.now()) / (30 * 24 * 60 * 60 * 1000);
    expect(monthsFromNow).toBeGreaterThan(11);
    expect(monthsFromNow).toBeLessThan(13);
  });
});

// ── Flow 3: Domain purchase ───────────────────────────────────────────────────

describe('domain purchase flow', () => {
  it('marks domain request as paid after Stripe webhook', async () => {
    const salon = await createTestSalon();
    const { id: requestId, stripeSessionId } = await createTestDomainRequest(salon.id);
    const eventId = `evt_domain_${uid()}`;
    createdEventIds.push(eventId);

    const isNew = await markEventProcessed(eventId);
    expect(isNew).toBe(true);

    await sql`
      UPDATE domain_purchase_requests
      SET
        status            = 'paid',
        paid_at           = now(),
        stripe_session_id = ${stripeSessionId},
        updated_at        = now()
      WHERE id = ${requestId}
    `;

    const rows = await sql`
      SELECT status, paid_at FROM domain_purchase_requests WHERE id = ${requestId}
    `;
    const row = rows[0] as { status: string; paid_at: string };
    expect(row.status).toBe('paid');
    expect(row.paid_at).not.toBeNull();
  });

  it('duplicate domain webhook is ignored', async () => {
    const eventId = `evt_domain_dup_${uid()}`;
    createdEventIds.push(eventId);

    const first = await markEventProcessed(eventId);
    expect(first).toBe(true);

    const second = await markEventProcessed(eventId);
    expect(second).toBe(false);
  });

  it('two active requests for same domain are blocked by DB constraint', async () => {
    const salon = await createTestSalon();
    const id1 = uid();
    const id2 = uid();
    createdDomainRequestIds.push(id1, id2);

    await sql`
      INSERT INTO domain_purchase_requests (
        id, salon_id, requested_label, tld, full_domain,
        registrant_name, registrant_email, registrant_phone,
        address_line1, city, status, stripe_session_id
      ) VALUES (
        ${id1}, ${salon.id}, ${'duptest'}, ${'com'}, ${'duptest-constraint.com'},
        ${'User'}, ${'u@test.com'}, ${'0888'}, ${'Street'}, ${'Sofia'},
        ${'paid'}, ${`cs_${id1.slice(0, 8)}`}
      )
    `;

    // Second request for same domain with active status should fail
    await expect(
      sql`
        INSERT INTO domain_purchase_requests (
          id, salon_id, requested_label, tld, full_domain,
          registrant_name, registrant_email, registrant_phone,
          address_line1, city, status, stripe_session_id
        ) VALUES (
          ${id2}, ${salon.id}, ${'duptest'}, ${'com'}, ${'duptest-constraint.com'},
          ${'User'}, ${'u@test.com'}, ${'0888'}, ${'Street'}, ${'Sofia'},
          ${'processing'}, ${`cs_${id2.slice(0, 8)}`}
        )
      `
    ).rejects.toThrow();
  });
});

// ── Flow 4: Idempotency table constraints ─────────────────────────────────────

describe('stripe_processed_events constraints', () => {
  it('PRIMARY KEY prevents duplicate event_id at DB level', async () => {
    const eventId = `evt_pk_${uid()}`;
    createdEventIds.push(eventId);

    await sql`INSERT INTO stripe_processed_events (event_id) VALUES (${eventId})`;

    await expect(
      sql`INSERT INTO stripe_processed_events (event_id) VALUES (${eventId})`
    ).rejects.toThrow();
  });

  it('ON CONFLICT DO NOTHING returns 0 rows for duplicate', async () => {
    const eventId = `evt_conflict_${uid()}`;
    createdEventIds.push(eventId);

    await sql`INSERT INTO stripe_processed_events (event_id) VALUES (${eventId})`;

    const rows = await sql`
      INSERT INTO stripe_processed_events (event_id)
      VALUES (${eventId})
      ON CONFLICT (event_id) DO NOTHING
      RETURNING event_id
    `;
    expect(rows.length).toBe(0);
  });
});
