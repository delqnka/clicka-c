import type { ServiceItem } from '@/lib/salon-services';
import {
  fillMissingCategories,
  inferServiceCategory,
  normalizeCategoryLabel,
} from '@/lib/service-category-inference';

export type PriceListAnalysisOptions = {
  categoryHints?: string[];
  salonCategory?: string;
};

export async function analyzePriceListImages(
  imageUrls: string[],
  options: PriceListAnalysisOptions = {},
): Promise<ServiceItem[]> {
  const merged: ServiceItem[] = [];
  const seen = new Set<string>();
  const { categoryHints = [], salonCategory = '' } = options;

  for (const imageUrl of imageUrls) {
    const res = await fetch('/api/analyze-price-list', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageUrl, categoryHints, salonCategory }),
    });

    const data = (await res.json().catch(() => ({}))) as
      | ServiceItem[]
      | { error?: string };

    if (!res.ok) {
      const message =
        !Array.isArray(data) && typeof data.error === 'string'
          ? data.error
          : 'Грешка при анализ на ценоразписа';
      throw new Error(message);
    }

    const parsed = Array.isArray(data) ? data : [];
    const batch: {
      name: string;
      price: number;
      duration_min: number;
      category?: string;
    }[] = [];
    for (const row of parsed) {
      const name = String(row.name ?? '').trim();
      if (!name) continue;
      const category = normalizeCategoryLabel(String(row.category ?? ''));
      batch.push({
        name,
        price: Math.max(0, Number(row.price) || 0),
        duration_min: Math.max(5, Number(row.duration_min) || 30),
        category: category || undefined,
      });
    }
    fillMissingCategories(batch, salonCategory);

    for (const entry of batch) {
      let category =
        entry.category || inferServiceCategory(entry.name, salonCategory) || undefined;
      if (category) category = normalizeCategoryLabel(category);

      const item: ServiceItem = {
        name: entry.name,
        price: entry.price,
        duration_min: entry.duration_min,
        ...(category ? { category } : {}),
      };
      const key = `${item.name.toLowerCase()}|${item.price}|${item.duration_min}|${(item.category ?? '').toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(item);
    }
  }

  return merged;
}

export function mergeServiceLists(existing: ServiceItem[], incoming: ServiceItem[]): ServiceItem[] {
  const seen = new Set(
    existing.map(s => `${s.name.toLowerCase()}|${s.price}|${s.duration_min}`),
  );
  const next = [...existing];
  for (const item of incoming) {
    const key = `${item.name.toLowerCase()}|${item.price}|${item.duration_min}`;
    if (seen.has(key)) continue;
    seen.add(key);
    next.push(item);
  }
  return next;
}
