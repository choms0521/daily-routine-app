# Stage 1 — A1 히스토리 히트맵·캘린더 개발계획서

> 문서 종류: 상세 개발계획서 (docs/development)
> 작성일: 2026-06-26
> 상위 출처: `docs/spec/2026-06-26/a1-history-heatmap.md`, `docs/spec/2026-06-26/00-overview.md`

> **의존·순서**: 후속 기능 5종의 진입점이다(`00-overview.md` §1 빌드 순서: insights.ts → A1 → C2 → B3 → A3 → B1). 본 Stage가 공유 모듈 `domain/insights.ts`와 기록 탭을 **신설**하므로, C2/B3/A3는 본 Stage 완료를 전제로 한다. 기존 M1 도메인(`versionOf`/`plan`/`isRestDay`/`dayComplete`/`hasAnySlot`/`weekDays`/`addDays`)은 main에 존재한다.

---

## 1. 개요

| 항목 | 내용 |
|------|------|
| 목표 | `completionLogs`를 월간 캘린더·연간 히트맵으로 시각화한다. 공유 `domain/insights.ts`의 `dayStatus`/`historyRange`를 신설하고 기록 탭을 신설한다 |
| 의존 | 기존 M1 도메인(main 존재). 선행 Stage 없음(진입점) |
| 기간 | 2~3일 (풀타임 기준) |
| 테스트 도구 | Jest (단위·컴포넌트), `tsc --noEmit` |

---

## 2. Day별 work package

### Day 1 — insights.ts 분류 함수 + 기록 탭 스캐폴드

**목표**: `dayStatus`/`historyRange`를 구현하고 기록 탭을 신설한다.

**산출물**
- `src/domain/insights.ts` (신규) — `DayStatus` 타입, `dayStatus`, `historyRange`, `DayStatusEntry` (`00-overview.md` §2 계약)
- `src/app/(tabs)/insights.tsx` (신규) — 기록 탭 화면 셸(섹션 컨테이너; 이번 Stage는 A1 섹션만 채움)
- `src/app/(tabs)/_layout.tsx` — 기록 탭 등록 (탭 enumeration 방식 확인 후 추가)
- `src/components/ui/icons.tsx` — `CalendarIcon` 추가 (`IconProps`: `color: ColorValue`)

**작업**
1. `dayStatus`: 가드 순서 — `isRestDay` → `'rest'`; `versionOf == null` 또는 슬롯 없음(`hasAnySlot == false`) → `'none'`; `dayComplete` → `'complete'`; 슬롯 있고 체크 1개 이상이나 미완 → `'partial'`; 슬롯 있고 체크 0 → `'empty'`. 기존 도메인 재사용, 신규 계산 없음.
2. `historyRange`: `fromDate`부터 `toDate`까지 `addDays`로 순회하며 `dayStatus` 매핑, 오름차순 `DayStatusEntry[]` 반환.
3. `insights.tsx`: `SafeAreaView` + `ScrollView` 셸. 섹션 순서는 `00-overview.md` §3(B3→A1→C2→A3) 자리만 확보하고 이번 Stage는 A1만 렌더.
4. `_layout.tsx`에 기록 탭 등록, `CalendarIcon` 연결.

**측정 가능한 종료 조건**
- `dayStatus(baseState, '2026-06-22')` → `'partial'` (월: 유산소 완료, 무산소 `x3` 미체크)
- `dayStatus(baseState, '2026-06-21')` → `'rest'` (일: `restDays: ['sun']`)
- `dayStatus(baseState, '2026-05-31')` → `'none'` (`effectiveFrom: '2026-06-01'` 이전)
- `dayStatus(baseState, '2026-06-24')` → `'empty'` (수: 유산소 `a1` 슬롯 있음, 로그 없음 → 체크 0)
- `tsc --noEmit` exit code 0

### Day 2 — 캘린더·히트맵 컴포넌트

**목표**: 월간 캘린더와 연간 히트맵을 표시 전용 컴포넌트로 구현한다.

**산출물**
- `src/components/insights/HistorySection.tsx` (월/연 토글, 월 이동, `useMemo`로 `historyRange` 감쌈)
- `src/components/insights/MonthCalendar.tsx` (7열 `View` 그리드)
- `src/components/insights/DayCell.tsx` (`dayStatus` → 토큰 색 매핑, 오늘 외곽선, `radius.chip`)
- `src/components/insights/YearHeatmap.tsx` (`react-native-svg` `Rect` 그리드)

**작업**
1. `DayCell` 색 매핑은 spec §4 표만 따른다(`complete`→`color.primary`, `partial`→`color.primaryWeak`, `empty`→`color.chipIdleBg`, `rest`→`color.surface`+`color.border` 점, `none`→미표시). 하드코딩 금지.
2. `MonthCalendar`는 그 달 포함 주의 월~일을 7열로 배치, 입력은 `DayStatusEntry[]`.
3. `YearHeatmap`은 최근 약 1년 `historyRange`를 주 열 × 요일 행 `Rect`로 그린다.

**측정 가능한 종료 조건**
- `jest __tests__/components/DayCell.test.tsx` → 5분류 색 매핑 pass, 실패 0건
- `tsc --noEmit` exit code 0

### Day 3 — 테스트 + 통합 + 빈 상태

**목표**: §3 케이스를 Jest로 작성·통과하고 초기 사용자 빈 상태를 처리한다.

**산출물**
- `__tests__/domain/insights.test.ts` (`dayStatus`/`historyRange`)
- `__tests__/components/DayCell.test.tsx`
- `__tests__/integration/insights.test.tsx` (기록 탭 A1 섹션 렌더)

**작업**
1. §3.1~3.2 케이스 구현.
2. 기록 없는 초기 사용자에게 빈 그리드 대신 안내 문구.
3. 커버리지 미달 경로 보완.

**측정 가능한 종료 조건**
- `jest __tests__/domain/insights.test.ts __tests__/components/DayCell.test.tsx` → 전부 pass
- `jest --coverage --collectCoverageFrom='src/domain/insights.ts'` → statements ≥ 80%
- `tsc --noEmit` exit code 0

---

## 3. 상세 테스트 케이스 (fixture·입력→기대 출력)

기준 fixture: `__tests__/fixtures/baseState.ts`. 루틴 `rt_aXk92`/`v_001`, `restDays: ['sun']`, `effectiveFrom: '2026-06-01'`. 유일 로그 `2026-06-22`: 유산소 `a1: true`, 무산소 `x1: true, x2: true, x3: false`. 추가 케이스는 `withLogs`로 확장한다.

### 3.1 dayStatus 5분류 경계

| 입력 날짜 | fixture | 기대 `dayStatus` | 근거 |
|-----------|---------|------------------|------|
| `2026-06-22`(월) | `baseState` | `'partial'` | 유산소 완료, 무산소 `x3` 미체크 → 일부 |
| `2026-06-23`(화) | `withLogs(baseState, { '2026-06-23': { date:'2026-06-23', routineId:'rt_aXk92', versionId:'v_001', checks:{ aerobic:{a1:true}, anaerobic:{x1:true,x2:true,x3:true} } } })` | `'complete'` | 전 카테고리 완료 |
| `2026-06-24`(수) | `baseState` | `'empty'` | 유산소 `a1` 슬롯 있음, 로그 없음 → 체크 0 |
| `2026-06-21`(일) | `baseState` | `'rest'` | `restDays: ['sun']` |
| `2026-05-31` | `baseState` | `'none'` | `effectiveFrom` 이전, `versionOf == null` |

### 3.2 historyRange 한 주

- **입력**: `historyRange(baseState, '2026-06-22', '2026-06-28')`
- **기대 출력**: 7개 엔트리 오름차순
  - `[{date:'2026-06-22',status:'partial'}, {'06-23':'empty'}, {'06-24':'empty'}, {'06-25':'empty'}, {'06-26':'empty'}, {'06-27':'empty'}, {'06-28',status:'rest'}]`
  - 근거: `baseState`는 `06-22`만 로그(partial). `06-23`~`06-27`은 활동일·미기록 → `empty`. `06-28`(일) → `rest`.

---

## 4. 종료 조건 (실행 명령)

| # | 종료 조건 | 검증 절차 |
|---|-----------|-----------|
| EC1 | `dayStatus` 5분류 통과 | `jest __tests__/domain/insights.test.ts` → 3.1 전부 pass, 실패 0건 |
| EC2 | `historyRange` 한 주 일치 | 3.2 결과 배열이 기대값과 정확히 일치 |
| EC3 | `DayCell` 색 매핑 통과 | `jest __tests__/components/DayCell.test.tsx` pass |
| EC4 | insights 커버리지 80% 이상 | `jest --coverage --collectCoverageFrom='src/domain/insights.ts'` → statements ≥ 80% |
| EC5 | 타입 검사 무오류 | `tsc --noEmit` exit code 0 |
| EC6 | 기록 탭 등록 | 통합 테스트에서 4번째 탭 "기록"과 A1 섹션 렌더 확인 |

> 모호한 표현("정상 동작" 등)은 종료 조건에 쓰지 않는다. EC1~EC6은 실행 가능한 명령과 측정 가능한 결과를 가진다.
