/**
 * Маркетинг начало (sleek landing) — видео фон по желание.
 * В .env.local: NEXT_PUBLIC_HERO_VIDEO_WEBM, NEXT_PUBLIC_HERO_VIDEO_MP4, NEXT_PUBLIC_HERO_POSTER
 */
export const clickaMarketingSite = {
  name: 'clicka.bg',
  legal: 'Clicka',
  title: 'clicka.bg — Твоята лична резервационна система, независима от платформи',
  description:
    'Собствен сайт с онлайн резервации за твоя бранд — готов за по-малко от 15 минути. Клиентите избират час, заявката идва при теб — без зависимост от чужди платформи.',
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
