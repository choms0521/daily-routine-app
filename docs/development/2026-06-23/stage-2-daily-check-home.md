# Stage 2 개발계획서 — 일일 체크 + 홈 (M2)

> 문서 종류: 상세 개발계획서 (docs/development)
> 작성일: 2026-06-23
> 상위 출처: `docs/spec/2026-06-23/stage-2-daily-check-home.md`, `docs/prd/2026-06-23/workout-tracker-prd.md` (v1.2)
> 전제 단계: Stage 1 (M1 데이터 코어) 완료

---

## 1. 개요

| 항목 | 내용 |
|------|------|
| 목표 | 홈 화면과 일일 체크를 구현한다. 디자인 토큰 이식, 칩 체크 → 옵티미스틱 저장 → 진행률·스트릭 갱신 루프 완성. |
| 의존 (Stage 1) | `types/schema.ts`, `domain/timeline.ts`·`progress.ts`·`streak.ts`·`completion.ts`·`date.ts`, `repository/AsyncStorageRepository.ts`, `store/appStore.ts`의 `hydrate()` |
| 기간 | 4~5일 (풀타임) |
| 테스트 도구 | Jest + React Native Testing Library (단위·통합), Maestro (E2E) |
| 커버리지 목표 | `components/`·`store/`(이 단계 액션) 80% 이상 |

---

## 2. Day별 work package

### Day 1 — 디자인 토큰 이식 + 탭 레이아웃

**목표**: `theme/tokens.ts`에 PRD 6.1 토큰을 1:1 이식하고, expo-router 탭 레이아웃을 초기 구성한다.

**산출물**
- `theme/tokens.ts` — 색·타이포·간격·라운드·그림자 상수
- `theme/ThemeProvider.tsx` — 토큰 컨텍스트 주입
- `app/(tabs)/_layout.tsx` — 탭 레이아웃 (홈 탭 노출, 나머지 플레이스홀더)
- `app/(tabs)/index.tsx` — 홈 화면 뼈대 (빈 ScrollView)

**작업**
1. `theme/tokens.ts`에 `color`, `font`, `space`, `radius`, `shadow` 객체 작성 (PRD 6.1 값 그대로).
2. `theme/ThemeProvider.tsx` 작성 — React Context로 토큰 주입.
3. `app/(tabs)/_layout.tsx`에 Tabs 컴포넌트 구성, 홈 탭 아이콘·라벨 설정.
4. `app/(tabs)/index.tsx` 뼈대 — `SafeAreaView` + `ScrollView`, 토큰 참조 확인.

**측정 가능한 종료 조건**
- `theme/tokens.ts`의 `color.primary` === `'#3182F6'`, `color.chipIdleBg` === `'#F2F4F6'`, `color.primaryWeak` === `'#E8F1FF'` 등 PRD 6.1 표의 16개 색상 값이 1:1 일치한다. (`tokens.test.ts`에서 각 값 단언)
- `ThemeProvider`로 감싼 컴포넌트에서 `useTheme()` 훅으로 토큰에 접근 가능하다. (RNTL 렌더 테스트)
- `expo-router` 탭 레이아웃이 시뮬레이터에서 탭 바로 렌더된다. (수동 확인)

---

### Day 2 — 홈 레이아웃 + 요일 카드

**목표**: HomeHeader(루틴명·스트릭·진행률·주 이동), DayCard 7장(요일 라벨·휴식 표시)를 레이아웃 수준으로 구성한다.

**산출물**
- `components/home/WeekNav.tsx` — 이전/다음 주 이동 버튼
- `components/chip/DayCard.tsx` — 요일 카드 레이아웃
- `components/progress/ProgressBar.tsx` — 진행률 바 + 수치 라벨
- `components/progress/StreakBadge.tsx` — 스트릭 숫자 표시
- `components/home/WeekEmptyState.tsx` — 빈 주 빈 상태
- `app/(tabs)/index.tsx` — HomeHeader + DayCard[] 연결, selector 구독

**작업**
1. `store/selectors.ts`에 홈 selector 작성: `weekProgress`, `streak`, 날짜별 `plan`/`isRestDay`/`categoryDone`, `DayLog.checks`, 활성 루틴명.
2. `WeekNav` — `viewedWeekStart` 상태, 이전/다음 주 버튼. 다음 주 버튼은 이번 주일 때 `disabled`.
3. `DayCard` — 요일 라벨, "오늘" 태그(이번 주 + 해당 날짜만), 휴식일이면 "휴식 — 회복하는 날" 표시. 칩 슬롯 영역 플레이스홀더.
4. `ProgressBar` — `{ done, total, pct }` props → 막대 + `"{done} / {total} · {pct}%"` 라벨. `font.display` + `tabular-nums`.
5. `StreakBadge` — 일수 props → `font.display` + `tabular-nums`.
6. `WeekEmptyState` — `total === 0`(빈 주)일 때 노출. 잠정 문구: "이 주에는 활성 루틴이 없었습니다."
7. `app/(tabs)/index.tsx` — selector로 store 구독, 위 컴포넌트 조립.

**측정 가능한 종료 조건**
- `WeekNav`를 이번 주로 렌더할 때 다음 주 버튼의 `disabled` prop이 `true`다. (RNTL: `getByTestId('next-week-btn')` → `expect(disabled).toBe(true)`)
- 과거 주로 렌더할 때 DayCard 목록에서 "오늘" 텍스트를 가진 노드 수가 0이다. (RNTL: `queryAllByText('오늘').length === 0`)
- `ProgressBar`에 `{ done: 5, total: 8, pct: 63 }`을 넣으면 라벨 텍스트가 정확히 `"5 / 8 · 63%"`다. (RNTL: `getByText('5 / 8 · 63%')`)
- `StreakBadge`에 `streak: 12`를 넣으면 "12"를 포함하는 텍스트가 렌더된다. (RNTL: `getByText(/12/)`)

---

### Day 3 — 칩 컴포넌트 + 펼치기 + 개별 체크

**목표**: `CategoryChip`과 `ExerciseList`를 완성하고 `toggleCheck`/`toggleCategory` store 액션을 구현한다.

**산출물**
- `components/chip/CategoryChip.tsx` — 유산소/무산소 칩 (미완료=무채색, 완료=Toss Blue)
- `components/chip/ExerciseList.tsx` — 펼치기 + 개별 운동 체크
- `store/appStore.ts` — `toggleCheck`, `toggleCategory` 액션 추가

**작업**
1. `CategoryChip` — `category`('aerobic'|'anaerobic'), `isDone` props.
   - 미완료: 배경 `color.chipIdleBg`, 텍스트 `color.chipIdleFg`.
   - 완료: 배경 `color.primaryWeak`, 텍스트·체크 `color.primary`.
   - 라벨: `isDone` 여부와 무관하게 "유산소"/"무산소" 텍스트.
   - 칩 탭 → `onToggle()` 콜백(`toggleCategory` 호출).
   - 펼치기 아이콘 탭 → `onExpand()` 콜백(ExerciseList 확장/접기, 로컬 상태).
   - 슬롯 0개인 날에는 렌더하지 않는다(부모인 DayCard가 `plan(date)[category].length > 0`일 때만 렌더).
2. `ExerciseList` — `slots: ExerciseSlot[]`, `checks: Record<slotId, boolean>` props.
   - 각 운동: 이름 + 세트 정보(`caption`, 읽기 전용) + 체크박스(boolean 토글).
   - 체크박스 탭 → `onCheck(slotId)` 콜백(`toggleCheck` 호출).
   - 세트별 실측(수치) 입력은 v1 비목표(PRD 11장 v2). `DayLog.checks`는 boolean 전용이므로 수치 입력 UI(횟수·시간 입력 필드)를 만들지 않는다(spec stage-2 §, PRD 1.4 비목표 정합).
3. `toggleCheck(date, category, slotId)` 액션:
   - `completionLogs[date].checks[category][slotId]`를 불변 갱신(toggle).
   - `DayLog`가 없던 날이면 `versionId`·`routineId`를 함께 기록(AC-5.1.4).
   - `Repository.save(newState)` 비동기 호출. 실패 시 토스트.
4. `toggleCategory(date, category, value)` 액션:
   - 그 카테고리 모든 슬롯을 `value`로 일괄 설정. 불변 갱신.
   - `Repository.save(newState)` 비동기 호출.

**측정 가능한 종료 조건**
- `CategoryChip`을 `isDone=false`로 렌더하면 배경색이 `#F2F4F6`(`color.chipIdleBg`)이다. (RNTL: `style` 단언)
- `CategoryChip`을 `isDone=true`로 렌더하면 배경색이 `#E8F1FF`(`color.primaryWeak`)이다. (RNTL: `style` 단언). 카테고리('aerobic'/'anaerobic')에 따른 색 차이는 0이다.
- `CategoryChip`의 라벨 텍스트는 완료/미완료에 관계없이 "유산소" 또는 "무산소"다. (RNTL: `getByText('유산소')` 또는 `getByText('무산소')`)
- `ExerciseList`에 슬롯 3개를 렌더하면 운동 이름 3개와 세트 캡션이 표시되고, 체크박스가 3개 렌더된다. (RNTL)
- `ExerciseList`의 체크는 boolean 토글이며 수치 입력 필드가 없다. (RNTL: `queryByTestId('rep-input')` 및 `queryByTestId('duration-input')` 모두 `null`)
- `toggleCheck` 호출 후 store의 `completionLogs[date].checks[category][slotId]`가 이전 값의 반전이다. (통합)
- `toggleCategory(date, 'aerobic', true)` 호출 후 그 날 aerobic 모든 슬롯의 `checks` 값이 `true`다. (통합 — AC-5.2.3)
- 슬롯 0개인 날에 해당 카테고리 칩이 렌더되지 않는다. (RNTL: `queryByTestId('chip-aerobic')` === `null` — AC-5.1.3)

---

### Day 4 — 진행률·스트릭 연동 + 옵티미스틱 저장 검증 + 주 이동

**목표**: 칩 체크 → 진행률·스트릭 즉시 갱신 루프를 완성하고, 옵티미스틱 저장 흐름을 통합 테스트로 검증한다. 주 이동 경계를 테스트한다.

**작업**
1. `app/(tabs)/index.tsx`에서 `weekProgress`·`streak` selector를 칩 토글 후 즉시 재계산하는지 확인. selector 범위가 적절한지 검토(칩 토글이 관련 없는 컴포넌트를 리렌더하지 않는지).
2. 옵티미스틱 저장 실패 토스트 구현: `Repository.save` reject 시 `color.danger` 톤의 토스트 노출.
3. `WeekNav` 이전/다음 주 이동 시 `viewedWeekStart`가 정확한 월요일 날짜 키로 변경되는지 확인(`domain/date.ts` 활용).
4. 통합 테스트: 칩 탭 → `toggleCheck` → store 갱신 → `weekProgress` selector 재계산 → `ProgressBar` 라벨 갱신 순서 검증.

**측정 가능한 종료 조건**
- 칩 탭 후 `ProgressBar` 라벨의 `done` 값이 +1 증가한다. (통합 — 옵티미스틱 즉시 반영)
- `Repository.save`를 실패로 mock 했을 때 토스트 컴포넌트가 렌더된다. (통합)
- `WeekNav`에서 이전 주 버튼을 탭하면 `viewedWeekStart`가 7일 전 월요일로 바뀐다. (RNTL: 상태 단언)
- 이번 주에서 다음 주 버튼은 `disabled`고, 이전 주로 이동한 후에는 다음 주 버튼이 활성화된다. (RNTL)

---

### Day 5 — 오늘 강조·초기화·E2E 통과

**목표**: 오늘 강조(5.9), 보고 있는 주 초기화(5.10)를 완성하고, Maestro E2E로 핵심 플로우를 검증한다. 앱 재시작 후 체크 유지를 확인한다.

**산출물**
- `store/appStore.ts` — `resetWeek(viewedWeekStart)` 액션 추가
- Maestro E2E 플로우 파일

**작업**
1. `DayCard`의 "오늘" 태그: `isViewingCurrentWeek && date === today`일 때만 렌더.
2. `resetWeek(viewedWeekStart)` 액션:
   - 해당 주(월~일) 날짜 키를 계산해 `completionLogs`에서 해당 날짜 항목만 제거. 불변 갱신.
   - `routines`, `activationTimeline`, `settings`는 변형하지 않는다.
   - `Repository.save(newState)` 비동기 호출.
3. 초기화 확인 다이얼로그: 이번 주 → "이번 주를 초기화합니다", 과거 주 → "과거 주를 초기화합니다" 문구 포함. 사용자 취소 시 아무것도 하지 않음.
4. Maestro E2E 플로우 작성: 미완료 칩 탭 → 칩 파랑 점등 → ProgressBar 라벨 분자 +1.
5. 앱 재시작 유지 통합 테스트: `toggleCheck` → `Repository.save` → `hydrate()` 재로드 → store의 `checks` 값 동일.

**측정 가능한 종료 조건**
- 이번 주 렌더 시 오늘 날짜의 DayCard에 "오늘" 텍스트가 정확히 1개 렌더된다. (RNTL: `getAllByText('오늘').length === 1`)
- 과거 주 렌더 시 "오늘" 텍스트 노드가 0개다. (RNTL: `queryAllByText('오늘').length === 0` — AC-5.9.1)
- `resetWeek` 호출 후 해당 주 날짜의 `completionLogs` 키가 모두 제거되고, `routines`·`activationTimeline` 객체가 참조 동등(`===`)으로 변하지 않는다. (통합 — AC-5.10.1)
- 과거 주 초기화 다이얼로그의 확인 문구에 "과거 주를 초기화합니다" 문자열이 포함된다. (RNTL: `getByText(/과거 주를 초기화/)` — AC-5.10.2)
- Maestro E2E 플로우: 미완료 칩 탭 → 칩이 `color.primaryWeak` 배경으로 바뀌고 ProgressBar 라벨 분자가 +1된다. (E2E 통과)
- `toggleCheck` → `hydrate()` 재로드 후 `completionLogs[date].checks[category][slotId]`가 동일하다. (통합 — AC-5.1.2)

---

## 3. 상세 테스트 케이스

### 3.1 단위 테스트 (Jest + RNTL)

#### CategoryChip

| 케이스 | 입력 | 기대 출력 |
|--------|------|-----------|
| 미완료 배경색 | `isDone=false, category='aerobic'` | 배경 style `backgroundColor === '#F2F4F6'` |
| 완료 배경색 | `isDone=true, category='aerobic'` | 배경 style `backgroundColor === '#E8F1FF'` |
| 무산소도 동일 색 | `isDone=true, category='anaerobic'` | 배경 style `backgroundColor === '#E8F1FF'` (유산소와 동일) |
| 라벨 텍스트 | `category='aerobic', isDone=false` | `getByText('유산소')` 존재 |
| 라벨 텍스트 | `category='anaerobic', isDone=true` | `getByText('무산소')` 존재 |
| 칩 탭 → 콜백 | 칩 `fireEvent.press` | `onToggle` 1회 호출 |
| 펼치기 탭 → 콜백 | 펼치기 아이콘 `fireEvent.press` | `onExpand` 1회 호출 |

#### ExerciseList

| 케이스 | 입력 | 기대 출력 |
|--------|------|-----------|
| 운동 렌더 수 | `slots` 3개 | 운동 이름 텍스트 3개, 체크박스 3개 |
| 세트 캡션 표시 | `slot.sets = '4 × 한계-2'` | `getByText('4 × 한계-2')` 존재 (읽기 전용) |
| 체크 탭 → 콜백 | 첫 번째 체크박스 `fireEvent.press` | `onCheck(slotId)` 1회 호출 |
| 체크 상태 반영 | `checks[slotId] = true` | 해당 체크박스가 checked 상태 |

#### ProgressBar

| 케이스 | 입력 | 기대 출력 |
|--------|------|-----------|
| 라벨 정합 | `{ done: 5, total: 8, pct: 63 }` | `getByText('5 / 8 · 63%')` |
| 빈 주 | `{ done: 0, total: 0, pct: 0 }` | `getByText('0 / 0 · 0%')` |
| 막대 너비 | `pct: 63` | 막대 `width` style이 `'63%'`(또는 동등한 flex 비율) |

#### WeekNav

| 케이스 | 입력 | 기대 출력 |
|--------|------|-----------|
| 이번 주 다음 버튼 비활성 | `isCurrentWeek=true` | `getByTestId('next-week-btn')` → `disabled === true` (AC-5.8.1) |
| 과거 주 다음 버튼 활성 | `isCurrentWeek=false` | `getByTestId('next-week-btn')` → `disabled === false` |

#### DayCard

| 케이스 | 입력 | 기대 출력 |
|--------|------|-----------|
| 오늘 태그 — 이번 주 오늘 | `isToday=true, isCurrentWeek=true` | `getByText('오늘')` 존재 |
| 오늘 태그 — 과거 주 | `isToday=true, isCurrentWeek=false` | `queryByText('오늘')` === null (AC-5.9.1) |
| 휴식일 표시 | `isRestDay=true` | `getByText(/휴식/)` 존재 |
| 슬롯 0개 시 칩 미렌더 | `plan.aerobic=[]` | `queryByTestId('chip-aerobic')` === null (AC-5.1.3) |

### 3.2 통합 테스트 (Jest + RNTL)

| 케이스 | 시나리오 | 기대 결과 |
|--------|----------|-----------|
| 칩 탭 → 완료 저장 | 칩 `fireEvent.press` → store 액션 확인 | `store.state.completionLogs[date].checks` 갱신 + `Repository.save` 1회 호출 (AC-5.1.1) |
| 재시작 유지 | `toggleCheck` → `hydrate()` 재로드 | `completionLogs[date].checks[category][slotId]` 동일 (AC-5.1.2) |
| 일괄 체크 | `toggleCategory(date, 'anaerobic', true)` | `anaerobic` 모든 슬롯 `checks === true` (AC-5.2.3) |
| 일괄 해제 | `toggleCategory(date, 'anaerobic', false)` | `anaerobic` 모든 슬롯 `checks === false` |
| 전부 체크 → 칩 자동 완료 | 개별 슬롯 전부 `toggleCheck` | `categoryDone` 파생값이 `true`로 바뀌어 칩이 완료 상태 렌더. `Repository.save` 별도 추가 호출 없음 (AC-5.2.2) |
| 칩 탭 → 진행률 즉시 갱신 | 칩 `fireEvent.press` | `ProgressBar` 라벨 `done` +1 (옵티미스틱) |
| 저장 실패 토스트 | `Repository.save` mock → reject | 토스트 컴포넌트 렌더 |
| `resetWeek` — 로그만 제거 | `resetWeek(weekStart)` | 해당 주 `DayLog` 제거, `routines`·`activationTimeline` 참조 동등 유지 (AC-5.10.1) |
| 초기화 확인 — 이번 주 | 이번 주 상태로 `ResetWeekButton` 탭 | 다이얼로그에 "이번 주를 초기화합니다" 문자열 포함 |
| 초기화 확인 — 과거 주 | 과거 주 상태로 `ResetWeekButton` 탭 | 다이얼로그에 "과거 주를 초기화합니다" 문자열 포함 (AC-5.10.2) |
| 5/8·63% 정합 | PRD 4.4 예시 루틴 fixture + 5항목 완료 | `weekProgress` 반환값 `{ done:5, total:8, pct:63 }` → `ProgressBar` 라벨 `"5 / 8 · 63%"` |

> **PRD 4.4 예시 루틴 fixture**: `restDays: ['sun']`, 유산소 월~토 6일, 무산소 월~화 2일. 분모 `total = 8` (PRD 4.6 분모 산식). 이 fixture는 통합 테스트에서 `AppState`에 직접 주입해 사용한다.

### 3.3 E2E 테스트 (Maestro)

#### 플로우 1: 칩 체크 → 저장 → 진행률·스트릭 갱신

```yaml
# maestro/stage2_chip_check.yaml (잠정 구조)
appId: com.yourapp.dailyroutine
---
- launchApp
- assertVisible: "여름 컨디셔닝"          # 활성 루틴명 노출
- tapOn:                                  # 오늘 카드의 유산소 칩 탭
    text: "유산소"
    index: 0
- assertVisible: "유산소"                 # 칩 여전히 존재
- assertNotVisible: "0 / "               # 진행률 분자가 0이 아님 (완료 후)
```

구체 assertion은 컴포넌트의 `testID` 설계 확정 후 보완한다. 최소 검증: 칩 탭 → 앱이 멈추지 않고 ProgressBar 텍스트가 갱신됨.

#### 플로우 2: 앱 재기동 후 체크 유지 (AC-5.1.2)

```yaml
# maestro/stage2_persist.yaml (잠정 구조)
---
- launchApp
- tapOn: { text: "유산소", index: 0 }    # 체크
- pressKey: HOME
- launchApp                               # 재기동
- assertVisible: "유산소"                 # 체크 상태 유지 (칩 완료 색)
```

---

## 4. 종료 조건 (실행 명령 수준)

| # | 조건 | 검증 방법 |
|---|------|-----------|
| 1 | 칩 체크 → 저장 → 진행률·스트릭 갱신 E2E 통과 | `maestro test maestro/stage2_chip_check.yaml` → exit 0 |
| 2 | 칩 체크 → 앱 재기동 후 체크 유지 (AC-5.1.2) | `maestro test maestro/stage2_persist.yaml` → exit 0 |
| 3 | 진행률 `5 / 8 · 63%` 표시 정합 (PRD 6.4·4.6) | 통합 테스트 `ProgressBar.test.tsx`의 `5/8·63%` 단언 → pass |
| 4 | 일괄 체크 (AC-5.2.3) | `toggleCategory.test.ts` → pass |
| 5 | 다음 주 비활성 (AC-5.8.1) | `WeekNav.test.tsx`의 `disabled` 단언 → pass |
| 6 | 오늘 강조 숨김 — 과거 주 (AC-5.9.1) | `DayCard.test.tsx`의 `queryAllByText('오늘').length === 0` 단언 → pass |
| 7 | 보고 있는 주 초기화 (AC-5.10.1) | `resetWeek.test.ts`의 `completionLogs` 제거 + `routines` 참조 동등 → pass |
| 8 | 칩 색 규칙 (5.1·6.1) | `CategoryChip.test.tsx`의 `backgroundColor` 단언 → pass (미완료 `#F2F4F6`, 완료 `#E8F1FF`, 카테고리 간 차이 없음) |
| 9 | 토큰 이식 완료 | `tokens.test.ts`의 PRD 6.1 색 값 전체 단언 → pass (0 mismatch) |
| 10 | 커버리지 80% 이상 | `jest --coverage --testPathPattern="components|store"` → `components/`, `store/(toggleCheck\|toggleCategory\|resetWeek)` 각 80% 이상 |
