export type CancelPolicyAction = 'full_refund' | 'keep_deposit' | 'keep_full';

export type CancellationPolicyResult = {
  isFreeCancel: boolean;
  refundCents: number;
  keepCents: number;
  policyMessage: string;
};

export function evaluateCancellationPolicy(opts: {
  bookingDatetime: Date;
  amountPaidCents: number;
  depositAmountEuros?: number;
  cancelPolicyHours: number;
  cancelPolicyAction: CancelPolicyAction;
}): CancellationPolicyResult {
  const { bookingDatetime, amountPaidCents, depositAmountEuros, cancelPolicyHours, cancelPolicyAction } = opts;

  const hoursUntil = (bookingDatetime.getTime() - Date.now()) / (1000 * 60 * 60);
  const isFreeCancel = hoursUntil >= cancelPolicyHours;

  if (isFreeCancel || amountPaidCents === 0 || cancelPolicyAction === 'full_refund') {
    return {
      isFreeCancel,
      refundCents: amountPaidCents,
      keepCents: 0,
      policyMessage:
        amountPaidCents > 0
          ? `Ще получите пълен refund от €${(amountPaidCents / 100).toFixed(2)}.`
          : 'Резервацията ще бъде отказана.',
    };
  }

  if (cancelPolicyAction === 'keep_full') {
    return {
      isFreeCancel: false,
      refundCents: 0,
      keepCents: amountPaidCents,
      policyMessage: `Тъй като отказвате по-малко от ${cancelPolicyHours} ч. преди часа, платената сума (€${(amountPaidCents / 100).toFixed(2)}) не се връща.`,
    };
  }

  // keep_deposit
  const depositCents = depositAmountEuros ? Math.round(depositAmountEuros * 100) : 0;
  const keepCents = Math.min(depositCents, amountPaidCents);
  const refundCents = Math.max(0, amountPaidCents - keepCents);

  return {
    isFreeCancel: false,
    refundCents,
    keepCents,
    policyMessage:
      refundCents > 0
        ? `Депозитът от €${(keepCents / 100).toFixed(2)} се задържа. Ще получите €${(refundCents / 100).toFixed(2)} обратно.`
        : `Депозитът от €${(keepCents / 100).toFixed(2)} се задържа при отказване.`,
  };
}

/** Human-readable summary shown to client before they cancel. */
export function formatPolicySummary(opts: {
  cancelPolicyHours: number;
  cancelPolicyAction: CancelPolicyAction;
  depositAmountEuros?: number;
}): string {
  const { cancelPolicyHours, cancelPolicyAction, depositAmountEuros } = opts;

  const window =
    cancelPolicyHours >= 48
      ? `${Math.round(cancelPolicyHours / 24)} дни`
      : `${cancelPolicyHours} часа`;

  if (cancelPolicyAction === 'full_refund') {
    return `Безплатно отказване до ${window} преди часа. След срока — пълен refund.`;
  }
  if (cancelPolicyAction === 'keep_full') {
    return `Безплатно отказване до ${window} преди часа. След срока платената сума не се връща.`;
  }
  const depositStr = depositAmountEuros ? ` (€${depositAmountEuros})` : '';
  return `Безплатно отказване до ${window} преди часа. След срока депозитът${depositStr} се задържа.`;
}
