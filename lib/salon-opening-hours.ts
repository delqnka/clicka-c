/** Работно време в стил BOOKA уеб: ключове Monday..Sunday, стойност null = затворено. */

const DAY_NAMES_EN = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;

const CLICKA_TO_EN: Record<string, (typeof DAY_NAMES_EN)[number]> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
};

export type OpeningDayRecord = Record<string, { open: string; close: string } | null>;

const DEFAULT_OPENING_HOURS: Record<(typeof DAY_NAMES_EN)[number], { open: string; close: string }> = {
  Monday: { open: '09:00', close: '18:00' },
  Tuesday: { open: '09:00', close: '18:00' },
  Wednesday: { open: '09:00', close: '18:00' },
  Thursday: { open: '09:00', close: '18:00' },
  Friday: { open: '09:00', close: '18:00' },
  Saturday: { open: '10:00', close: '16:00' },
  Sunday: { open: '10:00', close: '16:00' },
};

/** Clicka `working_hours` (monday..sunday) + опционален `opening_hours` JSON от Neon → Monday..Sunday. */
export function mergeOpeningHours(
  workingHours: Record<string, { open?: string; close?: string; closed?: boolean }> | null | undefined,
  openingHoursOverride: unknown
): OpeningDayRecord {
  const out: OpeningDayRecord = {};
  for (const d of DAY_NAMES_EN) out[d] = null;

  const fromOverride = normalizeOpeningOverride(openingHoursOverride);
  if (fromOverride) {
    for (const d of DAY_NAMES_EN) {
      if (fromOverride[d] !== undefined) out[d] = fromOverride[d];
    }
    return out;
  }

  if (workingHours && typeof workingHours === 'object') {
    for (const [k, v] of Object.entries(workingHours)) {
      const en = CLICKA_TO_EN[k.toLowerCase()];
      if (!en) continue;
      if (!v || v.closed || !v.open || !v.close) out[en] = null;
      else out[en] = { open: v.open, close: v.close };
    }
  }
  return out;
}

function normalizeOpeningOverride(raw: unknown): OpeningDayRecord | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const out: OpeningDayRecord = {};
  let any = false;
  for (const d of DAY_NAMES_EN) {
    const v = o[d];
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      const open = String((v as { open?: unknown }).open ?? '');
      const close = String((v as { close?: unknown }).close ?? '');
      if (open && close) {
        out[d] = { open, close };
        any = true;
      } else {
        out[d] = null;
      }
    }
  }
  return any ? out : null;
}

export function getCurrentStatusString(openingHours: OpeningDayRecord): string {
  const hasAny = Object.keys(openingHours).some((k) => openingHours[k] != null);
  const now = new Date();
  const dayIndex = (now.getDay() + 6) % 7;
  const dayName = DAY_NAMES_EN[dayIndex];
  const hours = hasAny ? (openingHours[dayName] ?? null) : (DEFAULT_OPENING_HOURS[dayName] ?? null);
  if (!hours) return 'Затворено';
  const [openH, openM] = hours.open.split(':').map(Number);
  const [closeH, closeM] = hours.close.split(':').map(Number);
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const openMins = openH * 60 + openM;
  const closeMins = closeH * 60 + closeM;
  const formatTime = (h: number, m: number) =>
    `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}\u00a0ч`;
  if (nowMins < openMins) return `Затворено - отваря в ${formatTime(openH, openM)}`;
  if (nowMins >= closeMins) return `Затворено - отваря утре в ${formatTime(openH, openM)}`;
  return `Отворено - затваря в ${formatTime(closeH, closeM)}`;
}

export function getEffectiveHours(
  openingHours: OpeningDayRecord,
  dayName: (typeof DAY_NAMES_EN)[number]
): { open: string; close: string } | null {
  const hasAnyHours = Object.keys(openingHours).some((k) => openingHours[k] != null);
  if (hasAnyHours) {
    return openingHours[dayName] ?? null;
  }
  return DEFAULT_OPENING_HOURS[dayName] ?? null;
}

export const DAY_LABELS_BG: Record<string, string> = {
  Monday: 'Понеделник',
  Tuesday: 'Вторник',
  Wednesday: 'Сряда',
  Thursday: 'Четвъртък',
  Friday: 'Петък',
  Saturday: 'Събота',
  Sunday: 'Неделя',
};

export { DAY_NAMES_EN };
