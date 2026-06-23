/**
 * Date utilities (Day 1 end conditions): Monday-start weeks, local-timezone date keys.
 */
import { addDays, compareDateKey, toDateKey, weekDays, weekdayOf, weekStartOf } from '@/domain/date';

describe('date utils', () => {
  it('weekdayOf maps 2026-06-22 to mon and 2026-06-21 to sun', () => {
    expect(weekdayOf('2026-06-22')).toBe('mon');
    expect(weekdayOf('2026-06-21')).toBe('sun');
    expect(weekdayOf('2026-06-24')).toBe('wed');
  });

  it('weekStartOf returns the Monday of the week', () => {
    expect(weekStartOf('2026-06-24')).toBe('2026-06-22'); // Wed -> Mon
    expect(weekStartOf('2026-06-22')).toBe('2026-06-22'); // Mon -> itself
    expect(weekStartOf('2026-06-21')).toBe('2026-06-15'); // Sun -> previous Mon
  });

  it('addDays handles positive, negative, and month/year boundaries', () => {
    expect(addDays('2026-06-22', 1)).toBe('2026-06-23');
    expect(addDays('2026-06-22', -1)).toBe('2026-06-21');
    expect(addDays('2026-06-30', 1)).toBe('2026-07-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('compareDateKey orders chronologically', () => {
    expect(compareDateKey('2026-06-01', '2026-06-22')).toBe(-1);
    expect(compareDateKey('2026-06-22', '2026-06-01')).toBe(1);
    expect(compareDateKey('2026-06-22', '2026-06-22')).toBe(0);
  });

  it('weekDays returns the 7 keys [Mon..Sun]', () => {
    expect(weekDays('2026-06-22')).toEqual([
      '2026-06-22',
      '2026-06-23',
      '2026-06-24',
      '2026-06-25',
      '2026-06-26',
      '2026-06-27',
      '2026-06-28',
    ]);
  });

  it('toDateKey extracts the local calendar date', () => {
    expect(toDateKey(new Date(2026, 5, 22))).toBe('2026-06-22'); // month index 5 = June
  });
});
