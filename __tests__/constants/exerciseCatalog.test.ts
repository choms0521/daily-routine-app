/**
 * Catalog integrity: every item is well-formed and category filtering is exact. The catalog
 * is input-assist only, so the contract is just "valid, non-empty, correctly categorized".
 */
import { EXERCISE_CATALOG, catalogFor } from '@/constants/exerciseCatalog';
import { CategorySchema } from '@/types/schema';

describe('EXERCISE_CATALOG', () => {
  it('has only well-formed items (valid category, non-empty name and sets)', () => {
    for (const item of EXERCISE_CATALOG) {
      expect(() => CategorySchema.parse(item.category)).not.toThrow();
      expect(item.name.trim().length).toBeGreaterThan(0);
      expect(item.defaultSets.trim().length).toBeGreaterThan(0);
    }
  });

  it('offers both aerobic and anaerobic options', () => {
    expect(catalogFor('aerobic').length).toBeGreaterThan(0);
    expect(catalogFor('anaerobic').length).toBeGreaterThan(0);
  });

  it('catalogFor returns only the requested category', () => {
    expect(catalogFor('aerobic').every((i) => i.category === 'aerobic')).toBe(true);
    expect(catalogFor('anaerobic').every((i) => i.category === 'anaerobic')).toBe(true);
  });
});
