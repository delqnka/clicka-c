'use client';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ButtonColorfulProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label?: string;
  href?: string;
  variant?: 'filled' | 'outline';
}

const BRAND_GRADIENT = 'linear-gradient(135deg, #e11d48, #db2777, #a855f7)';

export function ButtonColorful({
  className,
  label = 'Explore Components',
  href,
  variant = 'filled',
  ...props
}: ButtonColorfulProps) {
  const isExternal = Boolean(href?.startsWith('http'));

  if (variant === 'outline') {
    const outlineClass = cn(
      'inline-flex rounded-full p-[1.5px] transition-all duration-200 group',
      'hover:scale-[1.03] active:scale-[0.97]',
      'hover:shadow-[0_6px_24px_rgba(225,29,72,0.18)]',
      className,
    );
    const inner = (
      <span className="relative inline-flex h-full min-h-10 w-full items-center justify-center gap-2 overflow-hidden rounded-full bg-white px-7 text-base font-medium transition-all duration-200">
        {/* gradient bg fill on hover */}
        <span className="absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-10" style={{ background: BRAND_GRADIENT }} />
        {/* gradient text on hover */}
        <span
          className="relative transition-all duration-200"
          style={{ color: '#111' }}
          onMouseEnter={e => {
            const el = e.currentTarget;
            el.style.backgroundImage = BRAND_GRADIENT;
            el.style.webkitBackgroundClip = 'text';
            el.style.webkitTextFillColor = 'transparent';
            el.style.backgroundClip = 'text';
          }}
          onMouseLeave={e => {
            const el = e.currentTarget;
            el.style.backgroundImage = '';
            el.style.webkitBackgroundClip = '';
            el.style.webkitTextFillColor = '';
            el.style.backgroundClip = '';
          }}
        >{label}</span>
      </span>
    );
    if (href) {
      return isExternal
        ? <a href={href} target="_blank" rel="noopener noreferrer" className={outlineClass} style={{ background: BRAND_GRADIENT }}>{inner}</a>
        : <Link href={href} className={outlineClass} style={{ background: BRAND_GRADIENT }}>{inner}</Link>;
    }
    return <button type="button" className={outlineClass} style={{ background: BRAND_GRADIENT }} {...props}>{inner}</button>;
  }

  // filled variant
  const baseClass = cn(
    'inline-flex items-center justify-center gap-2 whitespace-nowrap',
    'border-0 transition-all duration-200',
    'hover:brightness-[0.93]',
    'disabled:pointer-events-none disabled:opacity-50',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e11d48] focus-visible:ring-offset-2',
    className,
  );

  const inner = (
    <span className="font-medium text-white">{label}</span>
  );

  if (href) {
    return isExternal
      ? <a href={href} target="_blank" rel="noopener noreferrer" className={baseClass} style={{ background: BRAND_GRADIENT }}>{inner}</a>
      : <Link href={href} className={baseClass} style={{ background: BRAND_GRADIENT }}>{inner}</Link>;
  }

  return (
    <button className={baseClass} style={{ background: BRAND_GRADIENT }} {...props}>
      {inner}
    </button>
  );
}
