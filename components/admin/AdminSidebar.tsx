'use client';

import { ChevronRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { T, tokens } from '@/lib/admin-theme';
import type { Locale } from '@/lib/i18n';

type SidebarTab = {
  id: string;
  labelKey: string;
  Icon: LucideIcon;
};

type SidebarGroup = {
  labelKey?: string;
  ids: readonly string[];
};

type AdminSidebarProps<TId extends string> = {
  groups: readonly SidebarGroup[];
  tabs: readonly SidebarTab[];
  activeTab: TId;
  onSwitch: (id: TId) => void;
  t: (key: string) => string;
  locale?: Locale;
};

export function AdminSidebar<TId extends string>({
  groups,
  tabs,
  activeTab,
  onSwitch,
  t,
  locale = 'bg',
}: AdminSidebarProps<TId>) {
  const isEn = locale === 'en';
  return (
    <aside
      aria-label={isEn ? 'Navigation' : 'Навигация'}
      style={{
        width: tokens.layout.sidebarWidth,
        flexShrink: 0,
        position: 'sticky',
        top: tokens.layout.headerHeightDesktop,
        height: `calc(100dvh - ${tokens.layout.headerHeightDesktop}px)`,
        overflowY: 'auto',
        borderRight: `1px solid ${T.border}`,
        background: 'rgba(255,255,255,0.8)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        padding: '14px 8px',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
      }}
    >
      {groups.map((group, gi) => (
        <div
          key={group.labelKey ?? `group-${gi}`}
          style={{ marginBottom: gi < groups.length - 1 ? 4 : 0 }}
        >
          {group.labelKey && (
            <div
              style={{
                padding: '6px 10px 4px',
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.06em',
                color: T.subtle,
                textTransform: 'uppercase',
                userSelect: 'none',
              }}
            >
              {t(group.labelKey)}
            </div>
          )}

          {group.ids.map((id) => {
            const tab = tabs.find((tt) => tt.id === id);
            if (!tab) return null;
            const active = activeTab === (id as TId);
            return (
              <button
                key={id}
                type="button"
                className="admin-sidebar-item"
                data-active={active || undefined}
                aria-current={active ? 'page' : undefined}
                onClick={() => onSwitch(id as TId)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '7px 10px',
                  borderRadius: T.radiusSm,
                  border: active ? '1px solid #E4E4E7' : '1px solid transparent',
                  width: '100%',
                  textAlign: 'left',
                  background: active ? '#fff' : 'transparent',
                  color: active ? T.text : T.muted,
                  fontSize: 14,
                  fontWeight: active ? 600 : 400,
                  cursor: 'pointer',
                  transition: 'background 120ms, color 120ms, border-color 120ms',
                }}
              >
                <tab.Icon size={14} strokeWidth={active ? 2.2 : 1.8} style={{ flexShrink: 0 }} />
                <span style={{ flex: 1 }}>{t(tab.labelKey)}</span>
                {active && <ChevronRight size={12} style={{ opacity: 0.4, flexShrink: 0 }} />}
              </button>
            );
          })}

          {gi < groups.length - 1 && (
            <div
              role="presentation"
              style={{ height: 1, background: T.border, margin: '6px 10px 2px' }}
            />
          )}
        </div>
      ))}
    </aside>
  );
}
