/**
 * Pure editor-draft ops (spec stage-3 §3.3). Every op must return a new object and never
 * mutate the input — nested immutable updates are exactly where mutation bugs hide.
 */
import {
  addSlot,
  draftFromRoutine,
  emptyDraft,
  isSaveable,
  moveSlot,
  removeSlot,
  setName,
  toggleRestDay,
} from '@/domain/routineDraft';
import { WEEKDAYS } from '@/types/schema';
import { baseState } from '../fixtures/baseState';

const routine = baseState.routines[0];

describe('emptyDraft', () => {
  it('has a blank name, no rest days, and all 7 weekdays present and empty', () => {
    const d = emptyDraft();
    expect(d.name).toBe('');
    expect(d.restDays).toEqual([]);
    expect(Object.keys(d.days).sort()).toEqual([...WEEKDAYS].sort());
    for (const weekday of WEEKDAYS) {
      expect(d.days[weekday]).toEqual({ aerobic: [], anaerobic: [] });
    }
  });
});

describe('draftFromRoutine', () => {
  it('copies name and restDays and strips slotIds to {name, sets}', () => {
    const d = draftFromRoutine(routine);
    expect(d.name).toBe('여름 컨디셔닝');
    expect(d.restDays).toEqual(['sun']);
    expect(d.days.mon.aerobic).toEqual([{ name: '러닝 가볍게', sets: '30분' }]);
    expect(d.days.mon.anaerobic).toEqual([
      { name: '푸시업', sets: '4 × 한계-2' },
      { name: '턱걸이', sets: '4세트' },
      { name: '덤벨 로우', sets: '3세트' },
    ]);
    // No slotId leaks into the draft.
    expect(Object.keys(d.days.mon.aerobic[0])).toEqual(['name', 'sets']);
  });

  it('does not mutate the source routine version', () => {
    const before = JSON.stringify(routine);
    draftFromRoutine(routine);
    expect(JSON.stringify(routine)).toBe(before);
  });
});

describe('isSaveable', () => {
  it('is false for a blank or whitespace-only name, true otherwise', () => {
    expect(isSaveable(emptyDraft())).toBe(false);
    expect(isSaveable(setName(emptyDraft(), '   '))).toBe(false);
    expect(isSaveable(setName(emptyDraft(), '아침 루틴'))).toBe(true);
  });
});

describe('setName', () => {
  it('returns a new draft with the name set, leaving the original untouched', () => {
    const a = emptyDraft();
    const b = setName(a, '저녁 루틴');
    expect(b.name).toBe('저녁 루틴');
    expect(a.name).toBe('');
    expect(b).not.toBe(a);
  });
});

describe('toggleRestDay', () => {
  it('adds then removes a weekday, immutably', () => {
    const a = emptyDraft();
    const b = toggleRestDay(a, 'sun');
    expect(b.restDays).toEqual(['sun']);
    expect(a.restDays).toEqual([]);
    const c = toggleRestDay(b, 'sun');
    expect(c.restDays).toEqual([]);
    expect(b.restDays).toEqual(['sun']);
  });
});

describe('addSlot / removeSlot', () => {
  it('adds a slot to a category immutably', () => {
    const a = emptyDraft();
    const b = addSlot(a, 'mon', 'aerobic', { name: '러닝', sets: '30분' });
    expect(b.days.mon.aerobic).toEqual([{ name: '러닝', sets: '30분' }]);
    expect(a.days.mon.aerobic).toEqual([]); // original untouched
    expect(b.days.mon).not.toBe(a.days.mon);
  });

  it('removes the slot at an index immutably', () => {
    let d = emptyDraft();
    d = addSlot(d, 'mon', 'anaerobic', { name: '푸시업', sets: '3세트' });
    d = addSlot(d, 'mon', 'anaerobic', { name: '스쿼트', sets: '4세트' });
    const removed = removeSlot(d, 'mon', 'anaerobic', 0);
    expect(removed.days.mon.anaerobic).toEqual([{ name: '스쿼트', sets: '4세트' }]);
    expect(d.days.mon.anaerobic).toHaveLength(2); // original untouched
  });
});

describe('moveSlot', () => {
  const seed = () => {
    let d = emptyDraft();
    d = addSlot(d, 'mon', 'aerobic', { name: 'A', sets: '1' });
    d = addSlot(d, 'mon', 'aerobic', { name: 'B', sets: '2' });
    d = addSlot(d, 'mon', 'aerobic', { name: 'C', sets: '3' });
    return d;
  };

  it('moves a slot down and up, immutably', () => {
    const d = seed();
    const down = moveSlot(d, 'mon', 'aerobic', 0, 1);
    expect(down.days.mon.aerobic.map((s) => s.name)).toEqual(['B', 'A', 'C']);
    const up = moveSlot(down, 'mon', 'aerobic', 2, -1);
    expect(up.days.mon.aerobic.map((s) => s.name)).toEqual(['B', 'C', 'A']);
    expect(d.days.mon.aerobic.map((s) => s.name)).toEqual(['A', 'B', 'C']); // original untouched
  });

  it('is a no-op (same reference) for out-of-range moves', () => {
    const d = seed();
    expect(moveSlot(d, 'mon', 'aerobic', 0, -1)).toBe(d); // top up
    expect(moveSlot(d, 'mon', 'aerobic', 2, 1)).toBe(d); // bottom down
    expect(moveSlot(d, 'mon', 'aerobic', 9, 1)).toBe(d); // bad index
  });
});
