import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface ButtonColorfulProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label?: string;
  href?: string;
}

export function ButtonColorful({
  className,
  label = 'Explore Components',
  href,
  ...props
}: ButtonColorfulProps) {
  const shellClass = cn(
    'relative h-10 overflow-hidden border-0 px-4',
    'bg-zinc-900 dark:bg-zinc-100',
    'transition-all duration-200',
    'group',
    className,
  );

  const content = (
    <>
      <div
        className={cn(
          'absolute inset-0',
          'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500',
          'opacity-40 blur transition-opacity duration-500 group-hover:opacity-80',
        )}
        aria-hidden
      />
      <div className="relative flex items-center justify-center gap-2">
        <span className="text-white dark:text-zinc-900">{label}</span>
        <ArrowUpRight className="h-3.5 w-3.5 text-white/90 dark:text-zinc-900/90" aria-hidden />
      </div>
    </>
  );

  if (href) {
    return (
      <Button asChild className={shellClass}>
        <Link href={href}>{content}</Link>
      </Button>
    );
  }

  return (
    <Button className={shellClass} {...props}>
      {content}
    </Button>
  );
}
