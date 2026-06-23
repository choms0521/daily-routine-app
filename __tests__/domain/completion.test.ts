/**
 * Completion derivations (Day 2 end conditions): categoryDone, isRestDay, hasAnySlot,
 * dayComplete, all null-safe.
 */
import { categoryDone, dayComplete, hasAnySlot, isRestDay } from '@/domain/completion';
import { baseState, clone, withLogs } from '../fixtures/baseState';

describe('categoryDone', () => {
  it('is true when every slot of a non-empty category is checked', () => {
    // 2026-06-22 aerobic has a1 = true.
    expect(categoryDone(baseState, '2026-06-22', 'aerobic')).toBe(true);
  });

  it('is false when any slot is unchecked', () => {
    // 2026-06-22 anaerobic has x3 = false.
    expect(categoryDone(baseState, '2026-06-22', 'anaerobic')).toBe(false);
  });

  it('is false for an empty category (0 slots)', () => {
    // Wednesday anaerobic is empty.
    expect(categoryDone(baseState, '2026-06-24', 'anaerobic')).toBe(false);
  });

  it('is false for a day with no log', () => {
    expect(categoryDone(baseState, '2026-06-20', 'aerobic')).toBe(false);
  });
});

describe('isRestDay', () => {
  it('is true for a weekday listed in restDays', () => {
    expect(isRestDay(baseState, '2026-06-21')).toBe(true); // Sun
  });

  it('is false for a non-rest weekday', () => {
    expect(isRestDay(baseState, '2026-06-22')).toBe(false); // Mon
  });

  it('is false when no version is active', () => {
    expect(isRestDay(baseState, '2026-05-31')).toBe(false);
  });
});

describe('hasAnySlot', () => {
  it('is true when the day has slots', () => {
    expect(hasAnySlot(baseState, '2026-06-22')).toBe(true);
  });

  it('is false for a rest day with no slots', () => {
    expect(hasAnySlot(baseState, '2026-06-21')).toBe(false); // Sun: empty
  });

  it('is false when no version is active', () => {
    expect(hasAnySlot(baseState, '2026-05-31')).toBe(false);
  });
});

describe('dayComplete', () => {
  it('is false when a category is incomplete', () => {
    expect(dayComplete(baseState, '2026-06-22')).toBe(false); // anaerobic x3 unchecked
  });

  it('is true when every non-empty category is done', () => {
    const complete = withLogs(baseState, {
      '2026-06-22': {
        date: '2026-06-22',
        routineId: 'rt_aXk92',
        versionId: 'v_001',
        checks: { aerobic: { a1: true }, anaerobic: { x1: true, x2: true, x3: true } },
      },
    });
    expect(dayComplete(complete, '2026-06-22')).toBe(true);
  });

  it('is false on a rest day', () => {
    expect(dayComplete(baseState, '2026-06-21')).toBe(false); // Sun
  });

  it('is false for a day with no log', () => {
    expect(dayComplete(baseState, '2026-06-20')).toBe(false);
  });

  it('only requires non-empty categories (single-category day)', () => {
    // Wednesday has aerobic only; checking a1 completes the day.
    const wed = withLogs(clone(baseState), {
      '2026-06-24': {
        date: '2026-06-24',
        routineId: 'rt_aXk92',
        versionId: 'v_001',
        checks: { aerobic: { a1: true }, anaerobic: {} },
      },
    });
    expect(dayComplete(wed, '2026-06-24')).toBe(true);
  });
});
