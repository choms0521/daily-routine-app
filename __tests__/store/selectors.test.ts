/**
 * Home selectors (Day 2): they delegate to Stage 1 domain and shape per-day view models.
 * Verified against the canonical PRD 4.4 fixture (week of Mon 2026-06-22, total = 8).
 */
import {
  isCurrentWeek,
  selectActiveRoutineName,
  selectDayViewModels,
  selectStreak,
  selectWeekLabel,
  selectWeekProgress,
} from '@/store/selectors';
import { baseState, clone } from '../fixtures/baseState';

const MON = '2026-06-22';

describe('home selectors', () => {
  it('returns the active routine name', () => {
    expect(selectActiveRoutineName(baseState)).toBe('여름 컨디셔닝');
  });

  it('returns null when no routine is active', () => {
    const none = clone(baseState);
    none.settings.activeRoutineId = null;
    expect(selectActiveRoutineName(none)).toBeNull();
  });

  it('delegates week progress to the domain (denominator 8)', () => {
    expect(selectWeekProgress(baseState, MON)).toEqual({ done: 1, total: 8, pct: 13 });
  });

  it('delegates streak to the domain (today in progress -> 0)', () => {
    expect(selectStreak(baseState, MON)).toBe(0);
  });

  it('detects the current week', () => {
    expect(isCurrentWeek(MON, MON)).toBe(true);
    expect(isCurrentWeek('2026-06-15', MON)).toBe(false);
  });

  it('builds this-week / last-week labels', () => {
    expect(selectWeekLabel(MON, MON)).toBe('6.22 – 6.28 · 이번 주');
    expect(selectWeekLabel('2026-06-15', MON)).toBe('6.15 – 6.21 · 지난 주');
  });

  it('builds 7 day view models with today and rest day flagged', () => {
    const vms = selectDayViewModels(baseState, MON, MON);
    expect(vms).toHaveLength(7);
    expect(vms[0]).toMatchObject({
      date: MON,
      weekdayLabel: '월',
      dateLabel: '6.22',
      isToday: true,
      isRestDay: false,
    });
    expect(vms[6]).toMatchObject({ date: '2026-06-28', weekdayLabel: '일', isRestDay: true });
    expect(vms[0].aerobicDone).toBe(true);
    expect(vms[0].anaerobicDone).toBe(false);
  });
});
