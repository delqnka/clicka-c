import type { ServiceItem } from '@/lib/salon-services';

export async function analyzePriceListImages(
  imageUrls: string[],
): Promise<ServiceItem[]> {
  const merged: ServiceItem[] = [];
  const seen = new Set<string>();

  for (const imageUrl of imageUrls) {
    const res = await fetch('/api/analyze-price-list', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageUrl }),
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
    for (const row of parsed) {
      const name = String(row.name ?? '').trim();
      if (!name) continue;
      const item: ServiceItem = {
        name,
        price: Math.max(0, Number(row.price) || 0),
        duration_min: Math.max(5, Number(row.duration_min) || 30),
      };
      const key = `${item.name.toLowerCase()}|${item.price}|${item.duration_min}`;
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
