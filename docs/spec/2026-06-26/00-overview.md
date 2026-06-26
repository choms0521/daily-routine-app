# 후속 기능 설계서 — 개요 · 공유 계약

> 문서 종류: 큰 그림 설계서 (docs/spec)
> 작성일: 2026-06-26
> 상위 출처: `docs/prd/2026-06-26/feature-discovery-idea-pool.md` (실행 후보 Top 5), `docs/spec/2026-06-23/00-architecture.md` (레이어·규약 단일 출처)
> 하위 파생: 본 개요가 고정한 공유 계약 위에 5종 기능 설계서(`a1`·`b1`·`a3`·`b3`·`c2`)가 파생

---

## 0. 위치와 목적

발굴 아이디어 풀의 "큰 모델 변화 없는 Top 5"를 구현 가능한 설계로 구체화한다. 5종은 서로 결합되어 있으므로(셋이 같은 `completionLogs` read-model을 공유하고, 넷이 새 화면 표면을 추가한다), 개별 설계 전에 **두 공유 결정을 여기서 먼저 고정**한다.

1. 공유 도메인 모듈 `domain/insights.ts`의 함수 계약(시그니처)
2. 네비게이션 배치(새 표면을 어디에 둘 것인가)

개별 설계서는 이 계약을 전제로만 작성하여 중복 설계와 시그니처 드리프트를 막는다. 본 설계서들은 `docs/spec/2026-06-23/00-architecture.md`의 레이어 의존(UI → 상태 → 도메인 → 저장)·불변 갱신·Zod 단일 출처·디자인 토큰 규약을 위반하지 않는다.

---

## 1. 대상 5종과 의존 순서

| 코드 | 기능 | 설계서 | 스키마 변경 | 핵심 의존 |
|------|------|--------|------------|-----------|
| A1 | 히스토리 히트맵·캘린더 | `a1-history-heatmap.md` | 없음 | `domain/insights.ts` |
| C2 | 통계 인사이트 | `c2-stats-insights.md` | 없음 | `domain/insights.ts` |
| B3 | 주간 요약 카드 | `b3-weekly-summary.md` | 없음 | `domain/insights.ts` (+ `progress`/`streak`) |
| A3 | 행동 마일스톤 배지 | `a3-milestone-badges.md` | 없음(기본) / 선택적 확장 | `domain/badges.ts` |
| B1 | 로컬 리마인더 알림 | `b1-local-reminder.md` | **있음** (Settings 확장 → schemaVersion 2) | `expo-notifications`, `lib/notifications.ts` |

**빌드 순서 권고**: `domain/insights.ts`(공유) → A1 → C2 → B3(조합) → A3(독립) → B1(독립·범위 게이트).

A1/C2/B3은 결합도가 높으므로 한 흐름으로 작성한다. A3·B1은 독립적이나, B1은 범위 결정이 선행되어야 한다(아래 §4).

---

## 2. 공유 도메인 모듈 — `domain/insights.ts` (계약 고정)

`completionLogs`·타임라인을 읽어 파생값만 산출하는 **순수 read-model 함수** 모음이다. 저장·스키마 변경이 없고 "오늘"은 인자로 받는다. 분모 원칙은 기존 `weekProgress`와 동일하다 — rest day·빈 활동일·미활성일은 제외한다(`docs/spec/2026-06-23/00-architecture.md` §5 null/빈 날 일치 규칙).

```ts
// domain/insights.ts — 순수 read-model (스키마 변경 없음)
import type { AppState, DateKey, Weekday } from '@/types/schema';
import type { WeekProgress } from '@/domain/progress';

// A1: 캘린더/히트맵 한 칸의 분류.
export type DayStatus =
  | 'complete' // dayComplete(state, date) === true
  | 'partial'  // 슬롯 있고 일부만 체크 (카테고리 전체 완료는 아님)
  | 'empty'    // 활동일·슬롯 있으나 체크 0
  | 'rest'     // isRestDay(state, date)
  | 'none';    // 활성 버전 없음(plan == null) 또는 슬롯 없는 날
export function dayStatus(state: AppState, date: DateKey): DayStatus;

export interface DayStatusEntry { date: DateKey; status: DayStatus }
// 닫힌 구간 [fromDate..toDate] 오름차순. 월 그리드·연간 히트맵용.
export function historyRange(state: AppState, fromDate: DateKey, toDate: DateKey): DayStatusEntry[];

// C2: 구간 집계. 분모는 "활동일 × 슬롯 보유 카테고리"(weekProgress와 정합).
export interface WeekdayRate { weekday: Weekday; done: number; total: number; pct: number }
export function weekdayRate(state: AppState, fromDate: DateKey, toDate: DateKey): WeekdayRate[];

// 운동 이름 기준 집계. 체크는 슬롯 단위(DayLog.checks)이며 동명 운동은 합산.
export interface ExerciseRate { name: string; done: number; total: number; pct: number }
export function exerciseRate(state: AppState, fromDate: DateKey, toDate: DateKey): ExerciseRate[];

export interface WeekPoint { weekStart: DateKey; done: number; total: number; pct: number }
// anchorWeekStart가 속한 주를 포함해 직전 weeks개 주의 추세.
export function weeklyTrend(state: AppState, anchorWeekStart: DateKey, weeks: number): WeekPoint[];

// B3: 한 주 회고. 위 함수 + weekProgress + streak 조합.
export interface WeekReview {
  weekStart: DateKey;
  progress: WeekProgress;        // domain/progress 재사용
  completedDays: number;         // 그 주의 dayComplete 일수
  activeDays: number;            // 그 주의 비휴식·슬롯 보유 일수
  topWeekday: Weekday | null;    // 가장 잘 지킨 요일 (없으면 null)
  missedWeekday: Weekday | null; // 가장 못 지킨 요일 (없으면 null)
  deltaPct: number | null;       // 직전 주 대비 pct 변화 (직전 데이터 없으면 null)
}
export function weekReview(state: AppState, weekStartMonday: DateKey, today: DateKey): WeekReview;
```

- A1은 `dayStatus`/`historyRange`를 쓴다.
- C2는 `weekdayRate`/`exerciseRate`/`weeklyTrend`를 쓴다.
- B3은 `weekReview`를 쓰며, 내부에서 `weekProgress`·`streak`과 위 함수를 조합한다.
- 배지(A3)는 별도 `domain/badges.ts`에 두되 `streak`·`insights`를 재사용할 수 있다.
- **함수 내부 분기 값·구체 기대 수치·실행 명령은 본 설계서에 두지 않는다** — fixture와 입출력 수치는 `docs/development/`로 보낸다(spec/development 경계).

---

## 3. 네비게이션 배치 (고정)

- 현재 탭은 홈 / 라이브러리 / 설정 3종이다(`docs/spec/2026-06-23/00-architecture.md` §7).
- **신규 4번째 탭 "기록"**(`app/(tabs)/insights.tsx`)을 추가한다. 회고·동기부여 표면을 홈(오늘의 행동 표면)과 분리한다. 탭 추가는 라우트 파일만으로 끝나지 않을 수 있으므로, `app/(tabs)/_layout.tsx`가 탭을 명시 열거하는지 자동 발견하는지 확인해 새 탭을 등록한다(라벨·아이콘 포함).
- **기록 탭 섹션 순서(고정)**: (1) B3 주간 요약 카드 → (2) A1 캘린더·히트맵 → (3) C2 통계 → (4) A3 배지.
- **홈은 변경하지 않는다.** 홈은 이미 라이브 주간 진행률 바(`ProgressBar`)와 스트릭(`StreakBadge`)을 그린다. 따라서 B3/A1/C2를 홈에 중복 배치하지 않는다(중복 금지). B3은 홈 헤더가 보여주지 않는 회고 정보(완료일 수·최다/최소 요일·전주 대비)만 다룬다.
- **B1 알림 설정 UI는 기존 설정 탭**(`app/(tabs)/settings.tsx`)에 둔다(기록 탭 아님).
- **아이콘**: `src/components/ui/icons.tsx`에 기록 탭용 1종(예: `CalendarIcon`)을 추가한다. 기존 `IconProps`(`color: ColorValue; size?`) 규약을 따른다.

---

## 4. 스키마 변경 요약

| 기능 | 스키마 영향 |
|------|------------|
| A1 / C2 / B3 | `completionLogs` read-only. **변경 없음** |
| A3 | 기본은 순수 파생(저장 없음). 최초 획득 축하를 위해 acknowledged 배지 id 보존이 필요할 때만 **선택적 확장**(별도 플래그). 기본 설계는 무저장 |
| B1 | **유일하게 변경 필요.** `SettingsSchema`에 `reminder` 추가 → `CURRENT_SCHEMA_VERSION` 1→2 + `migrations[2]` 추가 + 마이그레이션 전 자동 백업 경유(PRD 8.4, 기존 `AsyncStorageRepository.load()` 경로 재사용) |

"큰 모델 변화 없는 Top 5"라는 선정 전제에 비추어, B1만 추가 스키마(마이그레이션)를 동반한다. 이는 기존 마이그레이션 골격(`domain/migration.ts`)에 단계 1개를 더하는 가법적(additive) 변경이며, 스트릭·진행률 같은 계산 의미는 건드리지 않는다. 자세한 절차는 `b1-local-reminder.md` §1.

---

## 5. 공통 준수 규칙 (재확인)

1. **레이어 의존 방향**: 화면은 store/selector·도메인 결과만 표시한다. read-model 계산을 화면에 두지 않는다.
2. **도메인 순수성**: `insights.ts`·`badges.ts`는 입력 → 출력 순수 함수. "오늘"은 인자로 받는다.
3. **불변 갱신**: 상태 변경 액션(B1 `setReminder` 등)은 새 객체 생성.
4. **디자인 토큰만 참조**: 색·간격·라운드는 `theme/tokens.ts` 토큰만. 하드코딩 금지.
5. **spec/development 경계**: 본 설계서들은 모듈·시그니처·구조까지만 다룬다. fixture 수치·실행 명령·day-by-day 작업 분해는 `docs/development/`로 파생한다.
