# Maestro E2E 흐름

핵심 사용자 흐름의 종단 간(E2E) 테스트이다.

## 상태

본 흐름은 각 단계 계획의 산출물로 작성했으나, 아직 CI에서 실행하지 않는다.

- 현재 환경에 `maestro` CLI가 설치되어 있지 않다.
- v1은 Expo Go를 대상으로 하는데, Maestro는 Expo Go를 프로젝트 URL로 안정적으로 구동하지 못한다. 따라서 본 흐름은 실제 번들 식별자(`appId`)를 가진 standalone/dev build를 전제한다. 실행하려면 `app.json`에 `ios.bundleIdentifier`를 설정하고 dev build를 만들어야 한다.
- Stage 3부터 Stage 2의 개발용 시드(devSeed)를 제거했다. 앱은 빈 상태로 시작하므로, 루틴이 필요한 흐름은 에디터로 먼저 루틴을 생성한다.

## 흐름 목록

| 파일 | 내용 |
|------|------|
| `stage2_chip_check.yaml` | 칩 체크 → 점등 → 진행률 증가 (사전에 활성 루틴 1개 필요) |
| `stage2_persist.yaml` | 체크가 앱 재시작 후에도 유지 (사전에 활성 루틴 1개 필요) |
| `stage3_create_edit.yaml` | 루틴 생성 → 활성화 → 체크 → 편집(새 버전) → 오늘/과거 유지 + 배너 |
| `stage3_switch.yaml` | 두 번째 루틴 생성 → 전환 확인 시트 → 내일부 전환 → 배너 |

> Stage 2 흐름은 devSeed 제거 이후 활성 루틴을 전제하므로, 단독 실행 시 `stage3_create_edit.yaml`로 먼저 루틴을 만든 뒤 이어서 실행한다.

## 동등한 결정적 커버리지 (현재 CI에서 실행됨)

같은 보장을 시뮬레이터나 Maestro 없이 Jest + React Native Testing Library로 검증한다.

- 칩 탭 → 진행률 옵티미스틱 갱신: `__tests__/integration/home.test.tsx`
- 재기동 유지(AC-5.1.2): `__tests__/store/actions.test.ts`
- 루틴 생성·편집(새 버전)·draft→커밋: `__tests__/integration/editor.test.tsx`, `__tests__/store/routineActions.test.ts`
- 활성 전환(내일부)·확인 시트·배지 이동·배너: `__tests__/store/setActiveRoutine.test.ts`, `__tests__/integration/library.test.tsx`, `__tests__/integration/home.test.tsx`
- 숨김·복제·삭제 가드(AC-5.4.3): `__tests__/store/libraryActions.test.ts`

## 실행 방법 (maestro와 dev build가 준비된 뒤)

```sh
maestro test maestro/stage3_create_edit.yaml
maestro test maestro/stage3_switch.yaml
```
