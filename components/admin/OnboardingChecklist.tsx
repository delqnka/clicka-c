'use client';

import { CheckCircle2, Circle, ChevronRight } from 'lucide-react';
import type { AdminSitePayload, WorkingHours } from '@/lib/admin-site';

interface Props {
  site: AdminSitePayload;
  onGoToTab: (tab: string) => void;
}

function hasCustomHours(workingHours: WorkingHours): boolean {
  return Object.values(workingHours).some((d) => !d.closed);
}

function useOnboardingSteps(site: AdminSitePayload) {
  return [
    {
      id: 'services',
      label: 'Добави услуги',
      done: site.services.length > 0,
      tab: 'services',
    },
    {
      id: 'images',
      label: 'Качи снимки',
      done: site.galleryImages.length > 0 || !!site.coverImageUrl,
      tab: 'images',
    },
    {
      id: 'address',
      label: 'Добави адрес',
      done: !!site.address && site.address.trim().length > 3,
      tab: 'site',
    },
    {
      id: 'hours',
      label: 'Задай работно време',
      done: hasCustomHours(site.workingHours),
      tab: 'hours',
    },
  ];
}

export function OnboardingChecklist({ site, onGoToTab }: Props) {
  const steps = useOnboardingSteps(site);
  const doneCount = steps.filter((s) => s.done).length;
  const total = steps.length;
  const allDone = doneCount === total;

  // Hide checklist once everything is done
  if (allDone) return null;

  const pct = Math.round((doneCount / total) * 100);

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #fdf2f8 0%, #f5f3ff 100%)',
        border: '1px solid rgba(219,39,119,0.15)',
        borderRadius: 14,
        padding: '14px 16px',
        marginBottom: 16,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#1a1a2e', letterSpacing: '-0.01em' }}>
            Настрой сайта си
          </p>
          <p style={{ margin: 0, fontSize: 11.5, color: '#6b7280', marginTop: 1 }}>
            {doneCount} от {total} стъпки завършени
          </p>
        </div>
        <span style={{
          fontSize: 13,
          fontWeight: 700,
          color: '#db2777',
          background: 'rgba(219,39,119,0.08)',
          borderRadius: 999,
          padding: '2px 10px',
        }}>
          {pct}%
        </span>
      </div>

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
            onClick={() => !step.done && onGoToTab(step.tab)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              background: step.done ? 'transparent' : 'rgba(255,255,255,0.7)',
              border: step.done ? 'none' : '1px solid rgba(219,39,119,0.1)',
              borderRadius: 9,
              padding: step.done ? '3px 0' : '8px 10px',
              cursor: step.done ? 'default' : 'pointer',
              textAlign: 'left',
              width: '100%',
              transition: 'background 0.15s',
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
              fontWeight: step.done ? 500 : 600,
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
    </div>
  );
}
