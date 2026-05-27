/**
 * Маркетинг начало (sleek landing) — видео фон по желание.
 * В .env.local: NEXT_PUBLIC_HERO_VIDEO_WEBM, NEXT_PUBLIC_HERO_VIDEO_MP4, NEXT_PUBLIC_HERO_POSTER
 */
export const CLICKA_LOGO_PATH = '/clicka-logo.png';

export const clickaMarketingSite = {
  name: 'clicka.bg',
  logoSrc: CLICKA_LOGO_PATH,
  legal: 'Clicka',
  title: 'clicka.bg — Собствен сайт с резервации за твоя салон',
  description:
    'Готов за 15 минути. 0% комисионна. Собствен домейн, Google ревюта, SEO 100/100.',
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
