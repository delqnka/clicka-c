export type CancelPolicyAction = 'full_refund' | 'keep_deposit' | 'keep_full';

export type CancellationPolicyResult = {
  isFreeCancel: boolean;
  refundCents: number;
  keepCents: number;
  policyMessage: string;
};

export type ResetBodyCancellationPolicyResult = {
  kind: 'full' | 'partial' | 'late';
  creditShouldBeRestored: boolean;
  refundCents: number;
  keepCents: number;
  policyMessage: string;
  creditMessage: (details?: {
    packageName?: string;
    remainingSessions?: number;
    expiresAt?: string;
  }) => string;
};

function formatEuros(cents: number) {
  return `€${(cents / 100).toFixed(2)}`;
}

function startMinutesFromDate(date: Date) {
  return date.getHours() * 60 + date.getMinutes();
}

export function shouldUseResetBodyCancellationPolicy(opts: {
  salonName?: string | null;
  salonSlug?: string | null;
}) {
  const haystack = `${opts.salonName ?? ''} ${opts.salonSlug ?? ''}`.toLowerCase();
  return haystack.includes('reset body') || haystack.includes('resetbody');
}

export function evaluateResetBodyCancellationPolicy(opts: {
  bookingDatetime: Date;
  amountPaidCents: number;
  now?: Date;
}): ResetBodyCancellationPolicyResult {
  const { bookingDatetime, amountPaidCents } = opts;
  const now = opts.now ?? new Date();
  const hoursUntil = (bookingDatetime.getTime() - now.getTime()) / (1000 * 60 * 60);
  const startMinutes = startMinutesFromDate(bookingDatetime);
  const afternoonStart = 13 * 60;
  const isAfternoonClass = startMinutes >= afternoonStart;
  const lateThresholdHours = isAfternoonClass ? 6 : 12;
  const classWindow = isAfternoonClass ? 'следобеден' : 'сутрешен';
  const lateWindow = isAfternoonClass ? 'по-малко от 6 часа' : 'по-малко от 12 часа';

  if (hoursUntil >= 24) {
    return {
      kind: 'full',
      creditShouldBeRestored: true,
      refundCents: amountPaidCents,
      keepCents: 0,
      policyMessage:
        amountPaidCents > 0
          ? `Отказът е направен 24 или повече часа преди класа. Ще получите пълно възстановяване на сумата ${formatEuros(amountPaidCents)}.`
          : 'Отказът е направен 24 или повече часа преди класа. Няма санкция.',
      creditMessage: (details) => details?.packageName
        ? `Отказът е направен 24 или повече часа преди класа. Кредитът е върнат към пакета „${details.packageName}“. Остават ${details.remainingSessions} кредита, валидни до ${details.expiresAt}.`
        : 'Отказът е направен 24 или повече часа преди класа. Ако резервацията е била покрита от пакет, кредитът се връща към плана.',
    };
  }

  if (hoursUntil >= lateThresholdHours) {
    const refundCents = Math.floor(amountPaidCents / 2);
    const keepCents = amountPaidCents - refundCents;
    return {
      kind: 'partial',
      creditShouldBeRestored: true,
      refundCents,
      keepCents,
      policyMessage:
        amountPaidCents > 0
          ? `Отказът е направен в допустимия прозорец за ${classWindow} клас. Ще получите 50% възстановяване на сумата (${formatEuros(refundCents)}), а ${formatEuros(keepCents)} се задържат.`
          : `Отказът е направен в допустимия прозорец за ${classWindow} клас. Няма санкция.`,
      creditMessage: (details) => details?.packageName
        ? `Отказът е направен в допустимия прозорец за ${classWindow} клас. Кредитът е върнат към пакета „${details.packageName}“. Остават ${details.remainingSessions} кредита, валидни до ${details.expiresAt}.`
        : `Отказът е направен в допустимия прозорец за ${classWindow} клас. Ако резервацията е била покрита от пакет, кредитът не се губи.`,
    };
  }

  return {
    kind: 'late',
    creditShouldBeRestored: false,
    refundCents: 0,
    keepCents: amountPaidCents,
    policyMessage:
      amountPaidCents > 0
        ? `Късна отмяна: ${classWindow} клас е отказан ${lateWindow} преди началото. Платената сума ${formatEuros(amountPaidCents)} не се възстановява.`
        : `Късна отмяна: ${classWindow} клас е отказан ${lateWindow} преди началото.`,
    creditMessage: () =>
      `Късна отмяна: ${classWindow} клас е отказан ${lateWindow} преди началото. Ако резервацията е била покрита от пакет, един кредит остава използван. Неявяването се третира като късна отмяна.`,
  };
}

export function formatResetBodyCancellationPolicySummary(locale: 'bg' | 'en' = 'bg') {
  if (locale === 'en') {
    return [
      'Cancel 24+ hours before class for a full refund or restored package credit.',
      'Morning classes (7:30-13:00): 12-24 hours before class gives a 50% refund; package credit is restored.',
      'Afternoon classes (13:00-19:00): 6-24 hours before class gives a 50% refund; package credit is restored.',
      'Late cancellations and no-shows lose the paid amount or one package credit.',
    ].join(' ');
  }

  return [
    'При отмяна 24+ часа преди клас получавате пълно възстановяване на сумата или връщане на кредит.',
    'За сутрешни класове (7:30-13:00) при отмяна 12-24 часа преди клас се възстановяват 50%; при план кредитът не се губи.',
    'За следобедни класове (13:00-19:00) при отмяна 6-24 часа преди клас се възстановяват 50%; при план кредитът не се губи.',
    'Късна отмяна и неявяване водят до загуба на сумата или един кредит.',
  ].join(' ');
}

export function shortResetBodyCancellationPolicySummary(locale: 'bg' | 'en' = 'bg') {
  return locale === 'en'
    ? 'Cancellation policy: 24+ hours before class gives a full refund or restored credit. In the partial-cancellation windows, card payments receive 50% back and package credits are restored. Late cancellations and no-shows lose the paid amount or one credit.'
    : 'Политика при отказ: 24+ часа преди клас получавате пълно възстановяване или връщане на кредит. В прозорците за частична отмяна картовите плащания получават 50% възстановяване, а пакетните кредити се връщат. Късна отмяна и неявяване водят до загуба на сумата или един кредит.';
}

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
          ? `Ще получите пълно възстановяване на сумата ${formatEuros(amountPaidCents)}.`
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
        ? `Депозитът от €${(keepCents / 100).toFixed(2)} се задържа. Ще получите възстановяване на сумата €${(refundCents / 100).toFixed(2)}.`
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
    return `Безплатно отказване до ${window} преди часа. След срока — пълно възстановяване.`;
  }
  if (cancelPolicyAction === 'keep_full') {
    return `Безплатно отказване до ${window} преди часа. След срока платената сума не се връща.`;
  }
  const depositStr = depositAmountEuros ? ` (€${depositAmountEuros})` : '';
  return `Безплатно отказване до ${window} преди часа. След срока депозитът${depositStr} се задържа.`;
}
