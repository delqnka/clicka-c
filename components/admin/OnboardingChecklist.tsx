'use client';

import { CheckCircle2, Circle, ChevronRight, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import type { AdminSitePayload, WorkingHours } from '@/lib/admin-site';

interface Props {
  site: AdminSitePayload;
  onGoToTab: (tab: string, subtab?: string) => void;
}

const DEFAULT_HOURS: WorkingHours = {
  monday: { open: '09:00', close: '18:00', closed: false },
  tuesday: { open: '09:00', close: '18:00', closed: false },
  wednesday: { open: '09:00', close: '18:00', closed: false },
  thursday: { open: '09:00', close: '18:00', closed: false },
  friday: { open: '09:00', close: '18:00', closed: false },
  saturday: { open: '10:00', close: '16:00', closed: false },
  sunday: { open: '', close: '', closed: true },
};

function hasCustomHours(workingHours: WorkingHours): boolean {
  if (!workingHours) return false;
  return Object.entries(workingHours).some(([day, d]) => {
    const def = DEFAULT_HOURS[day as keyof WorkingHours];
    if (!def) return false;
    return d.closed !== def.closed || d.open !== def.open || d.close !== def.close;
  });
}

function useOnboardingSteps(site: AdminSitePayload) {
  return [
    {
      id: 'domain',
      label: 'Избери име на сайта',
      done: true,
      tab: 'site',
      subtab: 'basics',
    },
    {
      id: 'services',
      label: 'Добави услуги',
      done: site.services.length > 0,
      tab: 'services',
    },
    {
      id: 'images',
      label: 'Качи снимки',
      done: (site.galleryImages?.length ?? 0) > 0 || !!site.coverImageUrl,
      tab: 'images',
    },
    {
      id: 'bizname',
      label: 'Добави име на бизнеса',
      done: !!site.name && site.name.trim().length > 1,
      tab: 'site',
      subtab: 'basics',
    },
    {
      id: 'specialist',
      label: site.plan === 'team' ? 'Добави себе си + екипа' : 'Добави себе си',
      done: !!site.ownerName && site.ownerName.trim().length > 1,
      tab: 'specialist',
    },
    {
      id: 'stripe',
      label: 'Свържи Stripe за плащания',
      done: !!site.stripeConnected,
      tab: 'payments',
    },
    {
      id: 'address',
      label: 'Добави локация',
      done: !!site.address && site.address.trim().length > 3,
      tab: 'site',
      subtab: 'address',
    },
    {
      id: 'hours',
      label: 'Задай работно време',
      done: hasCustomHours(site.workingHours),
      tab: 'hours',
    },
    {
      id: 'telegram',
      label: 'Свържи Telegram',
      done: !!site.telegramChatId,
      tab: 'integrations',
    },
    {
      id: 'google',
      label: 'Свържи Google ревюта',
      done: !!site.googlePlaceId && site.googlePlaceId.trim().length > 0,
      tab: 'integrations',
    },
    {
      id: 'customDomain',
      label: 'Свържи или купи собствен домейн',
      done: !!site.customDomain && site.customDomain.trim().length > 0,
      tab: 'domain',
    },
  ];
}

export function OnboardingChecklist({ site, onGoToTab }: Props) {
  const steps = useOnboardingSteps(site);
  const doneCount = steps.filter((s) => s.done).length;
  const total = steps.length;
  const allDone = doneCount === total;
  const [collapsed, setCollapsed] = useState(true);

  if (allDone) return null;

  const pct = Math.round((doneCount / total) * 100);

  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid rgba(219,39,119,0.12)',
        borderRadius: 16,
        padding: '14px 16px',
        marginBottom: 16,
        boxShadow: '0 8px 24px rgba(219,39,119,0.1), 0 2px 8px rgba(0,0,0,0.06)',
        fontFamily: 'var(--font-client-manrope, "Manrope", system-ui, sans-serif)',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: collapsed ? 0 : 10 }}>
        <div>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: '#1a1a2e', letterSpacing: '-0.01em' }}>
            Настрой сайта си
          </p>
          {!collapsed && (
            <p style={{ margin: 0, fontSize: 11.5, color: '#6b7280', marginTop: 1 }}>
              {doneCount} от {total} стъпки завършени
            </p>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontSize: 13,
            fontWeight: 700,
            color: '#007AFF',
            background: 'none',
            borderRadius: 999,
            padding: '2px 10px',
          }}>
            {pct}%
          </span>
          <button
            type="button"
            onClick={() => setCollapsed(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: 3,
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 11.5, color: '#18181b', padding: '2px 4px',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <ChevronDown size={14} style={{ transform: collapsed ? 'rotate(-90deg)' : 'none', transition: 'transform 200ms ease' }} />
            {collapsed ? 'Покажи' : 'Скрий'}
          </button>
        </div>
      </div>

      {!collapsed && <>
      {/* Progress bar */}
      <div style={{
        height: 5,
        borderRadius: 999,
        background: 'rgba(219,39,119,0.12)',
        marginBottom: 12,
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          borderRadius: 999,
          background: 'linear-gradient(90deg, #db2777, #9333ea)',
          transition: 'width 0.4s ease',
        }} />
      </div>

      {/* Steps */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {steps.map((step) => (
          <button
            key={step.id}
            type="button"
            onClick={() => onGoToTab(step.tab, (step as { subtab?: string }).subtab)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              background: '#fff',
              border: step.done ? '1px solid #f3f4f6' : '1px solid rgba(219,39,119,0.1)',
              borderRadius: 9,
              padding: '8px 10px',
              cursor: 'pointer',
              textAlign: 'left',
              width: '100%',
              boxShadow: step.done ? 'none' : '0 2px 6px rgba(0,0,0,0.06)',
              transition: 'box-shadow 0.15s',
            }}
          >
            {step.done ? (
              <CheckCircle2 size={16} style={{ color: '#10b981', flexShrink: 0 }} />
            ) : (
              <Circle size={16} style={{ color: '#db2777', flexShrink: 0 }} />
            )}
            <span style={{
              flex: 1,
              fontSize: 12.5,
              fontWeight: 400,
              color: step.done ? '#9ca3af' : '#1a1a2e',
              textDecoration: step.done ? 'line-through' : 'none',
            }}>
              {step.label}
            </span>
            {!step.done && (
              <ChevronRight size={14} style={{ color: '#db2777', flexShrink: 0 }} />
            )}
          </button>
        ))}
      </div>
      </>}
    </div>
  );
}
