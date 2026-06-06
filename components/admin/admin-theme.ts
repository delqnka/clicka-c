export const ADMIN_T = {
  bg: '#FAFAFA',
  surface: '#FFFFFF',
  border: '#E4E4E7',
  text: '#18181B',
  muted: '#71717A',
  subtle: '#A1A1AA',
  accent: '#22c55e',
  radius: 12,
  radiusLg: 16,
  radiusSm: 8,
} as const;

import type { CSSProperties } from 'react';

export const adminGrid2: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px, 100%), 1fr))',
  gap: 12,
};

export const ADMIN_COMPACT_SAVE_BTN: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: 'none',
  background: 'linear-gradient(135deg,#e11d48,#db2777,#a855f7)',
  color: '#fff',
  padding: '9px 20px',
  borderRadius: 999,
  fontSize: 13,
  fontWeight: 800,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
};
