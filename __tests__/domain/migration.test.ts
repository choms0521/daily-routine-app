/**
 * Migration (Day 3 end conditions): current-version validation, v0 -> v1 -> v2 upgrade,
 * the v1 -> v2 reminder injection (B1 §3.1), the fresh-install seed (B1 §3.2),
 * future-version rejection, and post-migration validation failure.
 */
import {
  CURRENT_SCHEMA_VERSION,
  IncompatibleVersionError,
  migrate,
  migrateSharePayload,
} from '@/domain/migration';
import { weekStartOf } from '@/domain/date';
import { weekProgress } from '@/domain/progress';
import { streak } from '@/domain/streak';
import { emptyAppState } from '@/store/appStore';
import { baseState, clone } from '../fixtures/baseState';

describe('migrate', () => {
  it('validates and returns a current-version AppState', () => {
    const result = migrate(clone(baseState));
    expect(result.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(result.routines[0].id).toBe('rt_aXk92');
  });

  it('upgrades a v0 payload through to the current version', () => {
    const v0 = clone(baseState) as Record<string, unknown>;
    v0.schemaVersion = 0;
    // v0 runs migrations[0] (v0->v1) then migrations[1] (v1->v2) sequentially.
    expect(migrate(v0).schemaVersion).toBe(2);
  });

  it('injects the reminder default on the v1 -> v2 step, preserving settings (B1 §3.1)', () => {
    // Strip reminder from a v1 clone so this asserts injection (the default appears), not just
    // preservation of an already-present value.
    const v1 = clone(baseState) as { schemaVersion: number; settings: Record<string, unknown> };
    v1.schemaVersion = 1;
    delete v1.settings.reminder;

    const result = migrate(v1);
    expect(result.schemaVersion).toBe(2);
    expect(result.settings.reminder).toEqual({ enabled: false, time: '20:00' });
    // Existing settings (and the rest of the additive-only state) survive untouched.
    expect(result.settings.activeRoutineId).toBe('rt_aXk92');
    expect(result.routines).toEqual(baseState.routines);
    expect(result.completionLogs).toEqual(baseState.completionLogs);
    expect(result.activationTimeline).toEqual(baseState.activationTimeline);
  });

  it('seeds the reminder default on a fresh install (B1 §3.2)', () => {
    const fresh = emptyAppState();
    expect(fresh.schemaVersion).toBe(2);
    expect(fresh.settings.reminder).toEqual({ enabled: false, time: '20:00' });
  });

  it('preserves past streak and weekProgress across migration (T2)', () => {
    // baseState is the reference data (neither fn reads schemaVersion), so before == that data.
    const today = '2026-06-22';
    const weekStart = weekStartOf(today);
    const beforeStreak = streak(baseState, today);
    const beforeProgress = weekProgress(baseState, weekStart);

    const v0 = clone(baseState) as Record<string, unknown>;
    v0.schemaVersion = 0;
    const migrated = migrate(v0);

    // Migration is additive (version bump + reminder seed); historical values are unchanged.
    expect(streak(migrated, today)).toBe(beforeStreak);
    expect(weekProgress(migrated, weekStart)).toEqual(beforeProgress);
  });

  it('throws IncompatibleVersionError for a future schemaVersion', () => {
    const future = clone(baseState) as Record<string, unknown>;
    future.schemaVersion = 99;
    expect(() => migrate(future)).toThrow(IncompatibleVersionError);
  });

  it('throws when validation fails after migration (missing weekday)', () => {
    const broken = clone(baseState) as Record<string, any>;
    delete broken.routines[0].versions[0].days.sun;
    expect(() => migrate(broken)).toThrow();
  });
});

describe('migrateSharePayload', () => {
  it('passes the payload through unchanged in v1', () => {
    const payload = { schemaVersion: 1, foo: 'bar' };
    expect(migrateSharePayload(payload, 1)).toBe(payload);
  });
});
