export type ServiceItem = {
  id?: string;
  name: string;
  description?: string;
  category?: string;
  price: number;
  duration_min: number;
};

export type ParsedSalonService = {
  id: string;
  name: string;
  description?: string;
  category?: string;
  price?: number;
  duration: number;
  images?: string[];
  variants?: { label: string; price: number; duration?: number }[];
};

function assignUniqueServiceId(candidate: string, index: number, usedIds: Set<string>): string {
  let id = candidate.trim();
  if (!id || usedIds.has(id)) id = `svc-${index}`;
  while (usedIds.has(id)) id = `svc-${index}-${usedIds.size}`;
  usedIds.add(id);
  return id;
}

/** Parse salon services JSON for public UI and admin (skips unnamed rows, guarantees unique ids). */
export function parseSalonServices(raw: unknown): ParsedSalonService[] {
  if (!Array.isArray(raw)) return [];

  const usedIds = new Set<string>();
  const out: ParsedSalonService[] = [];

  raw.forEach((item, index) => {
    const row = item as Record<string, unknown>;
    const name = String(row.name ?? '').trim();
    if (!name) return;

    const id = assignUniqueServiceId(String(row.id ?? ''), index, usedIds);
    const duration = Number(row.duration ?? row.duration_min ?? 30) || 30;
    const price = row.price != null ? Number(row.price) : undefined;
    const variants = Array.isArray(row.variants)
      ? (row.variants as { label: string; price: number; duration?: number }[])
      : undefined;

    out.push({
      id,
      name,
      description: String(row.description ?? '').trim() || undefined,
      category: String(row.category ?? '').trim() || undefined,
      price: price != null && Number.isFinite(price) ? price : undefined,
      duration,
      images: Array.isArray(row.images) ? (row.images as string[]) : undefined,
      variants,
    });
  });

  return out;
}

export function normalizeServices(raw: unknown): ServiceItem[] {
  return parseSalonServices(raw).map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    category: s.category,
    price: Math.max(0, Number(s.price ?? 0) || 0),
    duration_min: Math.max(5, s.duration),
  }));
}
