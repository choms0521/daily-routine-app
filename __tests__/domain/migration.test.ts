/**
 * Migration skeleton (Day 3 end conditions): current-version validation, v0 -> v1
 * upgrade, future-version rejection, and post-migration validation failure.
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
import { baseState, clone } from '../fixtures/baseState';

describe('migrate', () => {
  it('validates and returns a current-version AppState', () => {
    const result = migrate(clone(baseState));
    expect(result.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(result.routines[0].id).toBe('rt_aXk92');
  });

  it('upgrades a v0 payload to v1 via migrations[0]', () => {
    const v0 = clone(baseState) as Record<string, unknown>;
    v0.schemaVersion = 0;
    expect(migrate(v0).schemaVersion).toBe(1);
  });

  it('preserves past streak and weekProgress across the v0 -> v1 migration (T2)', () => {
    // baseState is the v0 data (neither fn reads schemaVersion), so before == data-at-v0.
    const today = '2026-06-22';
    const weekStart = weekStartOf(today);
    const beforeStreak = streak(baseState, today);
    const beforeProgress = weekProgress(baseState, weekStart);

    const v0 = clone(baseState) as Record<string, unknown>;
    v0.schemaVersion = 0;
    const migrated = migrate(v0);

    // The v0 -> v1 step only bumps schemaVersion; historical values must be unchanged (diff 0).
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
