/**
 * Маркетинг начало (sleek landing) — видео фон по желание.
 * В .env.local: NEXT_PUBLIC_HERO_VIDEO_WEBM, NEXT_PUBLIC_HERO_VIDEO_MP4, NEXT_PUBLIC_HERO_POSTER
 */
export const CLICKA_LOGO_PATH = '/clicka-logo.png';

/** Rose → pink → purple, used on marketing CTAs and booking modal accents */
export const CLICKA_MARKETING_GRADIENT =
  'linear-gradient(135deg, #e11d48, #db2777, #a855f7)';

export const CLICKA_MARKETING_GRADIENT_STYLE = {
  backgroundImage: CLICKA_MARKETING_GRADIENT,
} as const;

/** 1px continuous gradient ring on rounded corners (no p-[npx] gap at edges) */
export const CLICKA_MARKETING_GRADIENT_BORDER_STYLE = {
  border: '1px solid transparent',
  backgroundImage: `linear-gradient(#ffffff, #ffffff), ${CLICKA_MARKETING_GRADIENT}`,
  backgroundOrigin: 'border-box',
  backgroundClip: 'padding-box, border-box',
} as const;

export const clickaMarketingSite = {
  name: 'clicka.bg',
  logoSrc: CLICKA_LOGO_PATH,
  legal: 'Clicka',
  title: 'clicka.bg | Собствен сайт с резервации за фризьори и салони',
  description:
    'За фризьори, маникюристи и козметици. Готов веднага след плащане. 0% комисионна. Собствен домейн, AI рецепционист, Google ревюта.',
  hero: {
    webm: (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_HERO_VIDEO_WEBM) || '',
    mp4: (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_HERO_VIDEO_MP4) || '',
    poster: (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_HERO_POSTER) || '',
  },
} as const;

export function getHeroVideoSources() {
  const w = clickaMarketingSite.hero.webm;
  const m = clickaMarketingSite.hero.mp4;
  const has = Boolean(w || m);
  return { webm: w || null, mp4: m || null, poster: clickaMarketingSite.hero.poster || null, has };
}
