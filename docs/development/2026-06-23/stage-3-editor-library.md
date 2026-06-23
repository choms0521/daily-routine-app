# Stage 3 개발계획서 — 루틴 에디터 + 라이브러리 (M3)

> 문서 종류: 상세 개발계획서 (docs/development)
> 작성일: 2026-06-23
> 상위 출처: `docs/spec/2026-06-23/stage-3-editor-library.md`, `docs/prd/2026-06-23/workout-tracker-prd.md` (v1.2)

---

## 1. 개요

| 항목 | 내용 |
|------|------|
| 목표 | 루틴 에디터(생성·편집·새 버전 생성)와 라이브러리(목록·활성 전환·복제·숨김·삭제)를 구현한다. PRD D8.8 오늘 보호 불변식을 단위 테스트로 명시적으로 검증한다. |
| 의존 | Stage 1(도메인 코어·타임라인·진행률/스트릭·Repository), Stage 1 스키마(`types/schema.ts`의 `Routine`·`RoutineSchema`에 `hidden?: boolean` 선택 필드 포함), Stage 2(홈 화면·디자인 토큰·`toggleCheck`) |
| 기간 | 4~5일 (풀타임) |
| 테스트 도구 | Jest(단위)·React Native Testing Library(통합)·Maestro(E2E) |
| 커버리지 목표 | 도메인·store 변경분 80% 이상 |

---

## 2. Day별 work package

### Day 1 — 라이브러리 화면 뼈대 + 활성 배지

**목표**: `app/(tabs)/library.tsx` 화면을 구성하고, 보유 루틴 목록과 활성 배지를 표시한다.

**산출물**
- `app/(tabs)/library.tsx` — 루틴 카드 목록, 활성 배지, 숨김 루틴 필터
- `store/selectors.ts` — 라이브러리용 selector: `routines`(숨김 제외)·`activeRoutineId`

**작업**
1. `library.tsx` 스켈레톤 작성. `routines` store에서 구독, `hidden !== true`인 루틴만 렌더.
2. 각 루틴 카드에 이름·생성일·버전 개수 표시. 활성 루틴(`settings.activeRoutineId`와 일치)에 배지 표시.
3. 카드 롱프레스 또는 더보기 메뉴로 "활성으로 설정·편집·복제·숨김·삭제·공유(진입점만)" 진입 가능하게 한다.

**측정 가능한 종료 조건**
- `routines` store에 3개 루틴(1개 활성, 1개 숨김)이 있을 때 화면에 2개만 표시되고, 활성 배지가 정확히 1개 루틴에만 표시된다.
- `settings.activeRoutineId`를 store에서 직접 바꾸면 배지가 즉시 이동한다(리렌더 확인).

---

### Day 2 — 루틴 에디터 draft + 운동/요일/휴식일 편집

**목표**: `app/editor/[routineId].tsx`에서 로컬 draft 상태로 루틴을 편집할 수 있다(store 커밋 없이 draft만 동작하는 상태).

**산출물**
- `app/editor/[routineId].tsx` — 이름·요일 탭·카테고리 섹션·휴식일 토글
- `components/sheet/ExerciseAddSheet.tsx` — 운동 추가 바텀시트(카탈로그 선택 + 커스텀 이름 + 세트 자유 문자열)
- `constants/exerciseCatalog.ts` — 기본 운동 카탈로그 정적 배열(`{ name; category: 'aerobic'|'anaerobic'; defaultSets }`)
- draft 관리 훅(컴포넌트 로컬 또는 별도 `useRoutineDraft`)

**작업**
1. `routineId === 'new'`이면 빈 draft, 기존 `routineId`이면 최신 버전을 draft 초기값으로 로드.
2. 요일 탭 전환 → 해당 요일의 유산소·무산소 슬롯 표시. 운동 추가 버튼 → `ExerciseAddSheet` 바텀시트 열기.
3. `constants/exerciseCatalog.ts` 작성(러닝·수영·사이클·요가·스쿼트 등). `ExerciseAddSheet`는 카탈로그 목록(카테고리 필터 또는 검색)을 보여주고, 항목 선택 시 이름·세트(`defaultSets`)를 입력란에 채운다. 목록에 없으면 이름을 직접 입력(커스텀). 카탈로그 선택·커스텀 입력 모두 확인 시 동일한 `ExerciseSlot{ name, sets }`로 draft에 추가한다(카탈로그는 입력 보조, AppState·스키마 불변).
4. 휴식일 토글 칩(월~일) 선택 → draft `restDays` 갱신. 휴식일 요일의 운동 섹션 비활성.
5. 슬롯 삭제·순서변경(드래그 또는 위아래 버튼) draft에서만 반영.
6. draft 갱신은 모두 새 객체 반환(불변 패턴, 코딩 규약).

**측정 가능한 종료 조건**
- 이름 입력 → 저장 CTA 활성화. 이름 비움 → CTA 비활성화.
- `exerciseCatalog`에서 항목 선택 → 이름·세트 입력란이 해당 항목의 `name`·`defaultSets`로 채워짐 → 확인 → 해당 요일·카테고리 슬롯 리스트에 즉시 반영(store 호출 없이 draft에서).
- 카탈로그에 없는 운동을 커스텀 이름으로 입력 → 확인 → 동일하게 `ExerciseSlot{ name, sets }` 1건 draft 추가(카탈로그 선택분과 결과 구조 동일).
- 카탈로그 선택으로 추가한 슬롯이 draft·저장 후 버전에서 일반 `ExerciseSlot`과 구별되지 않음(별도 참조·필드 없음 확인).
- 휴식일 토글 → `restDays`에 반영되고 해당 요일 탭의 운동 섹션이 비활성.
- store 액션은 Day 2 종료 시 미호출(Day 3에서 연결).

---

### Day 3 — `createRoutine`·`editRoutine` 버전 생성 액션 + 저장 연결

**목표**: 에디터 "저장" 시 `createRoutine`·`editRoutine` 액션을 호출해 store에 새 `Routine` 또는 새 `RoutineVersion`을 append한다. D8.8 오늘 보호 단위 테스트 통과.

**산출물**
- `store/appStore.ts` — `createRoutine(draft)`, `editRoutine(routineId, draft, today)` 구현
- `__tests__/store/routineActions.test.ts` — AC-5.3.1~5.3.4 단위 테스트

**작업**
1. `createRoutine(draft)`: 새 `Routine`(신규 `id`·`createdAt`)과 `v_001` 버전 생성. `activationTimeline`·`settings` 불변. `slotId`는 `(요일, 카테고리, index)` 기반으로 결정적 부여.
2. `editRoutine(routineId, draft, today)`: 새 `RoutineVersion` append. `isActive = settings.activeRoutineId === routineId`이면 타임라인에 `{ effectiveFrom: tomorrow(today), routineId, versionId: 새버전.versionId }` append. 비활성이면 타임라인 불변.
3. 에디터 저장 CTA → 생성/편집 모드에 따라 대응 액션 호출 → 에디터 닫기. 활성 루틴 편집이면 홈 배너 조건 충족 확인(Day 4에서 배너 UI 연결).
4. 단위 테스트 작성(아래 3장).

**측정 가능한 종료 조건**
- `createRoutine` 후 `state.routines.length`가 1 증가하고, 새 루틴의 `versions.length === 1`.
- `state.activationTimeline.length` 불변, `state.settings.activeRoutineId` 불변.
- 활성 루틴 `editRoutine` 후 옛 `RoutineVersion` 참조 동일(`toBe` 통과), 타임라인 마지막 엔트리 `effectiveFrom === tomorrow`.
- 비활성 루틴 `editRoutine` 후 `activationTimeline.length` 불변.
- AC-5.3.1~5.3.4 단위 테스트 전부 통과.

---

### Day 4 — `setActiveRoutine` 전환 + 전환 당일 홈 배너

**목표**: 활성 전환 액션을 구현하고, 전환 당일 홈의 배너와 라이브러리 배지 표시 규칙을 연결한다. D8.8 전환 케이스 단위 테스트 통과.

**산출물**
- `store/appStore.ts` — `setActiveRoutine(routineId, today)` 구현
- `components/HomeBanner.tsx` — "내일부터 적용" 안내 배너
- `components/sheet/ActivationConfirmSheet.tsx` — 전환 확인 바텀시트
- `__tests__/store/setActiveRoutine.test.ts` — AC-5.4.1~5.4.2 단위 테스트

**작업**
1. `setActiveRoutine(routineId, today)`: `versionOf(state, today) === null`이면 최초 활성화(`effectiveFrom = today`), 아니면 전환(`effectiveFrom = tomorrow`). `settings.activeRoutineId = routineId` 즉시 변경. 대상 루틴의 최신 버전(`versions[versions.length - 1]`)을 타임라인 엔트리에 사용.
2. 전환 전에 이미 활성 루틴이 있으면 `ActivationConfirmSheet`를 띄운다. 동의 시에만 `setActiveRoutine` 호출. 최초 활성화는 시트 없이 즉시.
3. 배너 조건: 타임라인 마지막 엔트리 `effectiveFrom > today`. 해당되면 홈 오늘 카드 영역에 "내일부터 '(루틴명)'이 적용됩니다" 배너.
4. 라이브러리 배지: `settings.activeRoutineId` 기준(선택된 활성 B).
5. 단위 테스트 작성(아래 3장).

**측정 가능한 종료 조건**
- 전환 후 `state.settings.activeRoutineId === targetRoutineId` 즉시.
- 타임라인 마지막 엔트리 `effectiveFrom === tomorrow(today)` (전환) 또는 `effectiveFrom === today` (최초).
- `versionOf(state, today)`가 전환 전과 동일(오늘 보호).
- 홈에서 전환 직후 오늘 카드의 칩·진행률·스트릭이 전환 전과 동일하고 배너가 노출됨.
- AC-5.4.1~5.4.2 단위 테스트 통과.

---

### Day 5 — 숨김·복제·삭제 + E2E 검증

**목표**: 라이브러리의 보조 액션(숨김·복제·완전 삭제)을 구현하고, 에디터→버전 생성→과거 불변·전환 플로우 E2E를 통과한다.

**산출물**
- `store/appStore.ts` — `hideRoutine(routineId)`, `duplicateRoutine(routineId)`, `deleteRoutine(routineId)` 보조 액션
- `__tests__/store/libraryActions.test.ts` — AC-5.4.3 단위 테스트(hidden hydrate 포함)
- `e2e/stage3-editor.yaml` — Maestro E2E 시나리오

**작업**
1. `hideRoutine(routineId)`: 대상 루틴의 `hidden = true`. 버전·타임라인 불변. 활성 루틴 숨김 시 경고.
2. `duplicateRoutine(routineId)`: 최신 버전을 draft로 복사 → `createRoutine` 호출(새 `id`·`slotId` 재발급).
3. `deleteRoutine(routineId)`: 활성 루틴이면(`settings.activeRoutineId === routineId`) 삭제 전 다른 루틴으로 전환을 요구하고 거부한다(spec §6). 비활성이고 `completionLogs`에 해당 `routineId` 참조가 없으면 `routines`에서 제거. 로그 참조가 있으면 거부(에러 반환 또는 toast 안내) — 숨김만 가능.
4. Maestro E2E: (a) 루틴 생성 → 활성화 → 며칠 체크 → 에디터 편집 저장 → 과거 주 진행률·스트릭 불변 확인. (b) 두 번째 루틴 생성 → 전환 확인 → 오늘 홈 A 유지·배너·라이브러리 배지 B.
5. AC-5.4.3 단위 테스트: hidden hydrate 보존 포함(아래 3장).

**측정 가능한 종료 조건**
- `hideRoutine` 후 `routine.hidden === true`. 라이브러리 화면에서 해당 루틴 미노출.
- `duplicateRoutine` 후 `routines.length` +1. 복제본 `id !== 원본 id`. 원본 `routines[i]` 참조 불변.
- `deleteRoutine`이 활성 루틴에 거부 반환(다른 루틴 전환 요구). 비활성·로그 참조 루틴에도 거부 반환. 비활성·로그 없는 루틴만 `routines`에서 제거.
- **hidden hydrate 보존**: `hideRoutine` → `Repository.save` → `Repository.load`(hydrate 시뮬레이션) → `routine.hidden === true` 유지(Zod `RoutineSchema`가 `hidden?` 필드를 strip하지 않음 확인).
- Maestro E2E 두 시나리오 모두 통과.
- 단위 테스트 전체 통과, 도메인·store 변경분 커버리지 80% 이상.

---

## 3. 상세 테스트 케이스

도구: Jest(단위)·React Native Testing Library(통합). 모든 단언은 측정 가능한 값 비교로 작성한다.

### 3.1 단위 — store 액션 ↔ 도메인

#### AC-5.3.1 — 버전 불변성 (append-only)

```
given: activeRoutineId = rt_A, routines = [{ id: rt_A, versions: [v_001] }]
when:  editRoutine(rt_A, newDraft, today)
then:
  state.routines[0].versions[0] === before.routines[0].versions[0]   // 참조 동일(toBe)
  JSON.stringify(state.routines[0].versions[0])
    === JSON.stringify(before.routines[0].versions[0])               // 바이트 동일
  state.routines[0].versions.length === 2                            // 새 버전 append
```

#### AC-5.3.2 — 과거 불변 (편집 전후 weekProgress·streak deepEqual)

```
given: activationTimeline = [{ effectiveFrom: "2026-06-16", ... v_001 }]
       completionLogs 지난 주(2026-06-16~2026-06-22) 일부 체크 포함
       today = "2026-06-23"
when:  editRoutine(activeRoutineId, newDraft, today)
then:
  weekProgress(state, "2026-06-16") deepEqual weekProgress(before, "2026-06-16")
  streak(state, today) === streak(before, today)
```

#### AC-5.3.3 — 오늘 보호 (편집 당일 오늘 값 불변, 내일부터 새 버전)

```
given: today = "2026-06-23"
       plan(state, today) = 옛 버전 계획
when:  editRoutine(activeRoutineId, newDraft, today)
then:
  plan(state, "2026-06-23") deepEqual plan(before, "2026-06-23")    // 오늘 불변
  plan(state, "2026-06-24") deepEqual buildVersionPlan(newDraft, "2026-06-24")  // 내일 새 버전
  weekProgress(thisWeek) deepEqual weekProgress_before
  streak(state, today) === streak_before
```

#### AC-5.3.4 — 휴식일 과거 판정 불변

```
given: v_001.restDays = ["sun"], today = "2026-06-23"(화)
       편집으로 새 버전 v_002.restDays = ["sat"]
when:  editRoutine(activeRoutineId, draftWithSatRest, today)
then:
  isRestDay(state, "2026-06-21")  // 지난 일요일, v_001 기준
    === true                      // 새 버전(sat 휴식) 미반영
  isRestDay(state, "2026-06-28")  // 다음 일요일, v_002 기준
    === false                     // 새 버전(sat 휴식) 반영
```

#### AC-5.4.1 — 활성 루틴 정확히 1개

```
given: routines = [rt_A(활성), rt_B(비활성)]
when:  setActiveRoutine(rt_B, today)
then:
  state.settings.activeRoutineId === "rt_B"
  // 이전 rt_A는 타임라인에 rt_A 엔트리가 남지만 settings에서는 제거됨
  // activeRoutineId가 가리키는 루틴 = 정확히 1개
```

#### AC-5.4.2 — 전환은 내일부 / 오늘 불변 / 최초 활성화는 오늘

```
// 케이스 A: 전환 (이미 활성 루틴 있음)
given: versionOf(state, today) !== null, today = "2026-06-23"
when:  setActiveRoutine(rt_B, today)
then:
  activationTimeline의 마지막 엔트리.effectiveFrom === "2026-06-24"  // tomorrow
  versionOf(state, "2026-06-23") === versionOf(before, "2026-06-23") // 오늘 불변
  weekProgress(thisWeek) deepEqual weekProgress_before
  streak(state, today) === streak_before

// 케이스 B: 최초 활성화 (activationTimeline 비어있음)
given: versionOf(state, today) === null
when:  setActiveRoutine(rt_A, today)
then:
  activationTimeline의 마지막 엔트리.effectiveFrom === "2026-06-23"  // today
  versionOf(state, "2026-06-23").versionId === rt_A의 최신 버전 id
```

#### AC-5.4.3 — 삭제=숨김(로그 참조 루틴), hidden hydrate 보존

```
// 활성 루틴 삭제 거부 (전환 요구)
given: settings.activeRoutineId === rt_A.id
when:  deleteRoutine(rt_A.id)
then:
  반환값이 거부(에러 또는 false)         // 다른 루틴으로 전환 요구
  routines[rt_A 인덱스] 존재 유지

// 로그 참조 루틴 삭제 거부 (숨김만 가능)
given: settings.activeRoutineId !== rt_A.id, completionLogs에 rt_A 참조 존재
when:  deleteRoutine(rt_A.id)
then:
  반환값이 거부(에러 또는 false)
  routines[rt_A 인덱스] 존재 유지

// hideRoutine
when:  hideRoutine(rt_A.id)
then:
  state.routines[rt_A 인덱스].hidden === true
  state.routines[rt_A 인덱스].versions 길이 불변  // 버전 보존

// hydrate 보존 (hidden 필드가 Zod에 의해 strip되지 않음)
given:  hideRoutine 호출 후 AppState를 JSON.stringify → JSON.parse (hydrate 시뮬레이션)
when:   Zod RoutineSchema.parse(parsedState.routines[rt_A 인덱스])
then:   결과.hidden === true  // strip 없이 보존
```

#### 추가 단위 케이스

```
// createRoutine은 타임라인·settings 불변
when:  createRoutine(draft)
then:
  activationTimeline.length === before.activationTimeline.length
  settings.activeRoutineId === before.settings.activeRoutineId

// 비활성 editRoutine은 타임라인 불변
given: activeRoutineId = rt_A
when:  editRoutine(rt_B, draft, today)   // rt_B는 비활성
then:
  activationTimeline.length === before.activationTimeline.length

// 비활성 편집 후 setActiveRoutine 시 최신 버전 적용
when:  editRoutine(rt_B, newDraft, today)   // 비활성, 새 버전 v_002 생성
then:  setActiveRoutine(rt_B, today)
       activationTimeline 마지막 엔트리.versionId === "v_002"
```

### 3.2 통합 — 컴포넌트 ↔ store

- 에디터에서 운동 추가·삭제·순서변경·요일 배정·휴식일 토글 후 "저장" → store에 새 버전이 append되고 draft 내용과 일치하는지 검증.
- 라이브러리에서 "활성으로 설정" → 확인 시트 동의 → `setActiveRoutine` 호출, 활성 배지가 대상으로 이동, 홈 배너 노출 조건 충족 검증.

### 3.3 E2E — Maestro

**시나리오 A: 에디터 → 새 버전 → 과거 불변**
1. 루틴 생성 → 활성화 → 2일 체크(완료 로그 2건 생성).
2. 에디터에서 운동 1종 추가 후 저장.
3. 홈에서 이전 주(또는 체크한 날이 속한 주)의 진행률·스트릭 표시가 편집 전과 동일.
4. 오늘 카드: 옛 버전 기준 칩 표시. 홈 배너: "내일부터 적용" 노출.

**시나리오 B: 전환 플로우**
1. 두 번째 루틴 생성 → 라이브러리에서 "활성으로 설정".
2. 확인 시트 노출 → 동의.
3. 오늘 홈: 첫 번째 루틴(A) 기준 칩 유지. 배너: "내일부터 '(두 번째 루틴명)' 적용" 노출.
4. 라이브러리 화면: 두 번째 루틴에 활성 배지.

---

## 4. 종료 조건 (측정 가능)

1. `createRoutine` 후 `routines.length === before + 1`, 새 루틴 `versions.length === 1`(`v_001`), `activationTimeline.length` 불변, `settings.activeRoutineId` 불변.
2. 활성 루틴 `editRoutine` 후 `routines[i].versions[0] === before...versions[0]`(`toBe`), 새 버전 append, `activationTimeline` 마지막 엔트리 `effectiveFrom === tomorrow`.
3. 활성 루틴 편집 직후 `weekProgress(thisWeekMonday)` deepEqual 편집 전, `streak(today)` === 편집 전. `plan(tomorrow)` = 새 버전 계획.
4. 비활성 루틴 `editRoutine` 후 `activationTimeline.length` 불변. 이후 그 루틴 `setActiveRoutine` 시 타임라인 엔트리 `versionId`가 편집된 최신 버전.
5. `setActiveRoutine` 전환 후 `versionOf(today)` 전환 전과 동일, `weekProgress`·`streak` deepEqual 전환 전. 최초 활성화는 `effectiveFrom === today`.
6. 휴식일 변경 후 과거 날짜 `isRestDay` = 옛 버전 `restDays` 기준.
7. `hideRoutine` → hydrate 시뮬레이션 후 `routine.hidden === true` 유지(`RoutineSchema` Zod 파싱 통과).
8. 활성 루틴 `deleteRoutine` → 거부(전환 요구). 비활성·로그 참조 루틴 → 거부. 비활성·로그 없는 루틴 → `routines`에서 제거.
9. AC-5.3.1~5.3.4·AC-5.4.1~5.4.3 Jest 단위 테스트 전부 그린.
10. `jest --coverage` 결과 도메인·store 변경분 커버리지 80% 이상.
11. Maestro E2E 시나리오 A·B 통과.
