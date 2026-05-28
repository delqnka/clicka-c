/** Heuristic + cleanup for service categories (price-list import, admin). */

const RULES: { category: string; patterns: RegExp[] }[] = [
  {
    category: 'Маникюр',
    patterns: [/маникюр/i, /ноктопласт/i, /гел\s*лак/i, /нокти/i, /олиг/i, /нокът/i],
  },
  {
    category: 'Педикюр',
    patterns: [/педикюр/i, /крака/i, /стъпал/i],
  },
  {
    category: 'Боядисване',
    patterns: [
      /боядис/i,
      /боя\b/i,
      /тонир/i,
      /колорист/i,
      /балаяж/i,
      /омбре/i,
      /airtouch/i,
      /корен/i,
      /изрусв/i,
      /изрусяв/i,
    ],
  },
  {
    category: 'Мелиране и кичури',
    patterns: [/мелир/i, /кичур/i, /фоли/i, /highlight/i, /плитк/i],
  },
  {
    category: 'Подстригване',
    patterns: [/подстриг/i, /стрижк/i, /прическ/i, /фризьор/i, /коса\b/i, /детск/i],
  },
  {
    category: 'Брада и бръснене',
    patterns: [/брад/i, /бръсн/i, /мустак/i, /брада/i],
  },
  {
    category: 'Вежди и мигли',
    patterns: [/вежд/i, /мигл/i, /ламинир/i, /оформ.*вежд/i],
  },
  {
    category: 'Грим',
    patterns: [/грим/i, /макиаж/i, /make\s*up/i],
  },
  {
    category: 'Козметика',
    patterns: [/почистван/i, /пилинг/i, /маска\b/i, /хидрат/i, /лице\b/i, /козмет/i, /фacial/i],
  },
  {
    category: 'Епилация',
    patterns: [/епилац/i, /кола\s*маска/i, /вакс/i, /лазер/i, /депилац/i],
  },
  {
    category: 'Масаж',
    patterns: [/масаж/i, /терапи/i, /релакс/i],
  },
  {
    category: 'Сватбени и прически',
    patterns: [/сватб/i, /прическа/i, /плитк/i, /кок/i],
  },
];

export function inferServiceCategory(serviceName: string, salonCategory?: string): string | undefined {
  const name = serviceName.trim();
  if (!name) return undefined;

  for (const rule of RULES) {
    if (rule.patterns.some((p) => p.test(name))) return rule.category;
  }

  const salon = (salonCategory ?? '').trim();
  if (salon) return salon;

  return undefined;
}

export function normalizeCategoryLabel(raw: string): string {
  const t = raw.trim().replace(/\s+/g, ' ');
  if (!t) return '';
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** Carry section headers down the list when only some rows have category. */
export function fillMissingCategories(
  items: { name: string; category?: string }[],
  salonCategory?: string,
): void {
  let last = '';
  for (const item of items) {
    const c = normalizeCategoryLabel(item.category ?? '');
    if (c) {
      last = c;
      item.category = c;
      continue;
    }
    if (last) {
      item.category = last;
      continue;
    }
    const inferred = inferServiceCategory(item.name, salonCategory);
    if (inferred) item.category = inferred;
  }
}
