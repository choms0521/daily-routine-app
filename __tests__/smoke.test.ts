/**
 * Environment smoke test: verifies that Jest + TypeScript transform work before
 * any domain code is written. Remove or keep as a trivial sanity check.
 */
describe('jest environment', () => {
  it('runs TypeScript test files', () => {
    const sum: number = 1 + 1;
    expect(sum).toBe(2);
  });
});
