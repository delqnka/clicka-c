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
      'inline-flex rounded-full p-[2px] transition-all duration-200',
      'hover:brightness-90',
      className,
    );
    const inner = (
      <span className="inline-flex h-full min-h-10 w-full items-center justify-center gap-2 rounded-full bg-[var(--background)] px-7 text-base font-medium text-[var(--foreground)]">
        {label}
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
