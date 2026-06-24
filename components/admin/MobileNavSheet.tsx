'use client';

import { Plus, ExternalLink, Check } from 'lucide-react';
import type { MutableRefObject, RefObject } from 'react';
import type { LucideIcon } from 'lucide-react';

import { T, tokens } from '@/lib/admin-theme';
import type { Locale } from '@/lib/i18n';

type SheetTab = {
  id: string;
  labelKey: string;
  Icon: LucideIcon;
};

type SheetGroup = {
  labelKey: string;
  ids: readonly string[];
};

type SheetDragState = {
  startY: number;
  offset: number;
  dragging: boolean;
};

type MobileNavSheetProps<TId extends string> = {
  open: boolean;
  onClose: () => void;

  sheetRef: RefObject<HTMLDivElement>;
  sheetDragRef: MutableRefObject<SheetDragState>;
  onSheetDragStart: (clientY: number) => void;
  onSheetDragMove: (clientY: number) => void;
  onSheetDragEnd: () => void;

  groups: readonly SheetGroup[];
  tabs: readonly SheetTab[];

  activeTab: TId;
  onSelectTab: (id: TId) => void;

  openGroups: Set<string>;
  setOpenGroups: (updater: (prev: Set<string>) => Set<string>) => void;

  sitePublicUrl: string;
  locale: Locale;
  pwaOnHomeScreen: boolean;
  onTriggerPwaInstall: () => void;

  t: (key: string) => string;
};

export function MobileNavSheet<TId extends string>({
  open,
  onClose,
  sheetRef,
  sheetDragRef,
  onSheetDragStart,
  onSheetDragMove,
  onSheetDragEnd,
  groups,
  tabs,
  activeTab,
  onSelectTab,
  openGroups,
  setOpenGroups,
  sitePublicUrl,
  locale,
  pwaOnHomeScreen,
  onTriggerPwaInstall,
  t,
}: MobileNavSheetProps<TId>) {
  if (!open) return null;

  const isEn = locale === 'en';

  const toggleGroup = (label: string) =>
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });

  return (
    <>
      <button
        type="button"
        aria-label={isEn ? 'Close menu (background)' : 'Затвори менюто (фон)'}
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 55,
          margin: 0,
          padding: 0,
          border: 'none',
          background: 'rgba(0,0,0,0.32)',
          cursor: 'pointer',
          animation: 'fadeIn 200ms ease',
        }}
      />
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label={isEn ? 'Navigation' : 'Навигация'}
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 56,
          background: '#fff',
          borderRadius: '20px 20px 0 0',
          paddingBottom: 'max(12px, env(safe-area-inset-bottom, 12px))',
          fontFamily: 'var(--font-client-manrope, "Manrope", system-ui, sans-serif)',
          animation: 'slideUp 280ms cubic-bezier(0.32, 0.72, 0, 1)',
          maxHeight: 'min(92dvh, calc(100dvh - 12px))',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 -12px 40px rgba(0,0,0,0.12)',
          pointerEvents: 'auto',
          touchAction: 'pan-y',
        }}
      >
        {/* Drag handle */}
        <button
          type="button"
          aria-label={t('adminDashboard.actions.closeMenu')}
          className="admin-sheet-handle"
          onClick={() => {
            if (sheetDragRef.current.offset > 10) return;
            onClose();
          }}
          onTouchStart={(e) => onSheetDragStart(e.touches[0]?.clientY ?? 0)}
          onTouchMove={(e) => {
            onSheetDragMove(e.touches[0]?.clientY ?? 0);
            if (sheetDragRef.current.offset > 8) e.preventDefault();
          }}
          onTouchEnd={() => onSheetDragEnd()}
          onTouchCancel={() => onSheetDragEnd()}
          style={{
            display: 'flex',
            width: '100%',
            minHeight: 48,
            alignItems: 'center',
            justifyContent: 'center',
            padding: '14px 16px 8px',
            border: 'none',
            background: 'transparent',
            cursor: 'grab',
            flexShrink: 0,
            touchAction: 'none',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <span
            aria-hidden
            style={{
              width: 44,
              height: 5,
              borderRadius: 3,
              background: '#A1A1AA',
              pointerEvents: 'none',
            }}
          />
        </button>

        {/* Scrollable groups + chat support */}
        <div
          style={{
            padding: '0 12px 8px',
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            flex: '1 1 auto',
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          {groups.map((group) => {
            const visibleTabs = tabs.filter((tt) => group.ids.includes(tt.id));
            if (visibleTabs.length === 0) return null;
            const groupLabel = t(group.labelKey);
            const isGroupOpen = openGroups.has(groupLabel);

            return (
              <div key={groupLabel}>
                <button
                  type="button"
                  aria-expanded={isGroupOpen}
                  onClick={() => toggleGroup(groupLabel)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    background: 'none',
                    border: 'none',
                    padding: '2px 4px 8px 4px',
                    cursor: 'pointer',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  <p
                    style={{
                      fontSize: 15,
                      fontWeight: 700,
                      letterSpacing: '-0.01em',
                      margin: 0,
                      fontFamily:
                        'var(--font-client-manrope, "Manrope", system-ui, sans-serif)',
                      color: tokens.color.text,
                    }}
                  >
                    {groupLabel}
                  </p>
                  <svg
                    width={14}
                    height={14}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={tokens.color.muted}
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{
                      transform: isGroupOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
                      transition: 'transform 220ms ease',
                      flexShrink: 0,
                    }}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                <div
                  style={{
                    overflow: 'hidden',
                    maxHeight: isGroupOpen ? '600px' : '0px',
                    opacity: isGroupOpen ? 1 : 0,
                    transition: 'max-height 300ms ease, opacity 220ms ease',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {visibleTabs.map(({ id, labelKey, Icon }) => {
                      const label = t(labelKey);
                      const active = activeTab === (id as TId);
                      return (
                        <button
                          key={id}
                          type="button"
                          aria-current={active ? 'page' : undefined}
                          onClick={() => onSelectTab(id as TId)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            padding: '10px 12px',
                            borderRadius: 12,
                            border: 'none',
                            background: active ? '#FAFAFA' : 'transparent',
                            cursor: 'pointer',
                            width: '100%',
                            textAlign: 'left',
                            WebkitTapHighlightColor: 'transparent',
                            fontFamily:
                              'var(--font-client-manrope, "Manrope", system-ui, sans-serif)',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: 34,
                              height: 34,
                              borderRadius: 10,
                              flexShrink: 0,
                              background: active ? tokens.color.primary : 'none',
                              color: active ? '#fff' : '#52525b',
                            }}
                          >
                            <Icon size={17} strokeWidth={1.9} />
                          </div>
                          <span
                            style={{
                              fontSize: 14,
                              fontWeight: active ? 600 : 400,
                              letterSpacing: '-0.01em',
                              color: tokens.color.text,
                              flex: 1,
                            }}
                          >
                            {label}
                          </span>
                          {active && (
                            <div
                              style={{
                                width: 6,
                                height: 6,
                                borderRadius: '50%',
                                background: tokens.color.primary,
                                flexShrink: 0,
                              }}
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}

          {/* ── Чат поддръжка ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <button
              type="button"
              onClick={() => {
                onClose();
                window.dispatchEvent(new Event('clicka:open-chat'));
              }}
              style={chatItemStyle}
            >
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 28,
                  height: 28,
                  borderRadius: 999,
                  background: tokens.color.primary,
                  color: '#fff',
                  flexShrink: 0,
                }}
              >
                <svg
                  width={16}
                  height={16}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </span>
              {isEn ? 'Have a question?' : 'Имаш въпрос?'}
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                window.dispatchEvent(new Event('clicka:open-chat-history'));
              }}
              style={chatItemStyle}
            >
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 28,
                  height: 28,
                  borderRadius: 999,
                  background: '#F3F4F6',
                  color: '#6B7280',
                  flexShrink: 0,
                }}
              >
                <svg
                  width={16}
                  height={16}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  <line x1="9" y1="9" x2="15" y2="9" />
                  <line x1="9" y1="13" x2="13" y2="13" />
                </svg>
              </span>
              {isEn ? 'Chat history' : 'История на чата'}
            </button>
          </div>
        </div>

        {/* Bottom action bar */}
        <div
          style={{
            margin: '0 12px',
            paddingTop: 10,
            borderTop: `1px solid ${T.border}`,
            flexShrink: 0,
            display: 'flex',
            gap: 8,
            alignItems: 'center',
          }}
        >
          <a
            href={sitePublicUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClose}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '11px 10px',
              borderRadius: 12,
              textDecoration: 'none',
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
              background: tokens.color.primary,
              boxShadow: tokens.shadow.primary,
            }}
          >
            <ExternalLink size={16} /> {isEn ? 'View site' : 'Виж сайта'}
          </a>

          {!pwaOnHomeScreen ? (
            <button
              type="button"
              aria-label={isEn ? 'Add to home screen' : 'Добави на началния екран'}
              onClick={onTriggerPwaInstall}
              style={{
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 44,
                height: 44,
                borderRadius: 12,
                border: `1px solid ${T.border}`,
                background: '#fff',
                color: T.text,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              }}
            >
              <Plus size={18} strokeWidth={2} />
            </button>
          ) : (
            <div
              aria-label={isEn ? 'Added to home screen' : 'Добавено на началния екран'}
              style={{
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 44,
                height: 44,
                borderRadius: 12,
                border: '1px solid #BBF7D0',
                background: '#F0FDF4',
              }}
            >
              <Check size={20} strokeWidth={2.5} style={{ color: '#22C55E' }} />
            </div>
          )}
        </div>
      </div>
    </>
  );
}

const chatItemStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  width: '100%',
  padding: '10px 12px',
  borderRadius: 12,
  border: 'none',
  background: '#fff',
  cursor: 'pointer',
  fontSize: 14,
  fontWeight: 500,
  color: '#18181B',
  WebkitTapHighlightColor: 'transparent' as const,
} as const;
