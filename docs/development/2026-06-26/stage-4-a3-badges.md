# Stage 4 — A3 행동 마일스톤 배지 개발계획서

> 문서 종류: 상세 개발계획서 (docs/development)
> 작성일: 2026-06-26
> 상위 출처: `docs/spec/2026-06-26/a3-milestone-badges.md`, `docs/spec/2026-06-26/00-overview.md`

> **의존·순서**: 선행 Stage 1(기록 탭 신설). 본 Stage는 독립 모듈 `domain/badges.ts`·`constants/badgeCatalog.ts`를 신설하고 기록 탭 네 번째 섹션을 더한다. `insights.ts`와는 별개 모듈이나 행동 지표 산출에 기존 도메인을 재사용한다. **기본 설계는 무저장(순수 파생)** — 스키마 변경 없음.

---

## 1. 개요

| 항목 | 내용 |
|------|------|
| 목표 | 행동 지표(총 완료일·최장 스트릭) 기반 마일스톤 배지를 부여·표시한다 |
| 의존 | Stage 1(기록 탭), 기존 `dayComplete`·`isRestDay`·`versionOf`·`hasAnySlot`·`weekDays`/`addDays` |
| 기간 | 2일 |
| 테스트 도구 | Jest, `tsc --noEmit` |

---

## 2. Day별 work package

### Day 1 — badgeCatalog + badges.ts

**목표**: 배지 카탈로그와 판정 함수를 구현한다.

**산출물**
- `src/constants/badgeCatalog.ts` (신규) — 배지 정의 데이터
- `src/domain/badges.ts` (신규) — `BadgeStatus` 타입, `earnedBadges`, 내부 `totalCompletedDays`/`longestStreak`

**작업**
1. **카탈로그(확정 초기값)**:

   | id | metric | target | 표시명 |
   |----|--------|--------|--------|
   | `first-complete` | 총 완료일 | 1 | 첫 완료 |
   | `total-10` | 총 완료일 | 10 | 완료 10일 |
   | `total-50` | 총 완료일 | 50 | 완료 50일 |
   | `total-100` | 총 완료일 | 100 | 완료 100일 |
   | `streak-7` | 최장 스트릭 | 7 | 7일 연속 |
   | `streak-30` | 최장 스트릭 | 30 | 30일 연속 |

2. `totalCompletedDays(state)`: `completionLogs`의 날짜 중 `dayComplete(state, date) === true`인 수.
3. `longestStreak(state)`: 기록 구간을 시간순 주사하며 연속 완료 활동일의 최대 길이. 휴식·미활성·빈 날은 `streak()`와 동일하게 통과(런을 끊지 않음).
4. `earnedBadges(state, today)`: 각 카탈로그 항목에 metric 값을 적용 → `earned = value >= target`, `progress = { current: value, target }`.

**측정 가능한 종료 조건** (아래 §3)
- `totalCompletedDays(baseState)` → `0`; `earnedBadges(baseState, '2026-06-22')`의 `first-complete.earned === false`, `progress === {current:0, target:1}`
- `withMonTueComplete`에서 `totalCompletedDays === 2`, `longestStreak === 2`
- `tsc --noEmit` exit code 0

### Day 2 — BadgeGrid/BadgeItem + 테스트 + 통합

**목표**: 배지 그리드를 구현하고 테스트한다.

**산출물**
- `src/components/badges/BadgeGrid.tsx`, `BadgeItem.tsx`
- `src/store/selectors.ts` (추가) — `selectBadges(state, today)` (획득 → 진행 중 → 미획득 정렬)
- `__tests__/domain/badges.test.ts`, `__tests__/components/BadgeItem.test.tsx`, `__tests__/integration/insights.test.tsx` (A3 섹션)

**작업**
1. `BadgeItem`: 획득 `color.primary` 강조 / 미획득 `color.chipIdleBg`·`color.chipIdleFg`. 미획득은 진행 게이지(`BarRow` 언어 재사용).
2. `selectBadges` 정렬.
3. 배지 아이콘은 `icons.tsx` 규약(`ColorValue`) svg.

**측정 가능한 종료 조건**
- `jest __tests__/domain/badges.test.ts` → §3 케이스 pass
- `jest __tests__/components/BadgeItem.test.tsx` → 획득/미획득 표시 pass
- `tsc --noEmit` exit code 0

---

## 3. 상세 테스트 케이스 (fixture·입력→기대 출력)

기준 fixture: `baseState`. 보강 fixture는 월·화를 모두 완전 완료로 만든다.

```ts
const withMonTueComplete = withLogs(baseState, {
  '2026-06-22': { date:'2026-06-22', routineId:'rt_aXk92', versionId:'v_001',
    checks:{ aerobic:{a1:true}, anaerobic:{x1:true,x2:true,x3:true} } }, // Mon 완전 완료
  '2026-06-23': { date:'2026-06-23', routineId:'rt_aXk92', versionId:'v_001',
    checks:{ aerobic:{a1:true}, anaerobic:{x1:true,x2:true,x3:true} } }, // Tue 완전 완료
});
```

### 3.1 지표 함수

- `totalCompletedDays(baseState)` → `0` (월은 `x3` 미체크 → 미완)
- `totalCompletedDays(withMonTueComplete)` → `2`
- `longestStreak(withMonTueComplete)` → `2` (월·화 연속 활동일 완료)

### 3.2 earnedBadges — 임계 매핑

- **입력 A**: `earnedBadges(baseState, '2026-06-22')`
  - `first-complete` → `earned:false`, `progress:{current:0, target:1}`
  - 모든 배지 `earned:false`
- **입력 B**: `earnedBadges(withMonTueComplete, '2026-06-23')`
  - `first-complete` → `earned:true`, `progress:{current:2, target:1}`
  - `total-10` → `earned:false`, `progress:{current:2, target:10}`
  - `streak-7` → `earned:false`, `progress:{current:2, target:7}`

---

## 4. 종료 조건 (실행 명령)

| # | 종료 조건 | 검증 절차 |
|---|-----------|-----------|
| EC1 | 지표 함수 일치 | `jest __tests__/domain/badges.test.ts` → 3.1(`0`/`2`/`2`) 일치 |
| EC2 | 임계 매핑 일치 | 3.2 입력 A/B의 `earned`·`progress` 일치 |
| EC3 | 배지 표시 통과 | `jest __tests__/components/BadgeItem.test.tsx` pass |
| EC4 | badges 커버리지 80% 이상 | `jest --coverage --collectCoverageFrom='src/domain/badges.ts'` → statements ≥ 80% |
| EC5 | 타입 검사 무오류 | `tsc --noEmit` exit code 0 |

> 최초 획득 1회 축하 연출은 무저장 설계에서 감지 불가하다(spec §6). 채택 시 acknowledged id 보존(스키마 + 마이그레이션)이 선행되며, 본 Stage 범위 밖이다.
