/** Валута за публичния салонен сайт, резервации и правни документи. */
export const SALON_CURRENCY_CODE = 'EUR' as const;

export const SALON_CURRENCY_SYMBOL = '€';

/** Текст за общи условия / правни документи. */
export const SALON_LEGAL_PRICE_NOTICE =
  'Посочените цени на услугите са в евро (EUR) с включен ДДС, освен ако изрично не е посочено друго.';

/** "299" -> "299 €" */
export function formatSalonPrice(amount: number): string {
  const value = Number(amount);
  if (!Number.isFinite(value)) return `— ${SALON_CURRENCY_SYMBOL}`;
  const rounded = Math.round(value * 100) / 100;
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
  return `${text} ${SALON_CURRENCY_SYMBOL}`;
}

export function toBgn(eurAmount: number): number {
  return Number(eurAmount);
}

/** "299 €" */
export function formatDualEur(eurAmount: number): string {
  const value = Number(eurAmount);
  if (!Number.isFinite(value)) return `— ${SALON_CURRENCY_SYMBOL}`;
  const eur = Number.isInteger(value) ? String(value) : value.toFixed(2);
  return `${eur} ${SALON_CURRENCY_SYMBOL}`;
}

/** Връща частите поотделно — вторичната стойност вече е празна. */
export function formatDualEurParts(eurAmount: number): { eur: string; bgn: string } {
  const value = Number(eurAmount);
  if (!Number.isFinite(value)) return { eur: `— ${SALON_CURRENCY_SYMBOL}`, bgn: '' };
  const eur = Number.isInteger(value) ? String(value) : value.toFixed(2);
  return { eur: `${eur} ${SALON_CURRENCY_SYMBOL}`, bgn: '' };
}

/** Вариант за вече форматирано евро низ, напр. formatDualEurText("0.82") -> "0.82 €" */
export function formatDualEurText(eurText: string): string {
  const value = Number(eurText);
  if (!Number.isFinite(value)) return eurText;
  const eur = Number.isInteger(value) ? String(value) : value.toFixed(2);
  return `${eur} ${SALON_CURRENCY_SYMBOL}`;
}
