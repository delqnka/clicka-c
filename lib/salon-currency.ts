/** Валута за публичния салонен сайт, резервации и правни документи. */
export const SALON_CURRENCY_CODE = 'EUR' as const;

export const SALON_CURRENCY_SYMBOL = '€';

/** Текст за общи условия / правни документи. */
export const SALON_LEGAL_PRICE_NOTICE =
  'Посочените цени на услугите са в евро (EUR) с включен ДДС, освен ако изрично не е посочено друго.';

/** Официален фиксиран курс за периода на двойно обозначаване BGN/EUR. */
export const EUR_TO_BGN_RATE = 1.95583;

/** "299 €" -> "299 € (584.79 лв.)" — изисква се по закон за периода на двойно обозначаване. */
export function formatSalonPrice(amount: number): string {
  const value = Number(amount);
  if (!Number.isFinite(value)) return `— ${SALON_CURRENCY_SYMBOL}`;
  const rounded = Math.round(value * 100) / 100;
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
  const bgn = (rounded * EUR_TO_BGN_RATE).toFixed(2);
  return `${text} ${SALON_CURRENCY_SYMBOL} (${bgn} лв.)`;
}

export function toBgn(eurAmount: number): number {
  return Number(eurAmount) * EUR_TO_BGN_RATE;
}

/** "299 € (584.79 лв.)" — изисква се по закон за периода на двойно обозначаване. */
export function formatDualEur(eurAmount: number): string {
  const value = Number(eurAmount);
  if (!Number.isFinite(value)) return `— ${SALON_CURRENCY_SYMBOL}`;
  const eur = Number.isInteger(value) ? String(value) : value.toFixed(2);
  const bgn = toBgn(value).toFixed(2);
  return `${eur} ${SALON_CURRENCY_SYMBOL} (${bgn} лв.)`;
}

/** Вариант за вече форматирано евро низ, напр. formatDualEurText("0.82") -> "0.82 € (1.60 лв.)" */
export function formatDualEurText(eurText: string): string {
  const value = Number(eurText);
  if (!Number.isFinite(value)) return eurText;
  return `${eurText} ${SALON_CURRENCY_SYMBOL} (${toBgn(value).toFixed(2)} лв.)`;
}
