/**
 * Draft -> version/routine commit (spec stage-3 §3.4, §6). Verifies the positional slotId
 * scheme, sequential version ids, Zod validity, and that committing never mutates inputs.
 */
import {
  buildRoutine,
  buildVersion,
  firstVersionId,
  nextVersionId,
} from '@/domain/routineBuild';
import { addSlot, emptyDraft, setName, toggleRestDay } from '@/domain/routineDraft';
import { RoutineSchema, RoutineVersionSchema, WEEKDAYS } from '@/types/schema';
import { baseState } from '../fixtures/baseState';

function sampleDraft() {
  let d = emptyDraft();
  d = setName(d, '  아침 루틴  ');
  d = toggleRestDay(d, 'sun');
  d = addSlot(d, 'mon', 'aerobic', { name: '러닝', sets: '30분' });
  d = addSlot(d, 'mon', 'anaerobic', { name: '푸시업', sets: '3세트' });
  d = addSlot(d, 'mon', 'anaerobic', { name: '스쿼트', sets: '4세트' });
  return d;
}

describe('version id helpers', () => {
  it('firstVersionId is v_001', () => {
    expect(firstVersionId()).toBe('v_001');
  });

  it('nextVersionId is sequential and zero-padded', () => {
    expect(nextVersionId(baseState.routines[0])).toBe('v_002'); // routine has 1 version
  });
});

describe('buildVersion', () => {
  const version = buildVersion(sampleDraft(), { versionId: 'v_007', createdAt: '2026-06-24T00:00:00Z' });

  it('assigns positional slotIds: aerobic a1.., anaerobic x1..', () => {
    expect(version.days.mon.aerobic).toEqual([{ slotId: 'a1', name: '러닝', sets: '30분' }]);
    expect(version.days.mon.anaerobic).toEqual([
      { slotId: 'x1', name: '푸시업', sets: '3세트' },
      { slotId: 'x2', name: '스쿼트', sets: '4세트' },
    ]);
  });

  it('carries versionId, createdAt, restDays, and all 7 weekdays', () => {
    expect(version.versionId).toBe('v_007');
    expect(version.createdAt).toBe('2026-06-24T00:00:00Z');
    expect(version.restDays).toEqual(['sun']);
    expect(Object.keys(version.days).sort()).toEqual([...WEEKDAYS].sort());
  });

  it('produces a Zod-valid RoutineVersion', () => {
    expect(() => RoutineVersionSchema.parse(version)).not.toThrow();
  });
});

describe('buildRoutine', () => {
  const routine = buildRoutine(sampleDraft(), {
    routineId: 'rt_new1',
    versionId: 'v_001',
    createdAt: '2026-06-24T00:00:00Z',
  });

  it('trims the name and creates a single v_001 version', () => {
    expect(routine.id).toBe('rt_new1');
    expect(routine.name).toBe('아침 루틴'); // trimmed
    expect(routine.createdAt).toBe('2026-06-24T00:00:00Z');
    expect(routine.versions).toHaveLength(1);
    expect(routine.versions[0].versionId).toBe('v_001');
  });

  it('produces a Zod-valid Routine', () => {
    expect(() => RoutineSchema.parse(routine)).not.toThrow();
  });

  it('does not mutate the source draft', () => {
    const draft = sampleDraft();
    const before = JSON.stringify(draft);
    buildRoutine(draft, { routineId: 'x', versionId: 'v_001', createdAt: 'z' });
    expect(JSON.stringify(draft)).toBe(before);
  });
});
