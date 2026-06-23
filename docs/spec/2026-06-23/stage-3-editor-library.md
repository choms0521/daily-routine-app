# Stage 3 — 루틴 에디터 + 라이브러리 (M3)

> 문서 종류: 단계별 스펙 (docs/spec)
> 작성일: 2026-06-22
> 상위 출처: `docs/prd/2026-06-23/workout-tracker-prd.md` (v1.2), `docs/spec/2026-06-23/00-architecture.md`
> 하위 파생: day-by-day 실행 계획 및 상세 테스트 케이스는 `docs/development/2026-06-23/stage-3-editor-library.md`로 분해한다.

---

## 1. 개요

| 항목 | 내용 |
|------|------|
| 목표 | 사용자가 루틴을 직접 만들고 편집하며(새 버전 생성), 여러 루틴을 보유하고 활성을 전환한다. 그 과정에서 PRD D8.8 오늘 보호 불변식을 UI·액션 레벨에서 지킨다. |
| PRD 마일스톤 | M3 에디터 + 라이브러리 (PRD 9.3) |
| 범위 (in) | 루틴 에디터(생성·편집·순서변경·요일 배정·휴식일), 라이브러리(목록·활성 전환·복제·숨김·삭제), store 액션(`createRoutine`·`editRoutine`·`setActiveRoutine`), 전환/편집 당일 홈 표시 규칙 |
| 범위 (out) | 공유·임포트(코드/딥링크/QR)는 Stage 4(M4)로 미룬다. 라이브러리의 "공유" 버튼은 진입점만 두고 실제 직렬화는 구현하지 않는다. |
| 의존 | Stage 1(도메인 코어·타임라인·진행률/스트릭·Repository, `types/schema.ts`의 `Routine`·`RoutineSchema`에 선언된 `hidden?: boolean` 선택 필드), Stage 2(홈 화면·디자인 토큰·`toggleCheck`) |
| 개략 일수 | 4~5일 (풀타임) |

핵심 한 줄: **에디터의 저장은 옛 버전을 변형하지 않고 새 `RoutineVersion`을 append하며, 활성 루틴이면 타임라인에 `effectiveFrom = 내일` 엔트리를 1건 append한다.** 활성 전환도 동일하게 내일부로 적용한다(최초 활성화만 오늘). 오늘 날짜의 활성 버전은 당일에 절대 바뀌지 않는다.

---

## 2. 구현할 기능·화면 목록

| 기능·화면 | PRD 절 | 산출물 |
|-----------|--------|--------|
| 루틴 에디터 화면 | 5.3, 6.2, 6.3 | `app/editor/[routineId].tsx` |
| 운동 추가 바텀시트 | 6.3 | `components/sheet/`(공통) + 에디터 내 운동 추가 시트 |
| 라이브러리 화면 | 5.4, 6.2 | `app/(tabs)/library.tsx` |
| 활성 전환 확인 바텀시트 | 5.4, 6.3 | 전환/편집 안내 시트 |
| `createRoutine` 액션 | 5.3, 6장 | `store/appStore.ts` |
| `editRoutine` 액션 | 5.3, 4.3(b·c) | `store/appStore.ts` |
| `setActiveRoutine` 액션 | 5.4, 4.3(a) | `store/appStore.ts` |
| 복제·숨김·삭제 | 5.4, 4.8 | 라이브러리 + store 보조 액션 |
| 전환/편집 당일 홈 표시 규칙 | 5.4, 5.3, 10.1 Q1 | 홈 배너(Stage 2 홈 컴포넌트 확장) |

> 수용 기준 대상: AC-5.3.1~5.3.4, AC-5.4.1~5.4.3 (PRD 5.3·5.4). 상세 테스트 케이스는 `docs/development/2026-06-23/stage-3-editor-library.md` 참조.

---

## 3. 루틴 에디터 설계

### 3.1 화면 구성

`editor/[routineId]` 라우트는 `routineId` 파라미터로 두 가지 모드를 가진다.

- **생성 모드**: `routineId`가 `new`(또는 미존재) → 빈 draft에서 시작. 저장 시 `createRoutine`.
- **편집 모드**: `routineId`가 기존 루틴 → 그 루틴의 **최신 버전**을 draft 초기값으로 로드. 저장 시 `editRoutine`.

화면 섹션(위에서 아래로):

1. **루틴 이름** — 단일 텍스트 입력. 빈 이름은 저장 비활성.
2. **휴식일 지정** — 요일 7개 토글 칩(월~일). 선택된 요일이 `restDays`.
3. **요일별 계획** — 요일 탭/세그먼트로 7일을 전환하며 각 요일의 `DayPlan`(유산소·무산소)을 편집한다. 휴식일로 지정된 요일은 운동 편집 영역을 비활성(또는 "휴식일" 안내)으로 표시한다.
4. **카테고리별 운동 항목** — 선택된 요일 안에서 유산소·무산소 두 섹션. 각 섹션은 `ExerciseSlot` 리스트(이름 + 세트 자유 문자열)를 가지며 추가·삭제·순서변경을 제공한다.
5. **저장 CTA** — 화면당 단일 주 CTA(파랑 풀폭, 6.3). "저장".

### 3.2 운동 추가 바텀시트 (6.3)

운동 추가는 화면 전환이 아니라 바텀시트로 띄운다(상단 라운드 20px, 드래그 핸들, 배경 딤). **기본 운동 카탈로그 제공 + 커스텀 추가가 Stage 3(v1) 필수**다(PRD 5.3·AC-5.3.5). 시트 구성:

- **카탈로그 목록**: 사전 정의된 기본 운동 목록(러닝·수영·사이클·요가·스쿼트 등)을 카테고리(유산소/무산소)별로 표시한다. 검색 또는 카테고리 필터로 항목을 좁힌다. 항목을 선택하면 이름과 기본 세트 표기가 입력란에 채워진다.
- **이름**: 텍스트 입력. 카탈로그에서 선택하면 자동 채움, 목록에 없으면 직접 입력(커스텀 추가).
- **세트**: 자유 문자열 입력(`"4 × 12"`, `"30분"`, `"3 × 40초"`). 카탈로그 선택 시 기본 세트 제안값으로 채워지며 추가 전 수정 가능. PRD D4 확정대로 v1은 구조화하지 않는다.

확인 시 현재 요일·카테고리에 `ExerciseSlot` 1건을 draft에 추가한다. 카탈로그에서 선택한 항목이라도 추가 결과는 동일한 `ExerciseSlot{ name, sets }` 1건이다(카탈로그는 입력 보조일 뿐 별도 참조를 남기지 않는다). 순서변경·삭제는 리스트 인라인 컨트롤로 처리한다.

**카탈로그 정적 데이터**: `constants/exerciseCatalog.ts`에 정적 배열로 정의한다(서버·DB 불필요). 항목 형태는 `{ name: string; category: 'aerobic' | 'anaerobic'; defaultSets: string }`. 카탈로그 데이터는 런타임 상태(AppState)에 포함하지 않으며, 데이터 모델·`ExerciseSlot` 스키마에 영향을 주지 않는다.

### 3.3 draft 상태와 store 커밋 분리

에디터는 **로컬 draft 상태**(컴포넌트 또는 가벼운 폼 상태)에서 편집을 진행하고, **저장 시점에만** store 액션을 호출한다. 이유:

- 편집 도중에는 `RoutineVersion`·타임라인을 건드리지 않으므로 진행 중 편집이 오늘·과거 계산에 영향을 주지 않는다(D8.8 보호).
- store는 불변 갱신 원칙(00-architecture 6장)을 따르므로, draft에서 자유롭게 편집하다가 커밋 한 번에 새 버전을 만든다.

draft 형태(개념):

```typescript
interface RoutineDraft {
  name: string
  restDays: Weekday[]
  days: { [weekday: Weekday]: { aerobic: SlotDraft[]; anaerobic: SlotDraft[] } }
}
interface SlotDraft { name: string; sets: string }   // slotId는 커밋 시 부여
```

draft 자체도 불변 패턴으로 갱신한다(기존 객체 변형 금지, 코딩 규약). `slotId`는 draft에 두지 않고 store 커밋 시점에 안정적으로 부여한다(6장 기술 노트).

### 3.4 저장 동작 (요약)

| 모드 | 호출 액션 | 결과 |
|------|-----------|------|
| 생성 | `createRoutine(draft)` | 새 `Routine` + 첫 `RoutineVersion(v_001)` 생성. 타임라인·`settings` 변화 없음(활성화 아님). |
| 편집 | `editRoutine(routineId, draft)` | 그 루틴에 새 `RoutineVersion` append. 활성 루틴이면 타임라인에 `effectiveFrom = 내일` 엔트리 append. |

저장 후 에디터를 닫고, 활성 루틴 편집·전환의 경우 홈에 "내일부터 적용" 안내를 띄운다(5장). 옛 버전은 어떤 경우에도 변형하지 않는다(append-only, PRD 4.1).

---

## 4. 버전 생성·타임라인 갱신 로직 (핵심)

PRD 4.3(a/b/c)과 D8.8을 액션별로 정확히 매핑한다. 모든 갱신은 불변(새 객체 생성, append-only)이다. `tomorrow`·`today`는 기기 로컬 날짜 키(PRD D9, `domain/date.ts`)로 산출한다.

### 4.1 전이 행렬 (단일 출처)

| 액션 | `routines` | `activationTimeline` | `settings.activeRoutineId` |
|------|-----------|----------------------|----------------------------|
| `createRoutine(draft)` | 새 `Routine{ versions: [v_001] }` append | 변화 없음 | **변화 없음**(생성은 활성화가 아니다) |
| `editRoutine(active)` | 대상 루틴에 새 `RoutineVersion` append | `{ effectiveFrom: 내일, routineId: 동일, versionId: 새 버전 }` append | 변화 없음 |
| `editRoutine(inactive)` | 대상 루틴에 새 `RoutineVersion` append | **변화 없음** | 변화 없음 |
| `setActiveRoutine` (최초 활성화) | 변화 없음 | `{ effectiveFrom: 오늘, routineId: 대상, versionId: 대상 최신 버전 }` append | = 대상(즉시) |
| `setActiveRoutine` (전환) | 변화 없음 | `{ effectiveFrom: 내일, routineId: 대상, versionId: 대상 최신 버전 }` append | = 대상(즉시) |

이 행렬은 PRD 4.3 표(a/b/c)와 D8.8을 그대로 운영화한 것이다. 임의 변경 금지. 각 케이스의 구체 단언은 `docs/development/2026-06-23/stage-3-editor-library.md` 참조.

### 4.2 함정과 판별 규칙

다음 규칙은 D8.8을 위반하기 쉬운 지점이므로 구현·테스트에서 명시적으로 확인한다.

1. **최초 활성화 판별식**: "이전 활성 루틴이 없었는가"를 `versionOf(state, today) === null`로 판정한다. 보호할 오늘 기록이 있으면(타임라인이 오늘 이전 엔트리를 가지면) 전환이고, 없으면 최초 활성화다. v1에서는 `activationTimeline.length === 0`과 동치이나, 의미가 명확한 `versionOf(today) === null`을 기준으로 쓴다("보호할 오늘이 있을 때만 보호한다").
2. **비활성 루틴 편집은 타임라인 엔트리를 append하지 않는다**: 비활성 루틴은 타임라인에 활성으로 올라와 있지 않으므로, 새 버전을 만들어도 과거·오늘·내일의 계획에 영향이 없다. 그 루틴이 **나중에 활성화될 때** `setActiveRoutine`이 `대상 최신 버전`을 집으므로, 편집된 새 버전이 그때 자동 반영된다. 따라서 비활성 편집에는 타임라인 엔트리가 불필요하다(있으면 오히려 잘못된 과거 변경이 된다).
3. **`settings.activeRoutineId`는 `setActiveRoutine`에서만 바뀐다**: `createRoutine`·`editRoutine`은 절대 활성 포인터를 바꾸지 않는다. 생성한 루틴은 사용자가 별도로 "활성으로 설정"해야 활성이 된다.
4. **타임라인은 append-only**: 과거·오늘 엔트리를 변형·삭제하지 않는다. 같은 `effectiveFrom`(예: 같은 날 두 번 전환)에 다수 엔트리가 생기면 마지막 append가 유효하다(PRD 4.8). 모든 엔트리의 `effectiveFrom = 내일`이므로 오늘 기록은 보호된다.
5. **계획 해소의 단일 출처는 타임라인**: 진행률·스트릭은 항상 `versionOf`/`plan`(타임라인 조회)로 계산한다. `DayLog.versionId`는 비정규화 캐시일 뿐 해소 경로가 아니다(PRD 4.4). 어떤 코드도 `DayLog.versionId`로 날짜의 계획을 해소하지 않는다.

### 4.3 불변 갱신 의사코드 (개념)

```typescript
// editRoutine — 활성/비활성 분기. 옛 버전은 절대 변형하지 않는다.
function editRoutine(state, routineId, draft, today): AppState {
  const newVersion = buildVersion(draft)                 // 새 versionId 부여
  const routines = state.routines.map(r =>
    r.id === routineId
      ? { ...r, versions: [...r.versions, newVersion] }   // append-only
      : r)                                                // 다른 루틴 그대로

  const isActive = state.settings.activeRoutineId === routineId
  const timeline = isActive
    ? [...state.activationTimeline,
       { effectiveFrom: tomorrow(today), routineId, versionId: newVersion.versionId }]
    : state.activationTimeline                            // 비활성: 변화 없음

  return { ...state, routines, activationTimeline: timeline }  // settings 불변
}

// setActiveRoutine — 최초 활성화만 오늘, 전환은 내일.
function setActiveRoutine(state, routineId, today): AppState {
  const target = state.routines.find(r => r.id === routineId)
  const latest = target.versions[target.versions.length - 1]
  const isFirstActivation = versionOf(state, today) === null   // 4.2-1
  const effectiveFrom = isFirstActivation ? dateKey(today) : tomorrow(today)
  return {
    ...state,
    activationTimeline: [...state.activationTimeline,
      { effectiveFrom, routineId, versionId: latest.versionId }],
    settings: { ...state.settings, activeRoutineId: routineId },  // 즉시 변경
  }
}
```

> `createRoutine`은 위와 달리 타임라인·`settings`를 건드리지 않고 `routines`에 새 `Routine`만 append한다.

---

## 5. 활성 전환·전환 당일 홈 표시 규칙

PRD 5.4의 전환 당일 표시 규칙을 따른다. 전환·활성 루틴 편집 모두 같은 패턴이다("선택된 활성 ≠ 오늘 적용 중 계획").

### 5.1 두 개념의 분리

- **선택된 활성(B)** = `settings.activeRoutineId`. 전환·생성 활성화 시 **즉시** 바뀐다.
- **오늘 적용 중 계획(A)** = `plan(state, today)` = 타임라인이 해소한 오늘의 계획. 전환 당일에는 여전히 이전 루틴(A)이다(D8.8, `effectiveFrom = 내일`).

전환 당일에는 이 둘이 갈린다. 최초 활성화일 때는 `effectiveFrom = 오늘`이므로 둘이 즉시 일치한다(갈림 없음).

### 5.2 화면별 표시

| 화면 | 표시 기준 |
|------|-----------|
| 홈 — 오늘 카드·칩·진행률·스트릭 | **오늘 적용 중 계획(A)** = `plan(today)`. 전환·편집 당일에도 A 기준으로 표시한다. |
| 홈 — 안내 배너 | 전환·활성 편집으로 `내일 effectiveFrom` 엔트리가 생긴 경우, 오늘 카드 영역에 "내일부터 '(B 이름)'이 적용됩니다" 배너를 둔다. |
| 라이브러리 — 활성 배지 | **선택된 활성(B)** = `settings.activeRoutineId`. 다음 활성이 B임을 나타낸다. |

배너 표시 조건(개념): 타임라인의 마지막 엔트리가 `effectiveFrom = 내일`이고 그 `routineId`가 오늘 적용 중 계획의 루틴과 다르면(또는 같은 루틴의 새 버전이면) "내일부터 적용" 안내를 띄운다. 즉 "오늘 적용 중 = A, 내일부터 = B(또는 A의 새 버전)"를 사용자에게 명시한다.

### 5.3 전환 확인 바텀시트 (5.4)

이미 다른 루틴이 활성인 상태에서 전환을 시도하면, 전환 전에 확인 바텀시트를 띄운다(PRD 저니 B-4). "기존 활성 루틴이 꺼지고 새 루틴으로 전환됩니다. 오늘은 기존 루틴이 유지되고 내일부터 새 루틴이 적용됩니다." 사용자가 동의한 경우에만 `setActiveRoutine`을 호출한다. 최초 활성화(이전 활성 없음)는 경고 없이 즉시 활성화하고 오늘부터 적용한다.

### 5.4 Q1(전환 당일 시각화)에 대한 이 단계의 처리 방침

PRD 10.1 Q1은 **미해결**이다. Stage 3은 PRD의 잠정안을 따른다: 날짜별 버전 조회를 그대로 따라 "섞여 표시"하되, 전환 지점에 구분선을 두고 오늘 카드에 "내일부터 '(B)' 적용" 배너를 둔다. 배너의 정확한 형태·위치·문구, 전환 지점 구분선의 시각 디자인은 이 단계에서 최종 확정하지 않으며, 잠정안 범위에서 동작하는 최소 구현을 둔다(8장에서 재기록). 계산은 이미 날짜별 조회로 확정되어 있어 시각화 형태와 무관하게 정확하다(PRD 4.6/4.7).

---

## 6. 기술 노트

- **expo-router editor 라우트**: `app/editor/[routineId].tsx`(00-architecture 7장). `routineId` 파라미터로 생성/편집 모드를 가른다. 생성 진입은 `editor/new`(또는 파라미터 없는 진입)로 통일한다.
- **바텀시트**: 운동 추가·전환 확인은 공통 시트 컴포넌트(`components/sheet/`)를 재사용한다(6.3 라운드 20px·드래그 핸들·딤).
- **draft 편집의 불변 패턴**: draft는 컴포넌트 로컬 상태로 두고, 추가·삭제·순서변경·이름 변경 모두 새 객체/배열로 갱신한다(코딩 규약). store 커밋(저장) 전까지 store·타임라인은 불변이다.
- **`slotId` 부여**: `slotId`는 `(버전, 요일, 카테고리)` 범위에서 안정적인 위치 식별자다(PRD 4.4). draft에서는 임시 키로 다루다가, store 커밋 시 새 버전의 각 요일·카테고리 안에서 결정적으로 부여한다. 새 버전이 생겨도 과거 버전의 `(요일, 카테고리, slotId)` 매핑은 그대로 보존된다(과거 `DayLog.checks` 경로 무결성).
- **복제(duplicate)**: 선택한 루틴의 최신 버전을 draft로 복사해 `createRoutine`을 호출한다(새 `Routine` + `v_001`, 새 `id`). 원본은 그대로 둔다. 활성 포인터는 바뀌지 않는다.
- **숨김(hide)**: 라이브러리 목록에서 가린다. **버전 데이터는 보존**한다(PRD 4.8: 버전은 append-only로 삭제하지 않음). 숨김은 표시 상태 플래그 `hidden?: boolean`로 처리하며, 과거 로그가 그 루틴의 버전을 참조할 수 있으므로 타임라인·버전은 건드리지 않는다. 이 플래그는 **Stage 1의 `types/schema.ts`에서 `Routine` 타입·`RoutineSchema`의 선택 필드**(`hidden?: boolean`)로 정의되며, 본 단계 라이브러리가 이를 사용한다. AsyncStorage hydrate 시 Zod가 해당 필드를 인식하지 못해 strip하면 재시작마다 숨김이 소실되므로, 단일 출처는 Stage 1 스키마다. 계산(타임라인·진행률·스트릭)에는 관여하지 않는다.
- **완전 삭제(delete)**: **과거 완료 로그가 그 루틴을 전혀 참조하지 않는 루틴에만** 허용한다(AC-5.4.3). 로그가 있으면 삭제 대신 숨김만 가능하다. 활성 루틴은 삭제 전 다른 루틴으로 전환을 요구한다.
- **selector 분리**: 라이브러리는 `routines`(+숨김 플래그)와 `settings.activeRoutineId`만 구독한다. 홈의 칩 토글 리렌더와 분리한다(00-architecture 6장).

---

## 7. 테스트 방향

검증 대상: AC-5.3.1~5.3.4(버전 불변·과거 불변·오늘 보호·휴식일 과거 판정), AC-5.4.1~5.4.3(활성 1개·전환 내일부·숨김=버전 보존). 단위(store 액션 ↔ 도메인)·통합(컴포넌트 ↔ store)·E2E(에디터→버전 생성→과거 불변, 전환 플로우) 세 계층으로 커버한다. 구체 케이스·fixture·실행 명령은 `docs/development/2026-06-23/stage-3-editor-library.md` 참조.

---

## 8. 주의·미해결 연계

- **Q1(전환 당일 홈 시각화) 미해결**: 전환 지점 구분선, "내일부터 적용" 배너의 형태·위치·문구는 PRD 10.1 Q1에서 미정이다. Stage 3은 잠정안(날짜별 조회 그대로 섞여 표시 + 구분선 + 배너)으로 동작하는 최소 구현을 두고, 최종 UX 형태 확정은 후속(다듬기 또는 별도 결정)으로 남긴다. 계산 정확성은 잠정안과 무관하게 보장된다(4.6/4.7 날짜별 조회).
- **Q3(임포트 시 같은 이름 루틴) 연계**: 임포트 자체는 Stage 4(M4)다. 다만 임포트된 루틴이 라이브러리에 같은 이름으로 들어올 수 있으므로, 라이브러리 목록은 동명 루틴 구분(예: "(가져옴)" 접미 또는 사용자 리네임)을 표시할 수 있어야 한다. Q3은 미해결이며 이 단계에서 최종 결정하지 않는다. 단, 라이브러리 목록 UI가 동명 항목을 `id`로 구분해 표시하도록 두어 Stage 4 임포트가 충돌 없이 얹히게 한다(`id` 재발급으로 데이터 충돌은 없음, PRD 4.8·7.1).
- **D8.8 절대 준수**: 어떤 에디터·라이브러리 동작도 오늘·과거의 활성 버전을 당일에 바꾸지 않는다. 모든 편집·전환은 `effectiveFrom = 내일`(최초 활성화만 오늘)이며, 계산은 타임라인을 단일 출처로 한다.
