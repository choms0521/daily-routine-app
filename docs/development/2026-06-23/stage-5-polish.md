# Stage 5 개발계획서 — M5 다듬기 (마이크로인터랙션·마이그레이션·백업/복원)

> 문서 종류: 개발계획서 (docs/development)
> 작성일: 2026-06-23
> 상위 출처: `docs/spec/2026-06-23/stage-5-polish.md`, `docs/prd/2026-06-23/workout-tracker-prd.md` (v1.2)
> 마일스톤: PRD 9.3 M5

---

## 1. 개요

| 항목 | 내용 |
|------|------|
| 목표 | Stage 1~4를 출시 품질로 마감한다. 마이크로인터랙션 4종 정교화, 마이그레이션 완성, 로컬 백업/복원 구현, 성능 점검 수행. |
| 의존 | Stage 1(도메인 코어·Repository·마이그레이션 골격), Stage 2(홈·칩·기본 애니메이션), Stage 3(에디터·라이브러리), Stage 4(공유 직렬화) 완료. |
| 기간 | 2~3일(풀타임). 풀타임 기준 하루 6~8시간. |
| 설계 참조 | `docs/spec/2026-06-23/stage-5-polish.md` |

---

## 2. Day별 Work Package

### Day 1 — 마이크로인터랙션 4종 (PRD 6.3)

**목표**: Stage 2에서 기본 동작만 있던 칩·진행률 바·바텀시트에 reanimated 정교화를 적용한다.

**산출물**

- `components/chip/` — 스케일 바운스(0.96→1.0)·완료 색 전환(150~200ms) 적용.
- `components/progress/` — 진행률 바 width 트윈 적용.
- `components/sheet/` — 드래그·딤·스냅 적용.

**작업**

1. 칩 컴포넌트에 `useSharedValue` + `withSequence(withTiming(0.96), withSpring(1.0))` 스케일 바운스 추가.
2. 칩 완료 상태 전환에 `useAnimatedStyle` + `withTiming({ duration: 175 })` 색 보간 추가. 색 값은 `theme/tokens.ts`에서만 참조.
3. 진행률 바 컴포넌트에 `pct` 변경 시 width `withTiming` 트윈 추가.
4. 바텀시트 컴포넌트에 드래그 제스처 핸들러·딤 불투명도 보간·임계치 스냅 추가.
5. 기능 회귀 없음 확인(칩 체크→저장→갱신 E2E가 Stage 2와 동일).

**측정 가능한 종료 조건**

- 칩 탭 시 스케일 0.96→1.0 바운스 시각 확인.
- 완료 시 색 전환이 약 175ms 내에 완료됨(Expo Dev Tools 타임라인 또는 수동 관찰).
- 진행률 바 width가 칩 토글 직후 트윈 적용됨.
- 바텀시트 드래그 후 임계치 이상이면 닫힘, 미만이면 스냅 복귀.
- `jest --testPathPattern=chip` + `jest --testPathPattern=progress` 기존 테스트 전부 통과(회귀 0건).

---

### Day 2 — 마이그레이션 완성·백업/복원·설정 탭 스캐폴딩 (PRD 8.4·8.5)

**목표**: `domain/migration.ts`를 실제 변환 함수 체계로 완성하고, 설정 탭 화면을 스캐폴딩하며, 로컬 백업/복원을 구현한다.

**산출물**

- `domain/migration.ts` — 순차 변환 체인, 자동 백업, 롤백 로직 완성.
- `app/(tabs)/settings.tsx` — 설정 탭 화면 스캐폴딩(탭 등록, 백업/복원·초기화 진입점 UI).
- `__tests__/domain/migration.test.ts` — 마이그레이션 왕복·롤백 테스트.
- `__tests__/backup.test.ts` — 백업 왕복 테스트.
- `__tests__/fixtures/` — 구 `schemaVersion` AppState 고정 데이터(fixture).

**작업**

1. `migrations` 레코드에 변환 함수 등록. 최소한 `migrations[0]`(v0→v1, `schemaVersion`만 1로 올리는 최소 변환 — spec stage-1 §3.6에 골격 정의됨)을 **실제 등록**해, fixture 테스트(T1)의 `migrate(state-v0)` 경로가 `migrations[0]` undefined로 인한 런타임 에러 없이 동작하게 한다. `migrate()` 함수에 순차 적용(`while state.schemaVersion < CURRENT_SCHEMA_VERSION`)·Zod 검증 완성.
2. `hydrate()` 액션에서 `load()` 직후 `migrate()` 호출, preMigration 백업 키(`appstate.backup.preMigration`)에 원본 저장.
3. 변환 실패 시 백업으로 롤백, 실패 알림 토스트 표시.
4. 변환 성공 후 preMigration 백업을 다음 정상 기동 시 정리(AsyncStorage 키 삭제).
5. `app/(tabs)/settings.tsx` 파일 생성, 탭 네비게이션에 등록. 내보내기·가져오기 버튼 UI 배치.
6. 내보내기: `AppState` JSON 직렬화 → expo 파일 시스템 쓰기 → 공유 시트. 파일명: `dailyroutine-backup-YYYY-MM-DD-v{schemaVersion}.json`.
7. 가져오기: 파일 선택 → JSON 파싱 → Zod 검증 → schemaVersion 확인(낮으면 마이그레이션, 높으면 거부) → 덮어쓰기 확인 다이얼로그 → `AppState` 교체.

**측정 가능한 종료 조건**

- `jest __tests__/domain/migration.test.ts` 전부 통과:
  - 구 schemaVersion fixture → `migrate()` 실행 후 `AppState.schemaVersion === CURRENT_SCHEMA_VERSION`.
  - 변환 후 모든 `DayLog.versionId`·`activationTimeline.versionId`가 실재 `RoutineVersion`으로 해소(루프로 검증, 해소 실패 0건).
  - 변환 전후 fixture 기준 `weekProgress.pct`·`streak` 값이 동일(차이 0).
  - 의도적으로 깨진 fixture 투입 시 `migrate()` 예외 발생, 원본 AsyncStorage 값 보존(롤백 확인).
- `jest __tests__/backup.test.ts` 전부 통과:
  - export JSON을 빈 store에 import 후 `completionLogs` 포함 `AppState`가 원본과 `JSON.stringify` 정규화 기준 동치.
- 설정 탭이 하단 탭 바에 노출되고, 내보내기·가져오기 버튼이 렌더됨.

---

### Day 3 — 성능 마감·출시 전 통합 점검 (PRD 8.3, 9.3)

**목표**: 성능 점검 항목을 수행하고, v1 출시 직전 통합 점검을 완료한다.

**산출물**

- 성능 점검 결과 기록(주석 또는 별도 메모).
- 커버리지 리포트.
- 통합 점검 체크리스트 완료.

**작업**

1. `weekProgress`·`streak` 계산 시간 측정: Jest 테스트에서 60일 소급 `streak()` + `weekProgress()` 실행 시간 로깅.
2. 홈 진입 Expo Dev Tools 프레임 드랍 여부 수동 점검.
3. selector 리렌더 확인: 칩 토글 시 무관한 컴포넌트가 리렌더되지 않는지 React DevTools로 확인.
4. 커버리지 측정: `jest --coverage`. 도메인·통합·E2E 합산 80% 미만이면 미달 영역 보강.
5. 전 단계 AC 통합 체크(아래 출시 전 점검 항목 순서대로).
6. 오프라인 동작 확인: 비행기 모드 후 각 기능 동작 수동 테스트.

**측정 가능한 종료 조건**

- `streak(state, today)` + `weekProgress(state, weekStart)` Jest 실행 시간 합계 16ms 이내(Node.js 단독 측정 기준).
- 칩 토글 후 홈 외 화면이 리렌더되지 않음(React DevTools 확인, 불필요 리렌더 0건).
- `jest --coverage` 결과 전체 커버리지 80% 이상.
- 아래 출시 전 점검 항목 전부 체크 완료.

---

## 3. 상세 테스트 케이스

### 3.1 마이그레이션 왕복 (Jest)

| # | fixture | 입력 | 기대 출력 |
|---|---------|------|-----------|
| T1 | `fixtures/state-v0.json` (schemaVersion 0 형태) | `migrate(fixture)` (전제: `migrations[0]` v0→v1 등록됨, 작업1) | `schemaVersion === CURRENT_SCHEMA_VERSION`, 모든 `DayLog.versionId`가 실재 RoutineVersion으로 해소, 예외 없음(`migrations[0]` undefined 런타임 에러 없음) |
| T2 | `fixtures/state-v0.json` | `weekProgress` + `streak` (변환 전·후 각각 계산) | 변환 전후 값 동일(차이 0) |
| T3 | `fixtures/state-broken.json` (Zod 검증 실패 데이터) | `migrate(fixture)` | `IncompatibleVersionError` 또는 Zod 예외, AsyncStorage 원본 보존, 변환본 미저장 |
| T4 | schemaVersion이 `CURRENT_SCHEMA_VERSION + 1` | `migrate(fixture)` | `IncompatibleVersionError` 발생 |

> fixture 파일은 `__tests__/fixtures/` 하위에 두고, 현재 `schemaVersion`이 1이면 `state-v0.json`을 schemaVersion 0 형태로 수기 작성한다. v1 초기에는 변환 내용이 최소(`migrations[0]`이 schemaVersion만 0→1로 올림)이지만, 체인 자체의 통과(T1·T2)·거부(T3·T4) 경로를 검증하기 위해 fixture를 사용한다.

### 3.2 백업 왕복 (Jest + RNTL)

| # | 절차 | 기대 결과 |
|---|------|-----------|
| T5 | 현재 `AppState` → `JSON.stringify` export → 빈 store에 import | `JSON.stringify(imported) === JSON.stringify(original)` (정규화 후 동치) |
| T6 | completionLogs 포함 여부 확인 | export JSON에 `completionLogs` 키 존재 |
| T7 | 깨진 JSON 파일 가져오기 | Zod 검증 실패, 거부 메시지 표시, 기존 store 불변 |
| T8 | schemaVersion이 현재보다 높은 파일 가져오기 | 거부 메시지("앱 업데이트 필요"), 기존 store 불변 |

### 3.3 인터랙션 회귀 (RNTL / Maestro)

| # | 절차 | 기대 결과 |
|---|------|-----------|
| T9 | 칩 탭 → 완료 토글 → `AppState.completionLogs` 확인 | 체크 값이 `true`로 저장됨(애니메이션 적용 후에도 동일) |
| T10 | 칩 완료 후 진행률 바 확인 | `weekProgress.pct` 증가 반영, 바 width 갱신됨 |
| T11 | 칩 탭 → 앱 재시작 → 상태 확인 | 마지막 체크 상태가 보존됨(AC-5.1.2) |

### 3.4 성능 측정 (Jest·수동)

| # | 측정 대상 | 도구 | 목표 |
|---|-----------|------|------|
| T12 | `streak(state, today)` 60일 소급 실행 시간 | Jest `performance.now()` | 16ms 이내 |
| T13 | `weekProgress(state, weekStart)` 실행 시간 | Jest `performance.now()` | 16ms 이내 |
| T14 | 홈 진입 시 프레임 드랍 여부 | Expo Dev Tools 수동 관찰 | 드랍 없음 |
| T15 | 칩 토글 시 무관한 컴포넌트 리렌더 | React DevTools | 불필요 리렌더 0건 |

---

## 4. 종료 조건 (측정 가능)

PRD 9.3 M5 종료 조건("6.3 인터랙션 적용, 백업 왕복 통과")을 측정 가능한 형태로 구체화한다.

| # | 조건 | 검증 절차 |
|---|------|-----------|
| 1 | 백업 export→import 왕복 후 `AppState` 동치 | export JSON을 빈 store에 import 후 `JSON.stringify` 정규화 비교, `completionLogs` 포함 동치(불일치 0건) |
| 2 | 구 `schemaVersion` fixture 마이그레이션 후 `versionId` 참조 전부 유효 | fixture 변환 후 모든 `DayLog.versionId`·`activationTimeline.versionId`가 실재 `RoutineVersion`으로 해소(해소 실패 0건) |
| 3 | 마이그레이션 전후 과거 값 불변 | 변환 전후 과거 주의 `weekProgress.pct`·`streak` 값이 동일(차이 0) |
| 4 | 마이그레이션 실패 시 롤백 | 의도적으로 깨진 fixture 투입 시 변환본 미저장·원본 보존, 백업 키로 복구 확인(데이터 손실 0건) |
| 5 | 6.3 마이크로인터랙션 4종 적용 | (a)칩 스케일 0.96→1.0 바운스, (b)완료 색 전환 150~200ms, (c)진행률 바 width 트윈, (d)바텀시트 드래그·딤 각각 시각 확인(4종 모두) |
| 6 | 인터랙션 회귀 없음 | `jest --testPathPattern=chip` 통과, 칩 체크→저장→갱신 Maestro E2E가 Stage 2와 동일하게 동작(기능 회귀 0건) |
| 7 | 홈 진입 성능 목표 | T12·T13 Jest 16ms 이내, T14 수동 프레임 드랍 없음 |

---

## 5. 출시 전 통합 점검

v1 출시 직전 통합 점검 체크리스트다. Day 3에서 순서대로 수행한다.

- [ ] **전 단계 AC 통합 체크**: Stage 1~4가 충족한 PRD 수용 기준(AC-5.1.x ~ AC-5.10.x, 7장 임포트 AC)을 재확인. 특히 D8.8 오늘 보호 불변식 관련 AC(AC-5.3.2/5.3.3, AC-5.4.2, AC-5.7.2)가 마이그레이션·백업 도입 후에도 깨지지 않음을 확인(PRD 10.2 1순위 리스크).
- [ ] **커버리지 80% 확인**: `jest --coverage` 실행, 도메인·통합·E2E 합산 커버리지 80% 이상(아키텍처 10장).
- [ ] **v1 제외 기능 미포함 확인**: 다크 모드·다국어·멀티 기기 동기화·공개 갤러리·공유 링크 단축·푸시 알림·세트 무게 로깅·주간 리뷰 그래프·위젯·캘린더 연동이 v1 빌드에 포함되지 않았음을 확인(PRD 9.2, 11장).
- [ ] **데이터 안전망 확인**: 마이그레이션 전 자동 백업, 백업/복원 경로 동작, 임포트·복원 모두 검증·사용자 확인 단계를 거치는지 확인(PRD 8.4·8.5·10.2).
- [ ] **오프라인 동작 확인**: 네트워크 차단(비행기 모드) 상태에서 v1 전 기능(체크·에디터·공유 코드 생성/임포트·백업) 동작 확인. 백엔드 호출 0건(PRD 8.2 "v1 전 기능 네트워크 없이 동작", G4 "백엔드 호출 0건").
- [ ] **설정 탭 스캐폴딩 확인**: `(tabs)/settings.tsx`가 탭 바에 등록되고, 백업/복원·초기화 진입점 UI가 렌더됨.
