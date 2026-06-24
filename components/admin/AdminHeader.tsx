'use client';

import { Menu, Eye, LogOut } from 'lucide-react';
import type { CSSProperties } from 'react';

import { T, tokens } from '@/lib/admin-theme';
import type { Locale } from '@/lib/i18n';

type AdminHeaderProps = {
  isMobile: boolean;
  site: {
    name: string | null;
    siteStatus: string | null;
  };
  slug: string;
  displayName: string | null;
  ownerEmail: string;
  locale: Locale;
  sitePublicUrl: string;
  busyKey: string | null;
  showInstallButton: boolean;
  onPublish: () => void;
  onLogout: () => void;
  onTriggerPwaInstall: () => void;
  onOpenNav: () => void;
  onLocaleChange: (next: Locale) => void;
};

export function AdminHeader({
  isMobile,
  site,
  slug,
  displayName,
  ownerEmail,
  locale,
  sitePublicUrl,
  busyKey,
  showInstallButton,
  onPublish,
  onLogout,
  onTriggerPwaInstall,
  onOpenNav,
  onLocaleChange,
}: AdminHeaderProps) {
  const isEn = locale === 'en';
  const langBusy = busyKey === 'locale';

  const langWrapStyle: CSSProperties = {
    display: 'inline-flex',
    border: `1px solid ${T.border}`,
    borderRadius: 999,
    overflow: 'hidden',
    background: '#fff',
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.04em',
    flexShrink: 0,
    opacity: langBusy ? 0.6 : 1,
  };

  const langBtn = (active: boolean): CSSProperties => ({
    padding: isMobile ? '6px 10px' : '5px 10px',
    border: 'none',
    background: active ? '#111' : 'transparent',
    color: active ? '#fff' : 'rgba(0,0,0,0.55)',
    cursor: langBusy ? 'wait' : 'pointer',
    transition: 'background 0.15s, color 0.15s',
  });

  const smGhostStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: T.radiusSm,
    border: `1px solid ${T.border}`,
    background: 'transparent',
    color: T.text,
    padding: '6px 12px',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    flexShrink: 0,
    transition: 'transform 150ms ease, opacity 150ms ease',
  };

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: tokens.z.modal,
        background: isMobile ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: isMobile ? '0.5px solid rgba(0,0,0,0.06)' : `1px solid ${T.border}`,
        height: isMobile ? tokens.layout.headerHeightMobile : tokens.layout.headerHeightDesktop,
        transform: 'translateZ(0)',
        willChange: 'transform',
      }}
    >
      <div
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          padding: isMobile ? '0 16px' : '0 20px',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        {isMobile ? (
          <button
            type="button"
            onClick={onOpenNav}
            aria-label={isEn ? 'Open menu' : 'Отвори меню'}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 36,
              height: 36,
              borderRadius: 999,
              border: 'none',
              background: tokens.gradient.brand,
              color: '#fff',
              boxShadow: '0 8px 20px rgba(219,39,119,0.28)',
              flexShrink: 0,
              cursor: 'pointer',
            }}
          >
            <Menu size={18} />
          </button>
        ) : null}

        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, flex: 1, minWidth: 0 }}>
          {!isMobile && (
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 7,
                background: T.accent,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 13,
                fontWeight: 800,
                color: '#fff',
                flexShrink: 0,
              }}
            >
              c
            </div>
          )}
          <span
            style={{
              fontSize: isMobile ? 17 : 14,
              fontWeight: 700,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              letterSpacing: '-0.02em',
            }}
          >
            {site.name || slug}
          </span>
          {!isMobile && (
            <span
              style={{
                fontSize: 12,
                color: T.subtle,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: 180,
              }}
            >
              {displayName || ownerEmail}
            </span>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 6 : 8, flexShrink: 0 }}>
          <div style={langWrapStyle} role="group" aria-label={isEn ? 'Language' : 'Език'}>
            <button
              type="button"
              onClick={() => !langBusy && locale !== 'bg' && onLocaleChange('bg')}
              style={langBtn(locale === 'bg')}
              aria-pressed={locale === 'bg'}
              disabled={langBusy}
            >
              BG
            </button>
            <button
              type="button"
              onClick={() => !langBusy && locale !== 'en' && onLocaleChange('en')}
              style={langBtn(locale === 'en')}
              aria-pressed={locale === 'en'}
              disabled={langBusy}
            >
              EN
            </button>
          </div>

          {site.siteStatus !== 'active' && (
            <button
              type="button"
              onClick={onPublish}
              disabled={busyKey === 'publish'}
              className="admin-cta-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5,
                borderRadius: isMobile ? 12 : 10,
                border: 'none',
                background: tokens.color.primary,
                color: '#fff',
                padding: isMobile ? '8px 14px' : '7px 14px',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                letterSpacing: '-0.01em',
                boxShadow: tokens.shadow.primary,
                opacity: busyKey === 'publish' ? 0.7 : 1,
                transition:
                  'transform 160ms ease, box-shadow 160ms ease, background 160ms ease, opacity 160ms ease',
              }}
            >
              {busyKey === 'publish'
                ? '…'
                : isEn
                ? isMobile
                  ? 'Publish'
                  : 'Publish site'
                : isMobile
                ? 'Публикувай'
                : 'Публикувай сайта'}
            </button>
          )}

          <a
            href={sitePublicUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={isEn ? 'View site' : 'Виж сайта'}
            className="admin-cta-ghost"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: isMobile ? 36 : undefined,
              height: isMobile ? 36 : undefined,
              borderRadius: 10,
              border: isMobile ? 'none' : `1px solid ${T.border}`,
              background: 'transparent',
              boxShadow: 'none',
              textDecoration: 'none',
              color: isMobile ? tokens.color.text : T.text,
              padding: isMobile ? 0 : '7px 12px',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              letterSpacing: '-0.01em',
              transition: 'background 160ms ease, border-color 160ms ease, color 160ms ease',
            }}
          >
            <Eye size={isMobile ? 16 : 13} color={isMobile ? tokens.color.text : tokens.color.muted} />
            {!isMobile && <span style={{ marginLeft: 6 }}>{isEn ? 'View site' : 'Виж сайта'}</span>}
          </a>

          {showInstallButton && !isMobile && (
            <button
              type="button"
              onClick={onTriggerPwaInstall}
              className="admin-cta-ghost"
              style={smGhostStyle}
            >
              {isEn ? 'Install' : 'Инсталирай'}
            </button>
          )}

          <button
            type="button"
            onClick={onLogout}
            disabled={busyKey === 'logout'}
            aria-label={isEn ? 'Log out' : 'Изход'}
            title={isEn ? 'Log out' : 'Изход'}
            className="admin-cta-ghost"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: isMobile ? 36 : undefined,
              height: isMobile ? 36 : undefined,
              borderRadius: 10,
              border: isMobile ? 'none' : `1px solid ${T.border}`,
              background: 'transparent',
              color: isMobile ? '#000' : T.text,
              padding: isMobile ? 0 : '7px 12px',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              letterSpacing: '-0.01em',
              transition: 'background 160ms ease, border-color 160ms ease, color 160ms ease',
            }}
          >
            <LogOut size={14} />
            {!isMobile && (
              <span style={{ marginLeft: 6 }}>
                {busyKey === 'logout'
                  ? isEn
                    ? 'Logging out…'
                    : 'Излизане…'
                  : isEn
                  ? 'Log out'
                  : 'Изход'}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
