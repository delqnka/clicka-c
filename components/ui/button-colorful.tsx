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
      'inline-flex rounded-full p-[2px] transition-all duration-200 group',
      'hover:scale-[1.03] active:scale-[0.97]',
      'hover:shadow-[0_6px_24px_rgba(225,29,72,0.18)]',
      className,
    );
    const inner = (
      <span className="relative inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-[9999px] bg-white px-5 text-base font-medium transition-all duration-200">
        <span style={{ background: BRAND_GRADIENT, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{label}</span>
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
    'shadow-[0_4px_14px_rgba(225,29,72,0.45),0_1px_3px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.25)]',
    'hover:brightness-[0.93] hover:shadow-[0_6px_20px_rgba(225,29,72,0.55),0_2px_6px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.25)]',
    'active:shadow-[0_1px_4px_rgba(225,29,72,0.3),inset_0_1px_0_rgba(255,255,255,0.15)]',
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
