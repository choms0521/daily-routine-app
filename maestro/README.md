# Maestro E2E flows (Stage 2)

End-to-end flows for the core daily-check loop.

## Status

These flows are authored deliverables for the Stage 2 plan. They are **not run in CI yet**:

- The `maestro` CLI is not installed in the current environment.
- v1 targets Expo Go, which Maestro cannot drive by project URL reliably; the flows assume
  a standalone/dev build with a real bundle id (`appId`). Set `ios.bundleIdentifier` in
  `app.json` and produce a dev build before running them.

## Equivalent deterministic coverage (runs in CI today)

The same guarantees are verified by Jest + React Native Testing Library, independent of a
simulator or Maestro:

- Chip tap -> optimistic progress update (1/8 -> 2/8): `__tests__/integration/home.test.tsx`
- Restart persistence (AC-5.1.2): `__tests__/store/actions.test.ts`
- Save-failure toast, week navigation: `__tests__/integration/home.test.tsx`

## Running (once maestro + a dev build exist)

```sh
maestro test maestro/stage2_chip_check.yaml
maestro test maestro/stage2_persist.yaml
```
