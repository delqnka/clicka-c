export type PaymentType = 'none' | 'deposit' | 'full';

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
  payment_type?: PaymentType;
  deposit_amount?: number; // euros (e.g. 20 = €20)
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

function pickFirstNonEmptyString(...values: unknown[]): string {
  for (const value of values) {
    const text = String(value ?? '').trim();
    if (text) return text;
  }
  return '';
}

function assignUniqueServiceId(candidate: string, index: number, usedIds: Set<string>): string {
  let id = candidate.trim();
  if (!id || usedIds.has(id)) id = `svc-${index}`;
  while (usedIds.has(id)) id = `svc-${index}-${usedIds.size}`;
  usedIds.add(id);
  return id;
}

/** Parse salon services JSON for public UI and admin (skips unnamed rows, guarantees unique ids). */
export function parseSalonServices(raw: unknown): ParsedSalonService[] {
  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw) as unknown;
    } catch {
      return [];
    }
  }
  let items: unknown[] = [];
  if (Array.isArray(raw)) {
    items = raw;
  } else if (raw && typeof raw === 'object') {
    items = Object.values(raw as Record<string, unknown>);
  } else {
    return [];
  }

  const usedIds = new Set<string>();
  const out: ParsedSalonService[] = [];

  items.forEach((item, index) => {
    const row = item as Record<string, unknown>;
    const name = pickFirstNonEmptyString(row.name, row.service_name, row.serviceName, row.title);
    if (!name) return;

    const id = assignUniqueServiceId(String(row.id ?? ''), index, usedIds);
    const duration = Number(row.duration ?? row.duration_min ?? row.durationMin ?? 30) || 30;
    const priceRaw = row.price ?? row.service_price ?? row.servicePrice;
    const price = priceRaw != null ? Number(priceRaw) : undefined;
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
      category:
        pickFirstNonEmptyString(
          row.category,
          row.category_name,
          row.categoryName,
          row.service_category,
          row.serviceCategory,
        ) || undefined,
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
      ...(['none', 'deposit', 'full'].includes(String((s as unknown as ServiceItem).payment_type ?? ''))
        ? { payment_type: (s as unknown as ServiceItem).payment_type }
        : {}),
      ...((s as unknown as ServiceItem).deposit_amount != null && Number.isFinite(Number((s as unknown as ServiceItem).deposit_amount))
        ? { deposit_amount: Math.max(0, Number((s as unknown as ServiceItem).deposit_amount)) }
        : {}),
    };
  });
}
