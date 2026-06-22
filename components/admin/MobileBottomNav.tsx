'use client';

import type { LucideIcon } from 'lucide-react';

import { tokens } from '@/lib/admin-theme';

type BottomTab = {
  id: string;
  labelKey: string;
  Icon: LucideIcon;
};

type MobileBottomNavProps<TId extends string> = {
  tabs: readonly BottomTab[];
  activeTab: TId;
  /** True when the bottom sheet nav is open — disables active styling so the user sees the sheet as the focus. */
  sheetOpen: boolean;
  onSwitch: (id: TId) => void;
  t: (key: string) => string;
};

export function MobileBottomNav<TId extends string>({
  tabs,
  activeTab,
  sheetOpen,
  onSwitch,
  t,
}: MobileBottomNavProps<TId>) {
  return (
    <nav
      aria-label="Навигация"
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        padding: '0 8px max(8px, env(safe-area-inset-bottom, 8px))',
        zIndex: tokens.z.modal,
        pointerEvents: 'none',
        width: '100%',
        boxSizing: 'border-box',
        transform: 'translateZ(0)',
        willChange: 'transform',
      }}
    >
      <div
        style={{
          pointerEvents: 'auto',
          display: 'flex',
          alignItems: 'stretch',
          justifyContent: 'space-between',
          gap: 2,
          padding: '10px 6px',
          borderRadius: 22,
          background: 'rgba(255,255,255,0.68)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          border: '1px solid rgba(255,255,255,0.72)',
          boxShadow:
            '0 14px 50px rgba(15,23,42,0.2), 0 6px 20px rgba(15,23,42,0.14), 0 0 0 1px rgba(255,255,255,0.55), inset 0 1px 0 rgba(255,255,255,0.9)',
        }}
      >
        {tabs.map(({ id, labelKey, Icon }) => {
          const label = t(labelKey);
          const active = activeTab === (id as TId) && !sheetOpen;
          return (
            <button
              key={id}
              type="button"
              aria-label={label}
              aria-current={active ? 'page' : undefined}
              title={label}
              onClick={() => onSwitch(id as TId)}
              style={{
                flex: '1 1 0',
                minWidth: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                padding: '6px 4px',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                minHeight: 52,
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: active ? 32 : 28,
                  height: active ? 32 : 28,
                  borderRadius: 999,
                  background: active ? tokens.gradient.brand : 'transparent',
                  color: active ? '#fff' : tokens.color.text,
                  boxShadow: active ? '0 8px 20px rgba(219,39,119,0.28)' : 'none',
                  transition: 'all 180ms ease',
                }}
              >
                <Icon size={active ? 17 : 16} strokeWidth={active ? 2.2 : 1.8} />
              </div>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: active ? 700 : 500,
                  letterSpacing: '-0.01em',
                  color: active ? tokens.color.accent.solid : tokens.color.text,
                  lineHeight: 1.15,
                  textAlign: 'center',
                  whiteSpace: 'nowrap',
                }}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
