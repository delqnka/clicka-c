/** Client-safe image list helpers (no database imports). */

export function mergeUniqueImageLists(...lists: (string[] | null | undefined)[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    for (const raw of list) {
      const url = String(raw ?? '').trim();
      if (!url || url.startsWith('blob:') || seen.has(url)) continue;
      seen.add(url);
      out.push(url);
    }
  }
  return out;
}
