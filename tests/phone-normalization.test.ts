import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/db', () => ({ sql: vi.fn() }));
vi.mock('@/lib/ensure-salon-clients-schema', () => ({ ensureSalonClientsSchema: vi.fn() }));

import { normalizePhoneForMatch } from '@/lib/salon-clients';

describe('normalizePhoneForMatch', () => {
  it('treats Bulgarian local and international formats as the same number', () => {
    expect(normalizePhoneForMatch('0898755668')).toBe('898755668');
    expect(normalizePhoneForMatch('+359 89 875 5668')).toBe('898755668');
    expect(normalizePhoneForMatch('00359898755668')).toBe('898755668');
  });
});
