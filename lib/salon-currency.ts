/** Валута за публичния салонен сайт, резервации и правни документи. */
export const SALON_CURRENCY_CODE = 'EUR' as const;

export const SALON_CURRENCY_SYMBOL = '€';

/** Текст за общи условия / правни документи. */
export const SALON_LEGAL_PRICE_NOTICE =
  'Посочените цени на услугите са в евро (EUR) с включен ДДС, освен ако изрично не е посочено друго.';

export function formatSalonPrice(amount: number): string {
  const value = Number(amount);
  if (!Number.isFinite(value)) return `— ${SALON_CURRENCY_SYMBOL}`;
  const rounded = Math.round(value * 100) / 100;
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
  return `${text} ${SALON_CURRENCY_SYMBOL}`;
}
