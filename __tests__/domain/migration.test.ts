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
