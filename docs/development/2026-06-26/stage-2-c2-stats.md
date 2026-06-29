# Stage 2 — C2 통계 인사이트 개발계획서

> 문서 종류: 상세 개발계획서 (docs/development)
> 작성일: 2026-06-26
> 상위 출처: `docs/spec/2026-06-26/c2-stats-insights.md`, `docs/spec/2026-06-26/00-overview.md`

> **의존·순서**: 선행 Stage 1(A1)이 `domain/insights.ts`와 기록 탭을 신설했음을 전제로 한다. 본 Stage는 같은 모듈에 집계 함수를 추가하고 같은 탭에 C2 섹션을 더한다. 기존 M1 도메인(`weekProgress`/`weekDays`/`weekStartOf`)을 재사용한다.

---

## 1. 개요

| 항목 | 내용 |
|------|------|
| 목표 | `completionLogs`를 집계해 요일별 수행률·운동별 준수율·주간 추세를 수치로 보여준다 |
| 의존 | Stage 1(insights.ts·기록 탭 신설) 완료. 기존 `weekProgress` |
| 기간 | 2일 |
| 테스트 도구 | Jest, `tsc --noEmit` |

---

## 2. Day별 work package

### Day 1 — insights.ts 집계 함수

**목표**: `weekdayRate`/`exerciseRate`/`weeklyTrend`를 추가한다.

**산출물**
- `src/domain/insights.ts` (추가) — `WeekdayRate`/`ExerciseRate`/`WeekPoint` 타입과 세 함수 (`00-overview.md` §2 계약)

**작업**
1. 분모 원칙은 `weekProgress`와 정합한다(활동일 × 슬롯 보유 카테고리만 분모, rest·빈·`none` 제외).
2. `exerciseRate`는 슬롯 체크(`DayLog.checks`)를 **운동 이름**으로 묶어 합산한다(버전 무관 동명 합산, spec §1 join 규칙).
3. `weeklyTrend`는 `anchorWeekStart`가 속한 주를 포함해 직전 `weeks`개 주에 `weekProgress`를 반복 호출해 구성한다.

**측정 가능한 종료 조건** (아래 §3 수치)
- `weekdayRate(baseState, '2026-06-22', '2026-06-28')`의 월요일 엔트리 → `{weekday:'mon', done:1, total:2, pct:50}`
- `weeklyTrend(baseState, '2026-06-22', 2)` → 2개 주 포인트, `pct` 각각 `0`·`13`
- `tsc --noEmit` exit code 0

### Day 2 — 통계 섹션 컴포넌트 + 테스트

**목표**: 막대 컴포넌트로 통계 섹션을 구성하고 테스트한다.

**산출물**
- `src/components/insights/StatsSection.tsx` (구간 토글), `BarRow.tsx` (요일·운동 공용), `TrendBars.tsx`
- `__tests__/domain/insights.test.ts` (집계 케이스 추가), `__tests__/components/BarRow.test.tsx`

**작업**
1. `BarRow`는 라벨 + 비율 막대 + `"done/total · pct%"`를 표시(입력: 라벨, `{done,total,pct}`). 요일·운동 목록 양쪽 재사용.
2. 막대는 `View` width%, 채움 `color.primary`/트랙 `color.chipIdleBg`/`radius.full`. 수치 tabular-nums.
3. 구간 선택 상태는 화면 로컬 `useState`. 큰 구간 집계는 `useMemo`.

**측정 가능한 종료 조건**
- `jest __tests__/domain/insights.test.ts` → §3 집계 케이스 pass
- `jest __tests__/components/BarRow.test.tsx` → 비율 표시 pass
- `tsc --noEmit` exit code 0

---

## 3. 상세 테스트 케이스 (fixture·입력→기대 출력)

기준 fixture: `baseState`(Stage 1 §3와 동일). 06-22 로그만 존재.

### 3.1 weekdayRate — 한 주 요일별 수행률

- **입력**: `weekdayRate(baseState, '2026-06-22', '2026-06-28')`
- **기대 출력** (요일별 `{done,total,pct}`):

  | 요일 | total | done | pct | 근거 |
  |------|-------|------|-----|------|
  | 월 | 2 | 1 | 50 | 유산소 완료(1) + 무산소 미완(0) |
  | 화 | 2 | 0 | 0 | 로그 없음 |
  | 수~토 | 1 | 0 | 0 | 유산소만, 로그 없음 |
  | 일 | 0 | — | — | 휴식 제외(분모 0) |

### 3.2 exerciseRate — 운동 이름 집계

- **입력**: `exerciseRate(baseState, '2026-06-22', '2026-06-28')`
- **기대 출력** (검증 행):

  | 운동 이름 | total | done | pct | 근거 |
  |-----------|-------|------|-----|------|
  | `러닝 가볍게` | 2 | 1 | 50 | 월(`a1` 체크) + 금(`a1` 미기록) |
  | `푸시업` | 1 | 1 | 100 | 월 `x1` 체크 |
  | `덤벨 로우` | 1 | 0 | 0 | 월 `x3` 미체크 |

  > `러닝 가볍게`는 월·금 두 날에 같은 이름으로 편성되어 합산된다(`러닝 중간`·`걷기` 등 다른 이름은 별개).

### 3.3 weeklyTrend — 주간 추세

- **입력**: `weeklyTrend(baseState, '2026-06-22', 2)`
- **기대 출력**:
  - `[{weekStart:'2026-06-15', done:0, total:8, pct:0}, {weekStart:'2026-06-22', done:1, total:8, pct:13}]`
  - 근거: `06-15` 주는 루틴 활성(분모 8)·로그 없음(0). `06-22` 주는 월 유산소 1완료 → `round(1/8*100)=13`.

---

## 4. 종료 조건 (실행 명령)

| # | 종료 조건 | 검증 절차 |
|---|-----------|-----------|
| EC1 | `weekdayRate` 한 주 일치 | `jest __tests__/domain/insights.test.ts` → 3.1 월요일 `{done:1,total:2,pct:50}` 일치 |
| EC2 | `exerciseRate` 이름 집계 일치 | 3.2 세 행(`러닝 가볍게 1/2/50`, `푸시업 1/1/100`, `덤벨 로우 0/1/0`) 일치 |
| EC3 | `weeklyTrend` 추세 일치 | 3.3 결과 배열(`pct` `0`·`13`) 일치 |
| EC4 | `BarRow` 표시 통과 | `jest __tests__/components/BarRow.test.tsx` pass |
| EC5 | insights 커버리지 80% 이상 | `jest --coverage --collectCoverageFrom='src/domain/insights.ts'` → statements ≥ 80% |
| EC6 | 타입 검사 무오류 | `tsc --noEmit` exit code 0 |
