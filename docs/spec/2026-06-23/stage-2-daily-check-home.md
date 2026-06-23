# Stage 2 — 일일 체크 + 홈 (M2)

> 문서 종류: 단계별 스펙 (docs/spec)
> 작성일: 2026-06-22
> 상위 출처: `docs/prd/2026-06-23/workout-tracker-prd.md` (v1.2), `docs/spec/2026-06-23/00-architecture.md`
> 전제 단계: Stage 1 (M1 데이터 코어) — 아키텍처 5장 도메인 코어, 3장 폴더 구조
> 하위 파생: day-by-day 실행 계획은 `docs/development/2026-06-23/`로 분해한다.

---

## 1. 개요

| 항목 | 내용 |
|------|------|
| 목표 | 사용자가 실제로 보고 만지는 첫 화면(홈)과 일일 체크를 구현한다. PRD 6.1 디자인 토큰을 코드로 이식하고, 칩 체크 → 옵티미스틱 저장 → 진행률·스트릭 갱신의 핵심 루프를 완성한다. |
| PRD 마일스톤 | M2 일일 체크 + 홈 (PRD 9.3) |
| 범위 (in) | 디자인 토큰 이식(6.1), 홈 화면(6.4), 일일 체크 칩·펼치기·일괄 체크(5.1·5.2), 진행률 바·스트릭 표시(5.6·5.7), 주 이동(5.8), 오늘 강조(5.9), 보고 있는 주 초기화(5.10). store 액션 `toggleCheck`/`toggleCategory`/`resetWeek`(옵티미스틱 저장). |
| 범위 (out) | 루틴 에디터·라이브러리(5.3·5.4 → Stage 3), 공유·임포트(5.5 → Stage 4), 정교한 마이크로인터랙션 튜닝(6.3 → Stage 5), 백업·마이그레이션 완성(Stage 5). 진행률·스트릭·`plan`·`versionOf` 등의 **계산 자체는 Stage 1 도메인 함수**이며 이 단계는 호출·표시만 한다. |
| 의존 (Stage 1) | `types/schema.ts`(엔티티·Zod), `domain/timeline.ts`·`progress.ts`·`streak.ts`·`completion.ts`·`date.ts`, `repository/`(저장 추상화), `store/appStore.ts`의 `hydrate()`. 본 단계는 이 위에 UI와 일부 store 액션을 얹는다. |
| 개략 일수 | 4~5일 (풀타임). day-by-day 분해는 `docs/development/2026-06-23/`. |

핵심 원칙(반복): **Stage 2는 표시하고, Stage 1은 계산한다.** 홈과 칩은 store를 좁은 selector로 구독해 Stage 1 도메인 함수의 결과를 렌더링할 뿐, 진행률·스트릭·버전 해소 로직을 다시 두지 않는다(아키텍처 2장 의존 방향, 부록 규칙 3).

---

## 2. 구현할 기능·화면·컴포넌트 목록 (PRD 매핑)

| 산출물 | PRD 절 | 종류 | 비고 |
|--------|--------|------|------|
| `theme/tokens.ts` | 6.1 | 토큰 | 색·타이포·간격·라운드·그림자 1:1 이식 |
| `theme/ThemeProvider.tsx` | 6.1 | 컨텍스트 | 토큰 주입(아키텍처 3장) |
| `app/(tabs)/index.tsx` | 6.4 | 화면 | 홈(오늘/주간) |
| `app/(tabs)/_layout.tsx` | 6.2 | 라우트 | 탭 레이아웃(홈 탭 노출; 다른 탭은 후속 단계) |
| `components/chip/CategoryChip.tsx` | 5.1 | 컴포넌트 | 유산소/무산소 칩(미완료=무채색, 완료=점등) |
| `components/chip/ExerciseList.tsx` | 5.2 | 컴포넌트 | 펼치기 + 개별 운동 체크(세트 정보 표시) |
| `components/chip/DayCard.tsx` | 6.4 | 컴포넌트 | 요일 카드(칩 묶음·휴식일 표시·오늘 강조) |
| `components/progress/ProgressBar.tsx` | 5.6 | 컴포넌트 | 진행률 바 + `5 / 8 · 63%` 표시 |
| `components/progress/StreakBadge.tsx` | 5.7 | 컴포넌트 | 스트릭 숫자 표시 |
| `components/home/WeekNav.tsx` | 5.8 | 컴포넌트 | 이전/다음 주 이동(미래 비활성) |
| `components/home/WeekEmptyState.tsx` | 10.1 Q6 | 컴포넌트 | 빈 주(활성 루틴 없던 과거) 빈 상태 |
| `store/appStore.ts`의 `toggleCheck` | 5.1 | 액션 | 슬롯 단위 체크 토글(옵티미스틱) |
| `store/appStore.ts`의 `toggleCategory` | 5.2 | 액션 | 카테고리 일괄 체크/해제 |
| `store/appStore.ts`의 `resetWeek` | 5.10 | 액션 | 보고 있는 주 완료 로그 제거 |
| `store/selectors.ts`의 홈 selector | 6장 | 선택자 | 진행률·스트릭·요일별 칩 상태 구독 |

> 에디터·라이브러리 관련 액션(`createRoutine`/`editRoutine`/`setActiveRoutine`)과 `importRoutine`은 이 단계 범위가 아니다(Stage 3·4). `hydrate()`는 Stage 1 산출물이다.

---

## 3. 디자인 토큰 이식 (`theme/tokens.ts`)

PRD 6.1 토큰을 코드 상수로 그대로 옮긴다. **값은 PRD를 단일 출처로 하며 임의 변경하지 않는다**(부록 규칙 1·5). 토큰만 참조하고 색·간격을 하드코딩하지 않는다(부록 규칙 5).

```typescript
// theme/tokens.ts (구조 개요 — 값은 PRD 6.1 그대로)
export const color = {
  bg: '#FFFFFF',
  surface: '#F9FAFB',
  surfaceElevated: '#FFFFFF',
  primary: '#3182F6',          // Toss Blue — 완료 칩 점등·CTA·강조
  primaryWeak: '#E8F1FF',      // 완료 칩 배경·선택 상태
  primaryPressed: '#1B64DA',
  chipIdleBg: '#F2F4F6',       // 미완료 칩 배경(무채색, 유산소·무산소 공통)
  chipIdleFg: '#4E5968',       // 미완료 칩 텍스트(무채색)
  fg: '#191F28',
  fgMuted: '#8B95A1',
  fgSubtle: '#B0B8C1',
  border: '#E5E8EB',
  success: '#08A05C',          // 성공 토스트 등 상태 메시지에만 한정
  warn: '#FF9500',
  danger: '#F04452',
} as const;

export const font = {
  display: { size: 32, weight: '700' },   // 스트릭 숫자·진행률 %
  title: { size: 22, weight: '700' },
  subtitle: { size: 18, weight: '600' },
  body: { size: 15, weight: '400' },
  caption: { size: 13, weight: '400' },   // 세트 정보·보조 라벨
  numeric: { fontVariant: ['tabular-nums'] }, // 숫자 고정폭 정렬
} as const;

export const space = { s1: 4, s2: 8, s3: 12, s4: 16, s5: 24, s6: 32 } as const;
export const radius = { chip: 10, card: 16, sheet: 20, full: 999 } as const;
export const shadow = {
  card: { /* 0 1px 3px rgba(0,0,0,0.06) — 플랫폼별 elevation/shadow 매핑 */ },
  sheet: { /* 0 -4px 24px rgba(0,0,0,0.12) */ },
} as const;
```

### 칩 색 규칙 (가장 흔한 오해 지점 — 정확히 따른다)

PRD 5.1·6.1을 그대로 운영화한다. 색은 카테고리가 아니라 **완료 여부**만 표현한다.

- **미완료(idle)**: 유산소·무산소 모두 무채색. 배경 `color.chipIdleBg`(#F2F4F6), 텍스트 `color.chipIdleFg`(#4E5968).
- **완료(complete)**: 두 카테고리 모두 동일하게 Toss Blue로 점등. 배경 `color.primaryWeak`(#E8F1FF), 텍스트·체크 표시 `color.primary`(#3182F6).
- **카테고리 구분은 칩 안의 라벨 텍스트("유산소"/"무산소")로만 한다.** 색으로 구분하지 않는다.
- 기존 스펙의 러닝(코랄)/근력(민트) 색 코드는 폐기한다(PRD 부록 B). 화면의 파랑은 "완료"라는 단일 의미만 가진다(D5 단일 주 색상).
- 초록(`color.success`)은 카테고리 색으로 쓰지 않으며 성공 토스트 등 상태 메시지에만 한정한다.

---

## 4. 홈 화면 설계 (`app/(tabs)/index.tsx`)

PRD 6.4 개념도를 컴포넌트 트리로 옮긴다. 화면은 store를 좁은 selector로 구독하고 계산은 Stage 1 도메인 함수에 위임한다.

### 컴포넌트 트리

```
HomeScreen (app/(tabs)/index.tsx)
├── HomeHeader
│   ├── 활성 루틴명 (예: "여름 컨디셔닝")
│   ├── StreakBadge          ← streak 숫자 ("🔥 12일")
│   ├── 주 라벨 ("6.22 – 6.28 · 이번 주")
│   ├── ProgressBar          ← weekProgress 결과 ("5 / 8 · 63%")
│   └── WeekNav              ← ‹ 지난 주 / 다음 주 › (미래 비활성)
├── DayCard[] (월~일, 7장)
│   ├── 요일 라벨 + "오늘" 태그(이번 주 + 그날만)
│   ├── CategoryChip(유산소)  ← 그날 aerobic 슬롯 ≥1 일 때만
│   │   └── ExerciseList     ← 펼침 시 개별 운동 + 세트 캡션
│   ├── CategoryChip(무산소)  ← 그날 anaerobic 슬롯 ≥1 일 때만
│   │   └── ExerciseList
│   └── (휴식일이면) "휴식 — 회복하는 날"
├── WeekEmptyState           ← 보고 있는 주에 활성 루틴 없던 경우(Q6)
└── ResetWeekButton          ← "보고 있는 주 초기화"
```

### store 구독 (selector)

홈은 "보고 있는 주(viewedWeekStart, 월요일 날짜 키)"와 "오늘 날짜"를 입력으로, 다음 파생값만 좁게 구독한다(아키텍처 6장 selector 분리). 잦은 칩 토글이 무관한 영역을 리렌더하지 않도록 selector를 좁게 둔다.

| 구독 대상 | 출처(Stage 1 도메인) | 표시 위치 |
|-----------|----------------------|-----------|
| `weekProgress(state, viewedWeekStart)` → `{ done, total, pct }` | `domain/progress.ts` | ProgressBar |
| `streak(state, today)` → 연속 일수 | `domain/streak.ts` | StreakBadge |
| 각 날짜의 `plan(state, date)` (DayPlan 또는 null) | `domain/timeline.ts` | DayCard·CategoryChip |
| 각 날짜의 `isRestDay(state, date)` | `domain/completion.ts` | DayCard 휴식 표시 |
| 각 카테고리의 `categoryDone(state, date, category)` | `domain/completion.ts` | CategoryChip 완료/미완료 |
| 해당 날짜 `DayLog.checks[category][slotId]` (개별 체크 상태) | `state.completionLogs` | ExerciseList 체크박스 |
| 활성 루틴명 | `state.settings.activeRoutineId` → 루틴 조회 | HomeHeader |

- `viewedWeekStart`는 홈 로컬 컴포넌트 상태(또는 좁은 store 슬라이스)로 둔다. 초기값은 이번 주(오늘이 속한 월요일). 주 이동(5.8)은 이 값만 바꾼다.
- "오늘"은 기기 로컬 타임존 기준(D9). `domain/date.ts`로 날짜 키를 산출한다(주 월요일 시작).
- 계산식(분모·분자·스트릭 소급)은 절대 화면에서 재구현하지 않는다. 위 함수들은 Stage 1이 제공한다(아키텍처 5장 매핑 표).

---

## 5. 일일 체크 인터랙션 (5.1·5.2)

### 동작 정의

| 인터랙션 | 동작 | PRD AC |
|----------|------|--------|
| 칩 탭 (완료↔미완료) | 그 카테고리 슬롯 전체를 동일 상태로 일괄 토글 → `toggleCategory(date, category, value)` | AC-5.1.1, AC-5.2.3 |
| 펼치기 아이콘 탭 | 운동 목록(ExerciseList) 확장/접기. 로컬 UI 상태(저장 없음) | 5.2 |
| 개별 운동 체크 | 슬롯 단위 토글 → `toggleCheck(date, category, slotId)` | AC-5.2.1 |
| 전부 체크 시 칩 점등 | 파생값(`categoryDone`)으로 자동 — 별도 저장 없음 | AC-5.2.2 |

- **칩은 그날 해당 카테고리에 슬롯이 1개 이상일 때만 표시**한다(AC-5.1.3). 슬롯 0개 카테고리의 칩은 렌더하지 않는다.
- 개별 운동에는 세트 정보를 **읽기 전용 캡션**으로 표시한다(예: "4 × 한계-2"). 체크는 boolean 토글이다. 목표 대비 실제 달성량(예: 30분 목표/20분 실제, 무산소 세트별 횟수 1세트 15·2세트 10) 입력은 **v1 비목표**이며 PRD 11장 v2 확장("세트별 실측 입력")으로 분류된다(PRD 1.4 비목표 정합). `DayLog.checks`가 boolean 전용이므로 이 단계에서 수치 입력 UI를 만들지 않는다.
- 유산소·무산소는 동일한 펼치기·체크 규칙을 따른다(AC-5.2.4, 비대칭 없음). 유산소가 단일 종목이어도 같은 규칙이다.

### 옵티미스틱 갱신 흐름 (PRD 6.3·8.3, 아키텍처 6장)

```
사용자 칩/체크 탭
  → store 액션(toggleCheck / toggleCategory) 호출
      → AppState를 불변 갱신(새 객체) — UI 즉시 반영
      → Repository.save(newState)를 비동기 수행(await하지 않고 진행)
  → selector 구독 컴포넌트(칩·ProgressBar·StreakBadge) 즉시 재계산·재렌더
  → 저장 성공: 추가 동작 없음
  → 저장 실패: 토스트로만 알림(8장 기술 노트)
```

- 액션은 RoutineVersion·타임라인을 건드리지 않는다. `completionLogs`의 해당 날짜 `DayLog.checks`만 불변 갱신한다.
- `DayLog`가 없던 날을 처음 체크하면 그날 `versionId`·`routineId`를 함께 기록한다(AC-5.1.4). 이 `versionId`는 그 시점 `versionOf(today)` 결과이며, 오늘 보호 불변식(D8.8)에 따라 당일 편집·전환에도 `plan(today)`와 일치를 유지한다(PRD 4.4 필드 설명).

---

## 6. 진행률·스트릭 표시 (5.6·5.7)

표시 전용이다. 계산은 Stage 1 도메인 함수를 호출한다(부록 규칙 3).

- **ProgressBar**: `weekProgress(state, viewedWeekStart)` 결과 `{ done, total, pct }`를 받아 막대 너비 = `pct`%, 라벨 = `"{done} / {total} · {pct}%"`로 표시한다. PRD 6.4 개념도와 동일하게 `5 / 8 · 63%` 형태다. 수치는 도메인 함수 반환값을 그대로 쓰며, 화면에서 재계산하거나 반올림을 다시 적용하지 않는다(PRD 4.6의 `5/8 = 63%` 도출과 정합).
- **StreakBadge**: `streak(state, today)` 반환 일수를 `--font-display`(32/Bold)로 크게, `tabular-nums`로 표시한다(예: "🔥 12일"). 숫자가 화면의 주인공이다(PRD 6.3).
- `total == 0`(빈 주 등)이면 진행률 라벨은 `0 / 0 · 0%`로 표시하고, 빈 주 빈 상태(7절 Q6 연계)를 함께 노출할 수 있다.
- 진행률·스트릭은 칩 토글 시 selector 재계산으로 즉시 갱신된다(5절 옵티미스틱 흐름).

---

## 7. 주 이동·오늘 강조·초기화 (5.8·5.9·5.10)

### 7.1 주 이동 (5.8)

- WeekNav가 `viewedWeekStart`를 이전/다음 주 월요일로 이동시킨다.
- **다음 주 버튼은 이번 주를 보고 있을 때 비활성화**한다(이번 주가 상한, AC-5.8.1). 미래 주로는 이동하지 못한다.
- 주 라벨에 날짜 범위(예: "6.22 – 6.28")와 "이번 주 / 지난 주" 표기를 둔다.
- 과거 주를 열면 그 주 각 날짜의 버전으로 데이터가 표시된다(AC-5.8.2). 날짜별 버전 조회는 Stage 1 `plan`/`versionOf`가 처리한다.

### 7.2 오늘 강조 (5.9)

- 보고 있는 주가 이번 주이고 그 날짜가 오늘일 때만 해당 DayCard에 "오늘" 태그 + 강조를 표시한다.
- **과거 주를 보면 "오늘" 강조를 표시하지 않는다**(AC-5.9.1).

### 7.3 보고 있는 주 초기화 (5.10)

- 버튼 라벨은 **"보고 있는 주 초기화"** 이며, 대상은 항상 **현재 보고 있는 주(`viewedWeekStart`)** 다. 과거 주를 보고 있으면 그 과거 주가 초기화 대상이다(라벨과 동작 일치).
- `resetWeek(viewedWeekStart)` 액션은 그 주(월~일) 날짜의 완료 로그만 비운다. **루틴 정의·버전·타임라인은 변형하지 않는다**(AC-5.10.1).
- **초기화 전 확인 단계**를 거친다(실수 방지, AC-5.10.2). 과거 주를 초기화할 때는 확인 문구에 "과거 주를 초기화합니다"를 명시한다.

---

## 8. 기술 노트

- **expo-router 탭**: `app/(tabs)/_layout.tsx`에 탭 레이아웃을 두고 이 단계에서는 홈 탭을 노출한다. 라이브러리·설정 탭은 후속 단계에서 채운다(아키텍처 7장 라우트 표).
- **reanimated 기본 트랜지션만**: 칩 완료 색 전환·스케일 바운스·진행률 바 width 트윈은 PRD 6.3에 명시됐으나, 이 단계에서는 기본 수준의 트랜지션으로만 적용한다. 정교한 마이크로인터랙션 튜닝(타이밍 0.96→1.0, 150~200ms 등 미세 조정)은 **Stage 5로 미룬다**.
- **옵티미스틱 저장 실패 토스트**: `Repository.save` 실패 시에만 토스트로 알린다(PRD 6.3·8.3). 토스트 메시지는 성공 상태색(`color.success`)이 아니라 실패 안내이므로 `color.danger`/중립 톤을 쓴다. UI는 옵티미스틱 반영을 유지하되, 영속화 실패 사실을 사용자에게 노출한다.
- **불변 갱신**: 모든 액션은 새 객체를 만들고 기존 `AppState`·`DayLog`를 in-place 수정하지 않는다(부록 규칙 4, 코딩 규약).
- **계산 위임 경계**: 홈·칩·진행률·스트릭 컴포넌트에는 도메인 계산 로직(분모 산정·소급 루프·버전 해소)을 두지 않는다. 전부 Stage 1 함수 호출이다(아키텍처 2장·5장).

---

## 9. 테스트 방향

칩 체크·저장·재시작 유지(AC-5.1.2), 일괄 체크(AC-5.2.3), 진행률·스트릭 표시 정합(`5 / 8 · 63%`), 주 이동 경계(AC-5.8.1), 오늘 강조 비표시(AC-5.9.1), 보고 있는 주 초기화(AC-5.10.1/.2), 칩 색 규칙 정합을 단위(RNTL)/통합/E2E(Maestro)로 검증한다. 상세 테스트 케이스·fixture·종료 조건 실행 명령은 `docs/development/2026-06-23/stage-2-daily-check-home.md` 참조.

---

## 10. 주의·미해결 연계

- **Q1 (주중 전환·편집 시 홈 표시)** — 본격 처리는 Stage 3(에디터·라이브러리)에서 이루어지나, 홈의 **표시 책임**은 이 단계에 있다. PRD 5.4 전환 당일 표시 규칙을 따른다: 오늘 홈의 요일 카드·칩·진행률·스트릭은 `plan(today)`(타임라인 단일 출처)를 그대로 따르며, 전환·편집이 있어도 오늘 값은 변하지 않는다(D8.8 오늘 보호). 전환 지점 구분선과 "내일부터 '(루틴명)' 적용" 배너의 시각 형태는 Q1 미해결로, 이 단계의 홈은 **날짜별 버전 조회 결과를 그대로 표시**하는 구조만 갖추고, 배너·구분선의 구체 UX는 Stage 3에서 확정한다. 이 단계는 표시 규칙(5.4) 연계만 보장한다(에디터·전환 액션 자체는 만들지 않음).
- **Q6 (빈 주 빈 상태 UI)** — 활성 루틴이 없던 과거 주를 열면 `weekProgress`가 `{ done: 0, total: 0, pct: 0 }`을 반환하고 스트릭은 통과한다(계산은 Stage 1 null 가드로 해소됨, PRD 4.5~4.7). 이 단계의 `WeekEmptyState`는 "이 주에는 활성 루틴이 없었습니다" 형태의 빈 상태를 노출한다. 정확한 문구·일러스트는 Q6 미확정이므로 잠정 문구로 두고 Stage 5 다듬기에서 확정한다.
