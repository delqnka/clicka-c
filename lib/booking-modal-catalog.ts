export type BookingCatalogVariant = {
  label: string;
  price: number;
  duration?: number;
};

export type BookingCatalogService = {
  id: string;
  name: string;
  description?: string;
  category?: string;
  price?: number;
  duration: number;
  variants?: BookingCatalogVariant[];
  payment_type?: 'none' | 'deposit' | 'full';
  deposit_amount?: number;
};

export type BookingRow = { id: string };

/** Index in expanded booking rows for a catalog service (+ optional variant). */
export function getBookingRowIndex(
  bookingRows: BookingRow[],
  catalogId: string,
  variantLabel?: string | null,
): number {
  if (variantLabel) {
    return bookingRows.findIndex((row) => row.id === `${catalogId}::${variantLabel}`);
  }
  const exact = bookingRows.findIndex((row) => row.id === catalogId);
  if (exact >= 0) return exact;
  return bookingRows.findIndex((row) => row.id.startsWith(`${catalogId}::`));
}

export function isCatalogServiceSelected(
  selectedIdxs: number[],
  bookingRows: BookingRow[],
  catalog: BookingCatalogService,
  variantLabel?: string | null,
): boolean {
  if (catalog.variants?.length) {
    const label = variantLabel ?? catalog.variants[0]?.label;
    const idx = label ? getBookingRowIndex(bookingRows, catalog.id, label) : -1;
    return idx >= 0 && selectedIdxs.includes(idx);
  }
  const idx = getBookingRowIndex(bookingRows, catalog.id);
  return idx >= 0 && selectedIdxs.includes(idx);
}

export function getCatalogDisplayPriceDuration(
  catalog: BookingCatalogService,
  variantLabel?: string | null,
): { price: number; duration: number } {
  const variants = catalog.variants ?? [];
  if (variants.length > 0) {
    const label = variantLabel ?? variants[0]!.label;
    const variant = variants.find((v) => v.label === label) ?? variants[0]!;
    return {
      price: Number(variant.price ?? catalog.price ?? 0) || 0,
      duration: Math.max(5, Number(variant.duration ?? catalog.duration ?? 30) || 30),
    };
  }
  return {
    price: Number(catalog.price ?? 0) || 0,
    duration: Math.max(5, Number(catalog.duration ?? 30) || 30),
  };
}
