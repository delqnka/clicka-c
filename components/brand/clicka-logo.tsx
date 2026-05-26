import Image from 'next/image';
import Link from 'next/link';
import { CLICKA_LOGO_PATH } from '@/lib/clicka-marketing-site';
import { cn } from '@/lib/utils';

/** Реално съотношение на public/clicka-logo.png (883×283) */
const LOGO_ASPECT = 883 / 283;

const LOGO_SIZE = {
  /** Маркетинг nav — по-четимо на телефон, по-уверено на desktop */
  nav: 'h-[32px] w-auto sm:h-[36px] md:h-[40px]',
  /** Тъмен footer */
  footer: 'h-[28px] w-auto sm:h-[32px]',
  /** /create, /success, компактни header-и */
  compact: 'h-[30px] w-auto sm:h-[34px]',
} as const;

type ClickaLogoSize = keyof typeof LOGO_SIZE;

type ClickaLogoProps = {
  size?: ClickaLogoSize;
  className?: string;
  href?: string | null;
  priority?: boolean;
  variant?: 'default' | 'on-dark';
};

function intrinsicForDisplayHeight(cssPx: number) {
  const h = cssPx * 2;
  return { width: Math.round(h * LOGO_ASPECT), height: h };
}

const INTRINSIC = intrinsicForDisplayHeight(40);

export function ClickaLogo({
  size = 'nav',
  className,
  href = '/',
  priority = false,
  variant = 'default',
}: ClickaLogoProps) {
  const image = (
    <Image
      src={CLICKA_LOGO_PATH}
      alt="clicka"
      width={INTRINSIC.width}
      height={INTRINSIC.height}
      priority={priority}
      sizes="(max-width: 640px) 120px, 160px"
      className={cn(
        'max-w-[min(42vw,160px)] object-contain object-left',
        LOGO_SIZE[size],
        variant === 'on-dark' && 'brightness-0 invert',
        className,
      )}
    />
  );

  if (href) {
    return (
      <Link
        href={href}
        className="inline-flex shrink-0 items-center py-1"
        aria-label="clicka.bg — начало"
      >
        {image}
      </Link>
    );
  }

  return <span className="inline-flex shrink-0 items-center py-1">{image}</span>;
}
