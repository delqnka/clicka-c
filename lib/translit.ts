// Bulgarian Cyrillic -> Latin transliteration, shared by client matching and
// client search so a person written "Ваня Александрова" and "Vanya
// Aleksandrova" is treated as one — regardless of which script was typed.
// Pure and client-safe (no server-only imports).

const CYRILLIC_TO_LATIN: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ж: 'zh', з: 'z', и: 'i',
  й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's',
  т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sht',
  ъ: 'a', ь: 'y', ю: 'yu', я: 'ya',
};

/** Lowercased, Cyrillic transliterated to Latin. Spacing and punctuation are
 * preserved, so it stays usable for substring search. */
export function transliterateBgLatin(value: string | null | undefined): string {
  const lowered = String(value ?? '').toLocaleLowerCase('bg');
  return Array.from(lowered)
    .map((ch) => CYRILLIC_TO_LATIN[ch] ?? ch)
    .join('');
}

/** Identity key for a client name: transliterated and reduced to letters and
 * digits, so script, spacing and punctuation never split one person. */
export function clientNameKey(value: string | null | undefined): string {
  return transliterateBgLatin(String(value ?? '').trim()).replace(/[^a-z0-9]/g, '');
}
