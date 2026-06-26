/**
 * Canonical fixture: the PRD 4.4 reference JSON as an AppState object.
 * Reused across domain tests. Routine `rt_aXk92` / version `v_001`,
 * restDays ['sun'], effectiveFrom '2026-06-01'. Today in most cases is '2026-06-22' (Mon).
 *
 * Helper builders return new objects (immutability) so a test never mutates the base.
 */
import type { Activation, AppState, DayLog } from '@/types/schema';

export const baseState: AppState = {
  schemaVersion: 1,
  routines: [
    {
      id: 'rt_aXk92',
      name: '여름 컨디셔닝',
      createdAt: '2026-06-01T08:00:00Z',
      versions: [
        {
          versionId: 'v_001',
          createdAt: '2026-06-01T08:00:00Z',
          restDays: ['sun'],
          days: {
            mon: {
              aerobic: [{ slotId: 'a1', name: '러닝 가볍게', sets: '30분' }],
              anaerobic: [
                { slotId: 'x1', name: '푸시업', sets: '4 × 한계-2' },
                { slotId: 'x2', name: '턱걸이', sets: '4세트' },
                { slotId: 'x3', name: '덤벨 로우', sets: '3세트' },
              ],
            },
            tue: {
              aerobic: [{ slotId: 'a1', name: '러닝 중간', sets: '30~35분' }],
              anaerobic: [
                { slotId: 'x1', name: '고블릿 스쿼트', sets: '4 × 12' },
                { slotId: 'x2', name: '런지', sets: '3세트' },
                { slotId: 'x3', name: '플랭크', sets: '3 × 40초' },
              ],
            },
            wed: { aerobic: [{ slotId: 'a1', name: '걷기', sets: '30분' }], anaerobic: [] },
            thu: { aerobic: [{ slotId: 'a1', name: '인터벌', sets: '25~30분' }], anaerobic: [] },
            fri: { aerobic: [{ slotId: 'a1', name: '러닝 가볍게', sets: '30분' }], anaerobic: [] },
            sat: { aerobic: [{ slotId: 'a1', name: '롱런', sets: '40~50분' }], anaerobic: [] },
            sun: { aerobic: [], anaerobic: [] },
          },
        },
      ],
    },
  ],
  activationTimeline: [{ effectiveFrom: '2026-06-01', routineId: 'rt_aXk92', versionId: 'v_001' }],
  completionLogs: {
    '2026-06-22': {
      date: '2026-06-22',
      routineId: 'rt_aXk92',
      versionId: 'v_001',
      checks: {
        aerobic: { a1: true },
        anaerobic: { x1: true, x2: true, x3: false },
      },
    },
  },
  // reminder is a schemaVersion-2 field; included so this AppState-typed literal compiles. The
  // schemaVersion stays 1 (this fixture is the v1 reference data), so migration tests exercise
  // the v1 -> v2 step; injection vs. preservation is split in migration.test.ts.
  settings: { activeRoutineId: 'rt_aXk92', reminder: { enabled: false, time: '20:00' } },
};

/** Deep clone via JSON round-trip (fixture has no functions/dates). */
export function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/** Return a new state with extra activation events appended (append-only, immutable). */
export function withActivations(state: AppState, ...events: Activation[]): AppState {
  return { ...state, activationTimeline: [...state.activationTimeline, ...events] };
}

/** Return a new state with the given day logs merged in. */
export function withLogs(state: AppState, logs: Record<string, DayLog>): AppState {
  return { ...state, completionLogs: { ...state.completionLogs, ...logs } };
}
