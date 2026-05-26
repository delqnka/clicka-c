import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface ButtonColorfulProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label?: string;
  href?: string;
  variant?: 'filled' | 'outline';
}

const GRADIENT =
  'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500';

export function ButtonColorful({
  className,
  label = 'Explore Components',
  href,
  variant = 'filled',
  ...props
}: ButtonColorfulProps) {
  const isOutline = variant === 'outline';
  const isExternal = Boolean(href?.startsWith('http'));

  if (isOutline) {
    const outlineShell = cn(
      'inline-flex rounded-full p-[2px]',
      GRADIENT,
      'shadow-[0_8px_24px_rgba(99,102,241,0.28)]',
      'transition-all duration-200',
      'hover:shadow-[0_12px_32px_rgba(168,85,247,0.38)]',
      className,
    );
    const inner = (
      <span
        className={cn(
          'inline-flex h-full min-h-10 w-full items-center justify-center gap-2 rounded-full',
          'bg-[var(--background)] px-7',
          'text-base font-medium text-[var(--foreground)]',
          'transition-colors group-hover:bg-[var(--card)]',
        )}
      >
        {label}
        <ArrowUpRight className="h-3.5 w-3.5 opacity-70" aria-hidden />
      </span>
    );

    if (href) {
      return isExternal ? (
        <a href={href} target="_blank" rel="noopener noreferrer" className={outlineShell}>
          {inner}
        </a>
      ) : (
        <Link href={href} className={outlineShell}>
          {inner}
        </Link>
      );
    }

    return (
      <button type="button" className={outlineShell} {...props}>
        {inner}
      </button>
    );
  }

  const shellClass = cn(
    'relative h-10 overflow-hidden border-0 bg-zinc-900 px-4 transition-all duration-200 group dark:bg-zinc-100',
    className,
  );

  const content = (
    <>
      <div
        className={cn('absolute inset-0', GRADIENT, 'opacity-40 blur transition-opacity duration-500 group-hover:opacity-80')}
        aria-hidden
      />
      <div className="relative flex items-center justify-center gap-2">
        <span className="font-medium text-white dark:text-zinc-900">{label}</span>
        <ArrowUpRight className="h-3.5 w-3.5 text-white/90 dark:text-zinc-900/90" aria-hidden />
      </div>
    </>
  );

  if (href) {
    return (
      <Button asChild className={shellClass}>
        {isExternal ? (
          <a href={href} target="_blank" rel="noopener noreferrer">
            {content}
          </a>
        ) : (
          <Link href={href}>{content}</Link>
        )}
      </Button>
    );
  }

  return (
    <Button className={shellClass} {...props}>
      {content}
    </Button>
  );
}
