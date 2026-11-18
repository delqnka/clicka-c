import { describe, expect, it } from 'vitest';

import { getClassSlotsForDateWithOverrides } from '@/lib/class-schedule';

describe('getClassSlotsForDateWithOverrides', () => {
  it('replaces an old one-off occurrence after the recurring trainer has changed', () => {
    const slots = getClassSlotsForDateWithOverrides(
      {
        '4': [
          { start: '08:40', end: '09:30', className: 'Пилатес Реформър', trainer: 'Жени', capacity: 5 },
          { start: '10:00', end: '10:50', className: 'Пилатес Реформър', trainer: 'Жени', capacity: 5 },
          { start: '19:00', end: '19:50', className: 'Stretch Mat', trainer: 'Жени', capacity: 4 },
        ],
      },
      '2026-11-12',
      [
        {
          originalDate: '2026-11-12', originalTime: '08:40', originalClassName: 'Пилатес Реформър', originalTrainer: 'Ива',
          date: '2026-11-12', start: '08:40', end: '09:30', className: 'Пилатес Реформър', trainer: 'Жени', capacity: 5,
        },
        {
          originalDate: '2026-11-12', originalTime: '19:00', originalClassName: 'Stretch Mat', originalTrainer: 'Жени',
          date: '2026-11-12', start: '18:00', end: '18:50', className: 'Stretch Mat', trainer: 'Жени', capacity: 4,
        },
      ],
    );

    expect(slots.map((slot) => `${slot.start}|${slot.trainer}|${slot.className}`)).toEqual([
      '08:40|Жени|Пилатес Реформър',
      '10:00|Жени|Пилатес Реформър',
      '18:00|Жени|Stretch Mat',
    ]);
  });
});
