/**
 * Dev-only seed data. Until Stage 3 ships the routine editor, the app has no in-app way
 * to create a routine, so a fresh install would only ever show the empty state. This
 * seeds the PRD 4.4 sample routine so the home can be exercised on the simulator during
 * Stage 2. Gated behind __DEV__ and removed once Stage 3 lands. The weekly routine has
 * all 7 weekdays defined, so it populates whatever the current real week is.
 */
import { CURRENT_SCHEMA_VERSION } from '@/domain/migration';
import type { AppState } from '@/types/schema';
import type { AppStoreApi } from '@/store/appStore';

export const SAMPLE_STATE: AppState = {
  schemaVersion: CURRENT_SCHEMA_VERSION,
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
  completionLogs: {},
  settings: { activeRoutineId: 'rt_aXk92' },
};

/** Seed the sample routine into an empty store (dev only). No-op if routines exist. */
export function seedIfEmpty(store: AppStoreApi): void {
  if (store.getState().state.routines.length > 0) return;
  store.setState({ state: SAMPLE_STATE, hydrated: true });
}
