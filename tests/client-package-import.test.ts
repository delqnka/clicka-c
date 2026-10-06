import { describe, expect, it, vi } from 'vitest';
import { parseMembershipCsv } from '@/lib/client-package-import';

vi.mock('@/lib/db', () => ({ sql: vi.fn() }));
vi.mock('@/lib/client-packages', () => ({ ensureClientPackagesSchema: vi.fn() }));
vi.mock('@/lib/salon-clients', () => ({ upsertSalonClient: vi.fn() }));

describe('parseMembershipCsv', () => {
  it('accepts Bulgarian tab-separated headers pasted from Sheets', () => {
    const result = parseMembershipCsv([
      'име\tтелефон\tимейл\tпакет\tобщо\tизползвани\tцена\tвалиден от\tвалиден до',
      'Ива Петрова\t0888123456\tiva@example.com\tReset Body 8\t8\t2\t240\t01.10.2026\t31.10.2026',
    ].join('\n'));

    expect(result.ok).toBe(true);
    expect(result.summary.validRows).toBe(1);
    expect(result.rows[0]).toMatchObject({
      name: 'Ива Петрова',
      phone: '0888123456',
      email: 'iva@example.com',
      packageName: 'Reset Body 8',
      totalSessions: 8,
      usedSessions: 2,
      remainingSessions: 6,
      price: 240,
      validFrom: '2026-10-01',
      validTo: '2026-10-31',
    });
  });

  it('derives used sessions from remaining when total is present', () => {
    const result = parseMembershipCsv([
      'client,email,membership,total credits,remaining,expires',
      'Maria,maria@example.com,8 sessions,8,3,2026-12-31',
    ].join('\n'));

    expect(result.ok).toBe(true);
    expect(result.rows[0]?.usedSessions).toBe(5);
    expect(result.rows[0]?.remainingSessions).toBe(3);
  });

  it('accepts semicolon-separated Excel CSV export', () => {
    const result = parseMembershipCsv([
      'client;phone;package;sessions;used;expires',
      'Iva;0888123456;4 sessions;4;1;2026-12-31',
    ].join('\n'));

    expect(result.ok).toBe(true);
    expect(result.rows[0]?.name).toBe('Iva');
    expect(result.rows[0]?.totalSessions).toBe(4);
    expect(result.rows[0]?.usedSessions).toBe(1);
  });

  it('reports row errors before import', () => {
    const result = parseMembershipCsv([
      'name,email,sessions,used,valid to',
      ',bad-email,4,5,31.10.2026',
    ].join('\n'));

    expect(result.ok).toBe(false);
    expect(result.summary.errorRows).toBe(1);
    expect(result.rows[0]?.errors).toEqual([
      'Missing client name',
      'Invalid email',
      'Used sessions exceed total sessions',
    ]);
  });
});
