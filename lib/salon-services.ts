export type ServiceItem = {
  id?: string;
  name: string;
  description?: string;
  category?: string;
  price: number;
  duration_min: number;
  images?: string[];
  variants?: { label: string; price: number; duration?: number }[];
  assignedTeamMemberIds?: string[];
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
  assignedTeamMemberIds?: string[];
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
      ? (row.variants as unknown[])
          .map((variant): { label: string; price: number; duration?: number } | null => {
            if (!variant || typeof variant !== 'object') return null;
            const v = variant as Record<string, unknown>;
            const label = String(v.label ?? '').trim();
            if (!label) return null;
            const priceNum = Number(v.price ?? NaN);
            if (!Number.isFinite(priceNum)) return null;
            const durationNum = Number(v.duration ?? NaN);
            return {
              label,
              price: Math.max(0, priceNum),
              duration: Number.isFinite(durationNum) ? Math.max(5, Math.round(durationNum)) : undefined,
            };
          })
          .filter((variant): variant is { label: string; price: number; duration?: number } => variant !== null)
      : undefined;
    const images = Array.isArray(row.images)
      ? (row.images as unknown[])
          .map((image) => String(image ?? '').trim())
          .filter(Boolean)
      : undefined;
    const assignedTeamMemberIds = Array.isArray(row.assignedTeamMemberIds)
      ? [...new Set((row.assignedTeamMemberIds as unknown[])
          .map((id) => String(id ?? '').trim())
          .filter(Boolean))]
      : undefined;

    out.push({
      id,
      name,
      description: String(row.description ?? '').trim() || undefined,
      category: String(row.category ?? '').trim() || undefined,
      price: price != null && Number.isFinite(price) ? price : undefined,
      duration,
      images,
      variants: variants && variants.length > 0 ? variants : undefined,
      ...(assignedTeamMemberIds && assignedTeamMemberIds.length > 0
        ? { assignedTeamMemberIds }
        : {}),
    });
  });

  return out;
}

export function normalizeServices(raw: unknown): ServiceItem[] {
  return parseSalonServices(raw).map((s) => {
    const normalizedVariants = Array.isArray(s.variants)
      ? s.variants
          .map((variant) => ({
            label: String(variant.label ?? '').trim(),
            price: Math.max(0, Number(variant.price) || 0),
            duration:
              variant.duration != null && Number.isFinite(Number(variant.duration))
                ? Math.max(5, Math.round(Number(variant.duration)))
                : undefined,
          }))
          .filter((variant) => variant.label.length > 0)
      : [];

    const basePrice =
      normalizedVariants.length > 0
        ? normalizedVariants[0]!.price
        : Math.max(0, Number(s.price ?? 0) || 0);
    const baseDuration =
      normalizedVariants.length > 0
        ? Math.max(5, Number(normalizedVariants[0]!.duration ?? s.duration ?? 30) || 30)
        : Math.max(5, s.duration);

    return {
      id: s.id,
      name: s.name,
      description: s.description,
      category: s.category,
      price: basePrice,
      duration_min: baseDuration,
      ...(Array.isArray(s.images) && s.images.length > 0 ? { images: s.images } : {}),
      ...(normalizedVariants.length > 0 ? { variants: normalizedVariants } : {}),
      ...(Array.isArray(s.assignedTeamMemberIds) && s.assignedTeamMemberIds.length > 0
        ? { assignedTeamMemberIds: s.assignedTeamMemberIds }
        : {}),
    };
  });
}
