'use client';

import { useEffect, useRef, useState } from 'react';

const SECTION_LINKS = [
  { id: 'how-it-works', label: 'Как работи', mobileHidden: false, href: undefined },
  { id: 'pricing', label: 'Цени', mobileHidden: false, href: '/pricing' },
  { id: 'faq', label: 'FAQ', mobileHidden: false, href: '/faq' },
  { id: 'chat', label: 'Контакт', mobileHidden: false, href: undefined },
] as const;

const HOME_SECTION_IDS = SECTION_LINKS.map((s) => s.id);
const HEADER_OFFSET = 128;

function getHomeSectionElement(id: string): HTMLElement | null {
  return (
    document.querySelector<HTMLElement>(`[data-home-section="${id}"]`) ??
    document.getElementById(id)
  );
}

export function MarketingHomeSectionNav() {
  const [activeSection, setActiveSection] = useState<string>('how-it-works');
  const sectionRatiosRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    let cancelled = false;

    const setup = () => {
      if (cancelled) return;
      const ratios = sectionRatiosRef.current;
      ratios.clear();

      const pickActive = () => {
        let bestId = HOME_SECTION_IDS[0];
        let bestRatio = 0;
        for (const id of HOME_SECTION_IDS) {
          const ratio = ratios.get(id) ?? 0;
          if (ratio > bestRatio) {
            bestRatio = ratio;
            bestId = id;
          }
        }
        if (bestRatio > 0) setActiveSection(bestId);
      };

      HOME_SECTION_IDS.forEach((id) => {
        const el = getHomeSectionElement(id);
        if (!el) return;

        const obs = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              ratios.set(id, entry.intersectionRatio);
            });
            pickActive();
          },
          {
            root: null,
            rootMargin: `-${HEADER_OFFSET}px 0px -45% 0px`,
            threshold: [0, 0.25, 0.5, 0.75, 1],
          },
        );
        obs.observe(el);
        observers.push(obs);
      });
    };

    let cancelSchedule: (() => void) | undefined;
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(setup, { timeout: 2500 });
      cancelSchedule = () => window.cancelIdleCallback(id);
    } else {
      const id = window.setTimeout(setup, 400);
      cancelSchedule = () => window.clearTimeout(id);
    }

    return () => {
      cancelled = true;
      cancelSchedule?.();
      observers.forEach((o) => o.disconnect());
      sectionRatiosRef.current.clear();
    };
  }, []);

  return (
    <nav className="hp-section-nav" aria-label="Навигация по секции">
      <div className="hp-section-nav-wrap">
        {SECTION_LINKS.map((section) =>
          section.id === 'chat' ? (
            <button
              key="chat"
              type="button"
              onClick={() => {
                window.dispatchEvent(new Event('clicka:open-chat'));
              }}
              className="hp-section-link"
              style={{ cursor: 'pointer' }}
            >
              {section.label}
            </button>
          ) : (
            <a
              key={section.id}
              href={section.href ?? `#${section.id}`}
              className={`hp-section-link${activeSection === section.id ? ' active' : ''}${section.mobileHidden ? ' hp-section-link-desktop' : ''}`}
            >
              {section.label}
            </a>
          ),
        )}
      </div>
    </nav>
  );
}
