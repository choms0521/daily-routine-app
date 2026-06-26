/**
 * Insights read-model (Stage 1, dev doc §3): dayStatus 5-bucket boundaries and the
 * one-week historyRange. The partial-vs-empty boundary is slot-level, so a guard case
 * with a single checked slot (no category complete) must classify as 'partial' — this
 * protects the shared contract that C2/B3 depend on.
 */
import { dayStatus, exerciseRate, historyRange, weekReview, weekdayRate, weeklyTrend } from '@/domain/insights';
import { baseState, clone, withLogs } from '../fixtures/baseState';
import type { DayLog, Weekday } from '@/types/schema';

function log(date: string, aerobic: Record<string, boolean>, anaerobic: Record<string, boolean>): DayLog {
  return { date, routineId: 'rt_aXk92', versionId: 'v_001', checks: { aerobic, anaerobic } };
}

describe('dayStatus', () => {
  it("classifies a partly-checked day as 'partial' (Mon: aerobic done, x3 unchecked)", () => {
    expect(dayStatus(baseState, '2026-06-22')).toBe('partial');
  });

  it("classifies a fully-checked day as 'complete'", () => {
    const state = withLogs(baseState, {
      '2026-06-23': log('2026-06-23', { a1: true }, { x1: true, x2: true, x3: true }),
    });
    expect(dayStatus(state, '2026-06-23')).toBe('complete');
  });

  it("classifies an active slotted day with no log as 'empty' (Wed: aerobic slot, no log)", () => {
    expect(dayStatus(baseState, '2026-06-24')).toBe('empty');
  });

  it("classifies a rest day as 'rest' (Sun in restDays)", () => {
    expect(dayStatus(baseState, '2026-06-21')).toBe('rest');
  });

  it("classifies a day before the first activation as 'none'", () => {
    expect(dayStatus(baseState, '2026-05-31')).toBe('none');
  });

  it("classifies a single checked slot as 'partial', not 'empty' (slot-level boundary)", () => {
    // Mon has 1 aerobic + 3 anaerobic slots; checking only one anaerobic slot completes no
    // category, but one slot is checked -> partial. A category-level definition would
    // wrongly return 'empty' here, silently breaking the C2/B3 contract.
    const state = withLogs(baseState, {
      '2026-06-22': log('2026-06-22', {}, { x1: true }),
    });
    expect(dayStatus(state, '2026-06-22')).toBe('partial');
  });
});

describe('historyRange', () => {
  it('returns one ascending week with the fixture statuses (06-22..06-28)', () => {
    expect(historyRange(baseState, '2026-06-22', '2026-06-28')).toEqual([
      { date: '2026-06-22', status: 'partial' },
      { date: '2026-06-23', status: 'empty' },
      { date: '2026-06-24', status: 'empty' },
      { date: '2026-06-25', status: 'empty' },
      { date: '2026-06-26', status: 'empty' },
      { date: '2026-06-27', status: 'empty' },
      { date: '2026-06-28', status: 'rest' },
    ]);
  });

  it('returns [] when fromDate is after toDate', () => {
    expect(historyRange(baseState, '2026-06-28', '2026-06-22')).toEqual([]);
  });
});

// C2 — stats aggregations (dev doc stage-2-c2-stats §3). Rows are asserted via .find() rather
// than positional index so the tests do not silently couple to an unstated array order.
function weekdayOf2(rows: ReturnType<typeof weekdayRate>, weekday: Weekday) {
  return rows.find((r) => r.weekday === weekday);
}

describe('weekdayRate', () => {
  it('aggregates Monday as {done:1,total:2,pct:50} (aerobic done, anaerobic incomplete)', () => {
    const rows = weekdayRate(baseState, '2026-06-22', '2026-06-28');
    expect(weekdayOf2(rows, 'mon')).toEqual({ weekday: 'mon', done: 1, total: 2, pct: 50 });
  });

  it('keeps the weekProgress denominator: Tue 0/2, Wed..Sat 0/1, no log', () => {
    const rows = weekdayRate(baseState, '2026-06-22', '2026-06-28');
    expect(weekdayOf2(rows, 'tue')).toEqual({ weekday: 'tue', done: 0, total: 2, pct: 0 });
    for (const day of ['wed', 'thu', 'fri', 'sat'] as Weekday[]) {
      expect(weekdayOf2(rows, day)).toEqual({ weekday: day, done: 0, total: 1, pct: 0 });
    }
  });

  it('omits Sunday (rest) — a zero-denominator weekday is not emitted', () => {
    const rows = weekdayRate(baseState, '2026-06-22', '2026-06-28');
    expect(weekdayOf2(rows, 'sun')).toBeUndefined();
  });

  it('outputs rows in canonical mon..sun order regardless of date-encounter order', () => {
    const rows = weekdayRate(baseState, '2026-06-22', '2026-06-28');
    expect(rows.map((r) => r.weekday)).toEqual(['mon', 'tue', 'wed', 'thu', 'fri', 'sat']);
  });

  it('sums the same weekday across a two-week range (denominator must accumulate)', () => {
    // 06-15..06-28 spans two Mondays (06-15, 06-22). Only 06-22 has a log, so Monday is
    // 1 done out of 2×2 = 4 category-slots. A non-accumulating bug would report total 2.
    const rows = weekdayRate(baseState, '2026-06-15', '2026-06-28');
    expect(weekdayOf2(rows, 'mon')).toEqual({ weekday: 'mon', done: 1, total: 4, pct: 25 });
  });

  it('returns [] for an empty range (fromDate after toDate)', () => {
    expect(weekdayRate(baseState, '2026-06-28', '2026-06-22')).toEqual([]);
  });
});

describe('exerciseRate', () => {
  it('joins by exercise name: 러닝 가볍게 1/2/50 (Mon checked + Fri unchecked, same name)', () => {
    const rows = exerciseRate(baseState, '2026-06-22', '2026-06-28');
    expect(rows.find((r) => r.name === '러닝 가볍게')).toEqual({ name: '러닝 가볍게', done: 1, total: 2, pct: 50 });
  });

  it('counts a checked slot once: 푸시업 1/1/100, 턱걸이 1/1/100, 덤벨 로우 0/1/0', () => {
    const rows = exerciseRate(baseState, '2026-06-22', '2026-06-28');
    expect(rows.find((r) => r.name === '푸시업')).toEqual({ name: '푸시업', done: 1, total: 1, pct: 100 });
    expect(rows.find((r) => r.name === '턱걸이')).toEqual({ name: '턱걸이', done: 1, total: 1, pct: 100 });
    expect(rows.find((r) => r.name === '덤벨 로우')).toEqual({ name: '덤벨 로우', done: 0, total: 1, pct: 0 });
  });

  it('keeps different names separate (러닝 중간 is not folded into 러닝 가볍게)', () => {
    const rows = exerciseRate(baseState, '2026-06-22', '2026-06-28');
    expect(rows.find((r) => r.name === '러닝 중간')).toEqual({ name: '러닝 중간', done: 0, total: 1, pct: 0 });
  });

  it('sorts by pct desc, then done desc, then name asc', () => {
    const rows = exerciseRate(baseState, '2026-06-22', '2026-06-28');
    const pcts = rows.map((r) => r.pct);
    const sortedDesc = [...pcts].sort((a, b) => b - a);
    expect(pcts).toEqual(sortedDesc);
    // 100% rows lead; among the 0% rows that follow, names are ascending.
    const zeroNames = rows.filter((r) => r.pct === 0).map((r) => r.name);
    expect(zeroNames).toEqual([...zeroNames].sort((a, b) => a.localeCompare(b)));
  });

  it('returns [] for an empty range (fromDate after toDate)', () => {
    expect(exerciseRate(baseState, '2026-06-28', '2026-06-22')).toEqual([]);
  });
});

describe('weeklyTrend', () => {
  it('returns two ascending week points with pct 0 then 13 (06-15 empty, 06-22 Mon done)', () => {
    expect(weeklyTrend(baseState, '2026-06-22', 2)).toEqual([
      { weekStart: '2026-06-15', done: 0, total: 8, pct: 0 },
      { weekStart: '2026-06-22', done: 1, total: 8, pct: 13 },
    ]);
  });

  it('snaps a mid-week anchor to its Monday', () => {
    // 2026-06-24 is a Wednesday; its week start is 2026-06-22.
    expect(weeklyTrend(baseState, '2026-06-24', 1)).toEqual([
      { weekStart: '2026-06-22', done: 1, total: 8, pct: 13 },
    ]);
  });

  it('returns [] when weeks <= 0', () => {
    expect(weeklyTrend(baseState, '2026-06-22', 0)).toEqual([]);
    expect(weeklyTrend(baseState, '2026-06-22', -3)).toEqual([]);
  });
});

// B3 — one-week retrospective (dev doc stage-3-b3 §3). The week (Mon..Sun) and the state fully
// determine the review; "today" is signature-only and does not cap the window.
describe('weekReview', () => {
  // The Tue 06-23 log completes every Tue category (aerobic a1 + anaerobic x1/x2/x3).
  const withTue = withLogs(baseState, {
    '2026-06-23': log('2026-06-23', { a1: true }, { x1: true, x2: true, x3: true }),
  });

  it('reviews the baseState week: only Monday partly done (dev doc §3.1)', () => {
    expect(weekReview(baseState, '2026-06-22', '2026-06-22')).toEqual({
      weekStart: '2026-06-22',
      progress: { done: 1, total: 8, pct: 13 },
      completedDays: 0, // Mon x3 unchecked -> not complete
      activeDays: 6, // Mon..Sat slotted; Sun rest excluded
      topWeekday: 'mon', // Mon 1/2 = 50%, the rest 0%
      missedWeekday: 'tue', // 0% tie -> Monday-first order picks Tue (Mon is the top, not a miss)
      deltaPct: 13, // this week pct 13 minus prior week (06-15) pct 0
    });
  });

  it('reviews the withTue week: Tuesday fully complete (dev doc §3.2)', () => {
    expect(weekReview(withTue, '2026-06-22', '2026-06-22')).toEqual({
      weekStart: '2026-06-22',
      progress: { done: 3, total: 8, pct: 38 }, // Mon aerobic 1 + Tue 2 = 3; round(3/8*100)=38
      completedDays: 1, // Tue all categories done
      activeDays: 6,
      topWeekday: 'tue', // Tue 100%
      missedWeekday: 'wed', // 0% tie -> earliest weekday after Mon/Tue is Wed
      deltaPct: 38,
    });
  });

  it('snaps a mid-week start to its Monday (06-24 Wed -> 06-22 week)', () => {
    expect(weekReview(baseState, '2026-06-24', '2026-06-24').weekStart).toBe('2026-06-22');
  });

  it('returns deltaPct null when the prior week has no active routine (dev doc EC3)', () => {
    // 2026-06-01 is a Monday; its prior week (05-25..05-31) is entirely before effectiveFrom
    // '2026-06-01', so the prior weekProgress denominator is 0 -> no delta to report.
    expect(weekReview(baseState, '2026-06-01', '2026-06-01').deltaPct).toBeNull();
  });

  it('handles an empty week: no active day -> null weekdays, zero counts, neutral delta', () => {
    // Strip every log and every activation so no day resolves a plan: the whole week is inactive.
    const inactive = clone(baseState);
    inactive.completionLogs = {};
    inactive.activationTimeline = [];
    const review = weekReview(inactive, '2026-06-22', '2026-06-22');
    expect(review.activeDays).toBe(0);
    expect(review.completedDays).toBe(0);
    expect(review.topWeekday).toBeNull();
    expect(review.missedWeekday).toBeNull();
    expect(review.progress).toEqual({ done: 0, total: 0, pct: 0 });
    expect(review.deltaPct).toBeNull(); // prior week also inactive
  });
});
