const TRANSLIT: Record<string, string> = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'g',
  д: 'd',
  е: 'e',
  ж: 'zh',
  з: 'z',
  и: 'i',
  й: 'y',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'h',
  ц: 'ts',
  ч: 'ch',
  ш: 'sh',
  щ: 'sht',
  ъ: 'a',
  ь: '',
  ю: 'yu',
  я: 'ya',
};

/** URL-friendly slug from title — Cyrillic transliteration, lowercase, hyphens. */
export function toBlogSlug(title: string): string {
  const base = title
    .trim()
    .toLowerCase()
    .split('')
    .map((c) => TRANSLIT[c] ?? c)
    .join('')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

  return base || 'statia';
}

export function ensureUniqueBlogSlug(base: string, used: Set<string>): string {
  const normalized = toBlogSlug(base);
  if (!used.has(normalized)) return normalized;

  for (let i = 2; i < 1000; i++) {
    const suffix = `-${i}`;
    const candidate = `${normalized.slice(0, 80 - suffix.length)}${suffix}`;
    if (!used.has(candidate)) return candidate;
  }

  return `${normalized.slice(0, 70)}-${Date.now()}`;
}
