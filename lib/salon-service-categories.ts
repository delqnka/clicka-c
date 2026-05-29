import { normalizeCategoryLabel } from '@/lib/service-category-inference';

export type ServiceCategoryTab = { id: string | null; label: string };

/** Category saved on the service row in admin (no guessing from service name). */
export function resolveServiceCategory(service: { category?: string }): string {
  return normalizeCategoryLabel(service.category ?? '');
}

/**
 * Price lists often tag only the first row in a section — carry that category down
 * to following services until the next explicit category (same as admin import).
 */
export function enrichServiceCategories<T extends { category?: string }>(services: T[]): T[] {
  const out = services.map((s) => ({
    ...s,
    category: resolveServiceCategory(s) || undefined,
  }));
  let last = '';
  for (const item of out) {
    if (item.category) {
      last = item.category;
    } else if (last) {
      item.category = last;
    }
  }
  return out;
}

export function buildServiceCategoryTabs(
  services: { category?: string }[],
): ServiceCategoryTab[] {
  const labels = new Set<string>();
  for (const svc of services) {
    const cat = resolveServiceCategory(svc);
    if (cat) labels.add(cat);
  }
  const sorted = [...labels].sort((a, b) => a.localeCompare(b, 'bg'));
  return [{ id: null, label: 'Всички' }, ...sorted.map((cat) => ({ id: cat, label: cat }))];
}

export function serviceMatchesCategory(
  service: { category?: string },
  selectedCategory: string | null,
): boolean {
  if (!selectedCategory) return true;
  return resolveServiceCategory(service) === selectedCategory;
}
