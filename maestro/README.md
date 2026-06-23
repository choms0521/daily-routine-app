# Maestro E2E 흐름 (Stage 2)

핵심 일일 체크 루프의 종단 간(E2E) 테스트 흐름이다.

## 상태

본 흐름은 Stage 2 계획의 산출물로 작성했으나, 아직 CI에서 실행하지 않는다.

- 현재 환경에 `maestro` CLI가 설치되어 있지 않다.
- v1은 Expo Go를 대상으로 하는데, Maestro는 Expo Go를 프로젝트 URL로 안정적으로 구동하지 못한다. 따라서 본 흐름은 실제 번들 식별자(`appId`)를 가진 standalone/dev build를 전제한다. 실행하려면 `app.json`에 `ios.bundleIdentifier`를 설정하고 dev build를 만들어야 한다.

## 동등한 결정적 커버리지 (현재 CI에서 실행됨)

같은 보장을 시뮬레이터나 Maestro 없이 Jest + React Native Testing Library로 검증한다.

- 칩 탭 → 진행률 옵티미스틱 갱신(1/8 → 2/8): `__tests__/integration/home.test.tsx`
- 재기동 유지(AC-5.1.2): `__tests__/store/actions.test.ts`
- 저장 실패 토스트, 주 이동: `__tests__/integration/home.test.tsx`

## 실행 방법 (maestro와 dev build가 준비된 뒤)

```sh
maestro test maestro/stage2_chip_check.yaml
maestro test maestro/stage2_persist.yaml
```
