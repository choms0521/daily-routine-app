/**
 * Zod schema validation (EC5): the canonical PRD 4.4 JSON parses, and a version with
 * a missing weekday key is rejected (7-weekday completeness is enforced).
 */
import { AppStateSchema } from '@/types/schema';
import { baseState, clone } from '../fixtures/baseState';

describe('AppStateSchema', () => {
  it('parses the canonical PRD 4.4 state without throwing', () => {
    expect(() => AppStateSchema.parse(baseState)).not.toThrow();
  });

  it('preserves the optional hidden flag when present', () => {
    const withHidden = clone(baseState);
    withHidden.routines[0].hidden = true;
    const parsed = AppStateSchema.parse(withHidden);
    expect(parsed.routines[0].hidden).toBe(true);
  });

  it('rejects a version whose days are missing a weekday key', () => {
    const broken = clone(baseState) as Record<string, any>;
    delete broken.routines[0].versions[0].days.sun;
    expect(() => AppStateSchema.parse(broken)).toThrow();
    // Sanity: all 7 weekday keys are required.
    expect(Object.keys(baseState.routines[0].versions[0].days)).toHaveLength(7);
  });

  it('rejects a routine with zero versions (min 1)', () => {
    const broken = clone(baseState) as Record<string, any>;
    broken.routines[0].versions = [];
    expect(() => AppStateSchema.parse(broken)).toThrow();
  });

  it('accepts a null activeRoutineId', () => {
    const noActive = clone(baseState);
    noActive.settings.activeRoutineId = null;
    expect(() => AppStateSchema.parse(noActive)).not.toThrow();
  });
});
