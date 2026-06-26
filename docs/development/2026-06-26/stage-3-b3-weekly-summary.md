# Stage 3 — B3 주간 요약 카드 개발계획서

> 문서 종류: 상세 개발계획서 (docs/development)
> 작성일: 2026-06-26
> 상위 출처: `docs/spec/2026-06-26/b3-weekly-summary.md`, `docs/spec/2026-06-26/00-overview.md`

> **의존·순서**: 선행 Stage 1(insights.ts·기록 탭 신설). 본 Stage는 `weekReview`를 `insights.ts`에 추가하고 기록 탭 최상단에 카드를 더한다. `weekReview`는 기존 `weekProgress`·`streak`을 조합한다. C2(Stage 2)와는 독립이나, 권고 순서상 C2 다음에 둔다(`00-overview.md` §1).

---

## 1. 개요

| 항목 | 내용 |
|------|------|
| 목표 | 한 주의 회고 요약 카드. 홈 헤더가 이미 그리는 라이브 진행률·스트릭과 **구별되는** 회고 정보만 표시한다 |
| 의존 | Stage 1(insights.ts·기록 탭), 기존 `weekProgress`·`streak`·`domain/korean` |
| 기간 | 1~2일 |
| 테스트 도구 | Jest, `tsc --noEmit` |

> **중복 금지(핵심)**: 홈은 이미 `ProgressBar`("5 / 8 · 63%")·`StreakBadge`를 그린다. B3은 그 수치를 다시 그리지 않고, 홈에 없는 회고 정보(완료일 수·최다/최소 요일·전주 대비)만 다룬다.

---

## 2. Day별 work package

### Day 1 — weekReview + WeekReviewCard

**목표**: `weekReview`를 구현하고 회고 카드를 만든다.

**산출물**
- `src/domain/insights.ts` (추가) — `WeekReview` 타입, `weekReview` (`00-overview.md` §2 계약)
- `src/store/selectors.ts` (추가) — `selectWeekReview(state, weekStartMonday, today)` (호출 + 자연어 포맷 집결)
- `src/components/insights/WeekReviewCard.tsx` (신규) — `Card` 재사용

**작업**
1. `weekReview`: `progress = weekProgress`, `completedDays = 그 주 dayComplete 일수`, `activeDays = 비휴식·슬롯 보유 일수`, `topWeekday`/`missedWeekday = 그 주 요일별 완료 비율의 최고/최저`, `deltaPct = 이번 주 pct − 직전 주 pct`.
2. **타이브레이크 규칙(확정)**: `topWeekday`/`missedWeekday` 동률은 월요일 우선(`WEEKDAYS` 순서 빠른 요일). 직전 주 데이터 없으면 `deltaPct = null`.
3. 자연어 한 줄은 `selectWeekReview`에서 포맷. 조사는 `domain/korean`의 `subjectParticle`/`instrumentalParticle` 재사용.
4. `WeekReviewCard`는 표시 전용. 핵심 수치 `font.display`+tabular-nums, 델타 부호 색은 토큰(`+`→`color.success`, `−`→`color.fgMuted`).

**측정 가능한 종료 조건** (아래 §3)
- `weekReview(baseState, '2026-06-22', '2026-06-22').deltaPct` → `13`
- 자연어 한 줄이 조사 처리를 포함해 생성됨(빈 문자열 아님)
- `tsc --noEmit` exit code 0

### Day 2 — 테스트 + 통합 + 빈/경계 처리

**목표**: §3 케이스를 통과하고 빈 주·직전 주 없음을 처리한다.

**산출물**
- `__tests__/domain/insights.test.ts` (`weekReview` 케이스 추가)
- `__tests__/integration/insights.test.tsx` (B3 카드가 기록 탭 최상단 렌더)

**작업**
1. §3.1~3.2 케이스 구현.
2. `deltaPct === null`(직전 주 없음)·`activeDays === 0`(빈 주) 카피 분기.
3. 홈 화면(`app/(tabs)/index.tsx`)에 B3 항목을 추가하지 않음을 확인(중복 금지 회귀 가드).

**측정 가능한 종료 조건**
- `jest __tests__/domain/insights.test.ts` → `weekReview` 케이스 pass
- `tsc --noEmit` exit code 0

---

## 3. 상세 테스트 케이스 (fixture·입력→기대 출력)

기준 fixture: `baseState`. 보강 fixture는 화요일 완료를 추가한다.

```ts
const withTue = withLogs(baseState, {
  '2026-06-23': { date:'2026-06-23', routineId:'rt_aXk92', versionId:'v_001',
    checks:{ aerobic:{a1:true}, anaerobic:{x1:true,x2:true,x3:true} } },
});
```

### 3.1 weekReview — baseState (월만 일부 수행)

- **입력**: `weekReview(baseState, '2026-06-22', '2026-06-22')`
- **기대 출력**:
  - `progress` → `{done:1, total:8, pct:13}`
  - `completedDays` → `0` (월은 무산소 `x3` 미체크 → 미완)
  - `activeDays` → `6` (월~토; 일 휴식 제외)
  - `topWeekday` → `'mon'` (월 1/2=50%, 나머지 0%)
  - `missedWeekday` → `'tue'` (0% 동률 중 월요일 우선 → 화)
  - `deltaPct` → `13` (직전 주 `06-15` pct `0` 대비 +13)

### 3.2 weekReview — withTue (화 완전 완료)

- **입력**: `weekReview(withTue, '2026-06-22', '2026-06-22')`
- **기대 출력**:
  - `progress` → `{done:3, total:8, pct:38}` (월 유산소 1 + 화 2 = 3; `round(3/8*100)=38`)
  - `completedDays` → `1` (화 전 카테고리 완료)
  - `activeDays` → `6`
  - `topWeekday` → `'tue'` (100%)
  - `missedWeekday` → `'wed'` (0% 동률 중 가장 빠른 요일)
  - `deltaPct` → `38`

---

## 4. 종료 조건 (실행 명령)

| # | 종료 조건 | 검증 절차 |
|---|-----------|-----------|
| EC1 | `weekReview` baseState 일치 | `jest __tests__/domain/insights.test.ts` → 3.1 전 필드 일치 |
| EC2 | `weekReview` withTue 일치 | 3.2 전 필드 일치(`completedDays:1`, `topWeekday:'tue'`, `deltaPct:38`) |
| EC3 | 직전 주 없음 처리 | 직전 주 데이터 없는 fixture에서 `deltaPct === null` |
| EC4 | 홈 중복 회귀 가드 | `app/(tabs)/index.tsx`에 진행률 바·스트릭 외 B3 항목 미추가(통합 테스트로 홈 구성 불변 확인) |
| EC5 | 타입 검사 무오류 | `tsc --noEmit` exit code 0 |
