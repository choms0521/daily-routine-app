# Stage 1 — M1 데이터 코어 개발계획서

> 문서 종류: 상세 개발계획서 (docs/development)
> 작성일: 2026-06-23
> 상위 출처: `docs/spec/2026-06-23/stage-1-data-core.md`, `docs/prd/2026-06-23/workout-tracker-prd.md` (v1.2)

---

## 1. 개요

| 항목 | 내용 |
|------|------|
| 목표 | 도메인 순수 함수·타입·저장 레이어를 구현하고, D8 불변식을 단위 테스트로 보증한다 |
| 의존 | 없음 (Stage 1이 모든 단계의 진입점) |
| 기간 | 3~4일 (풀타임 기준) |
| 테스트 도구 | Jest (단위 테스트), `tsc --noEmit` (타입 검사) |

---

## 2. Day별 work package

모듈은 의존 순서로 분해한다. 타입·날짜 유틸이 먼저이고, 타임라인·완료가 그 위에, 진행률·스트릭·저장이 마지막이다.

### Day 1 — 스키마 + 날짜 유틸

**목표**: 모든 모듈이 공유하는 타입·스키마와 날짜 기본 유틸을 완성한다.

**산출물**

- `types/schema.ts` — TypeScript 타입 전체 + Zod 스키마 전체 (AppState, Routine, RoutineVersion, DayPlan, ExerciseSlot, Activation, DayLog, Settings)
- `domain/date.ts` — `toDateKey`, `weekdayOf`, `weekStartOf`, `addDays`, `compareDateKey`, `weekDays`

**작업**

1. `types/schema.ts`에 `spec §4.1` 타입을 그대로 옮긴다. `hidden?: boolean` 선택 필드 포함.
2. `types/schema.ts`에 `spec §4.2` Zod 스키마를 작성한다. `DaysSchema`는 `z.object` 7개 키로 완전성을 강제한다.
3. `domain/date.ts`에 date-fns를 래핑해 6개 함수를 구현한다. 로컬 타임존 기준 날짜 키만 사용한다.

**측정 가능한 종료 조건**

- `tsc --noEmit` exit code 0
- `AppStateSchema.parse(PRD 4.4 정식 JSON)` 예외 없이 통과 (수동 또는 테스트로)
- `days`에서 요일 1개를 뺀 입력에 `AppStateSchema.parse`가 예외를 던짐 (7개 요일 완전성 강제 확인)
- `weekdayOf('2026-06-22')` → `'mon'`, `weekStartOf('2026-06-24')` → `'2026-06-22'` 통과

---

### Day 2 — 타임라인 + 완료 판정

**목표**: 계획 해소(날짜→버전→계획)와 완료 판정 로직을 구현한다.

**산출물**

- `domain/timeline.ts` — `versionOf`, `plan`
- `domain/completion.ts` — `categoryDone`, `isRestDay`, `hasAnySlot`, `dayComplete`

**작업**

1. `versionOf`: `activationTimeline`을 `effectiveFrom <= date`로 필터 후 가장 늦은 엔트리를 고른다. 같은 `effectiveFrom`엔 배열 뒤쪽 우선(PRD 4.8). 없으면 `null`.
2. `plan`: `versionOf` 결과의 `days[weekdayOf(date)]`를 반환. `versionOf == null`이면 `null`.
3. PRD 4.5 의사코드를 `completion.ts` 4개 함수로 구현. `?.` null-safe 접근 일관 적용.

**측정 가능한 종료 조건**

- `versionOf`에 `effectiveFrom: '2026-06-01'` 단일 엔트리 state를 주면 `'2026-06-01'`·`'2026-06-22'`에서 해당 버전 반환, `'2026-05-31'`에서 `null` 반환
- `isRestDay`에 `restDays: ['sun']` 버전의 state를 주면 `'2026-06-21(sun)'` → `true`, `'2026-06-22(mon)'` → `false`
- `dayComplete`에 완료 로그 없는 날짜를 주면 `false` (null-safe 확인)
- `tsc --noEmit` exit code 0

---

### Day 3 — 진행률 + 스트릭 + 마이그레이션 골격 + Repository

**목표**: 진행률·스트릭 계산과 저장 레이어를 완성한다.

**산출물**

- `domain/progress.ts` — `weekProgress`
- `domain/streak.ts` — `streak`
- `domain/migration.ts` — `migrate`, `backupBeforeMigrate`, `migrations` 골격
- `repository/StorageRepository.ts` — 인터페이스
- `repository/AsyncStorageRepository.ts` — 구현 (load·save, hydrate 시 마이그레이션 적용)

**작업**

1. `weekProgress`: PRD 4.6 의사코드 그대로 구현. 분모는 "휴식 아닌 날 × 슬롯 있는 카테고리 수". `pct`는 `Math.round`.
2. `streak`: PRD 4.7 의사코드 그대로 구현. 루프 진입부 세 가드(`versionOf == null` / 휴식일 / 빈 비휴식일), `back == 0` 미완료 보호.
3. `migration.ts` 골격: `CURRENT_SCHEMA_VERSION = 1`, `migrations = {}`, `migrate` 함수(순차 적용 + `schemaVersion > 현재`이면 거부), `backupBeforeMigrate`.
4. `StorageRepository` 인터페이스: `load(): Promise<AppState | null>`, `save(state): Promise<void>`.
5. `AsyncStorageRepository`: `load`는 `getItem` → `JSON.parse` → `migrate` → `AppStateSchema.parse`. `save`는 `JSON.stringify` → `setItem`.

**측정 가능한 종료 조건**

- `weekProgress`로 PRD 4.4 루틴 + 이번 주 완료 로그 5개 fixture → `{done:5, total:8, pct:63}`
- `streak`로 3일 연속 완료 + 휴식일 낀 fixture → 휴식일이 끊지 않고 통과하는 것 확인
- `migrate`에 `schemaVersion: 99` 입력 → 예외 발생 확인
- `tsc --noEmit` exit code 0

---

### Day 4 — M1 필수 단위 테스트 + 커버리지

**목표**: §3 테스트 케이스 전부를 Jest로 작성·통과하고 커버리지 목표를 달성한다.

**산출물**

- `__tests__/domain/timeline.test.ts`
- `__tests__/domain/completion.test.ts`
- `__tests__/domain/progress.test.ts`
- `__tests__/domain/streak.test.ts`
- `__tests__/domain/schema.test.ts` (Zod 스키마 검증)

**작업**

1. §3의 6.1~6.6 케이스를 각 테스트 파일에 구현.
2. 기준 fixture(PRD 4.4 루틴, `rt_aXk92`, `v_001`, `restDays:['sun']`, `effectiveFrom:'2026-06-01'`)를 공유 헬퍼로 추출해 재사용.
3. 커버리지 측정 후 미달 경로를 추가 테스트로 보완.

**측정 가능한 종료 조건**

- `jest __tests__/domain` → 6.1~6.6 케이스 전부 pass, 실패 0건
- `jest --coverage --collectCoverageFrom='domain/**/*.ts'` → `domain/` statements ≥ 80%
- `tsc --noEmit` exit code 0

---

## 3. 상세 테스트 케이스 (fixture·입력→기대 출력)

모든 케이스는 도메인 순수 함수를 직접 호출하며 store·UI를 거치지 않는다. 시간 입력은 인자로 주입하므로 고정된 `today`로 결정적이다.

**기준 fixture**: PRD 4.4 루틴(`id: 'rt_aXk92'`, `restDays: ['sun']`, 유산소 월~토 6일 + 무산소 월·화 2일, `versionId: 'v_001'`, `effectiveFrom: '2026-06-01'`). 편집·전환 테스트는 여기에 `v_002` 또는 루틴 B를 `effectiveFrom: 내일`로 append한 state를 쓴다.

### 6.1 (a) 활성 전환 후 과거 불변 (PRD 4.3-a, AC-5.4.2)

- **입력**: 기준 fixture. 과거 주(`2026-06-15~06-21`)에 완료 로그 일부 존재. 오늘 = `'2026-06-22'`. 루틴 B를 `effectiveFrom: '2026-06-23'`로 전환 append.
- **절차**: 전환 전 `weekProgress(state, '2026-06-15')`와 `streak(state, '2026-06-22')` 기록. 전환 후 동일 호출.
- **기대 출력**: 전환 전후 두 값이 완전히 동일. (전환은 `effectiveFrom: 내일`이므로 과거 날짜는 이전 엔트리 참조.)

### 6.2 (b) 주중 편집 후 과거 + 편집 당일(오늘) 불변 (PRD 4.3-b, AC-5.3.2/5.3.3)

- **입력**: 기준 fixture. 오늘 = `'2026-06-24'(수)`. 수요일 편집으로 `v_002`를 `effectiveFrom: '2026-06-25'(목)`로 append.
- **절차**: 편집 전 `plan(state, '2026-06-22')`·`plan(state, '2026-06-23')`·`plan(state, '2026-06-24')` 기록. 목·금도 기록. 편집 후 동일 호출.
- **기대 출력**:
  - `'06-22'`·`'06-23'`·`'06-24'(오늘)` `plan`은 편집 전후 `v_001` 기준으로 동일 (forward-only).
  - `'06-25'` 이후 `plan`만 `v_002` 기준으로 바뀜.
  - 편집 직후 `weekProgress(이번 주)`·`streak('2026-06-24')` 값이 편집 전과 동일.

### 6.3 (c) 휴식일 변경 후 과거 판정 불변 (PRD 4.3-c, AC-5.3.4)

- **입력**: `v_001`의 `restDays: ['sun']`. `v_002`에서 `restDays: ['sun','wed']`로 변경, `effectiveFrom: 내일` append.
- **절차**: 변경 전 `isRestDay(state, '2026-06-17')` (과거 수요일) 기록. 변경 후 동일 호출.
- **기대 출력**: 과거 수요일의 `isRestDay`가 변경 전후 동일하게 `false`. (그날 활성 버전은 `v_001` → `restDays`에 `'wed'` 없음.)

### 6.4 (d) 오늘 편집·전환 후 오늘 값 불변 (PRD D8.8, AC-5.3.3/5.4.2)

- **입력**: 기준 fixture. 오늘 = `'2026-06-22'(월)`. 오늘 완료 로그: `aerobic: { a1: true }`, `anaerobic: { x1: true, x2: false, x3: false }`.
- **절차**: `plan(state, '2026-06-22')`·`weekProgress(state, '2026-06-22')`·`streak(state, '2026-06-22')` 기록. 그 뒤 `v_002` append (편집) 또는 루틴 B append (전환), 둘 다 `effectiveFrom: '2026-06-23'`. 변경 후 동일 호출.
- **기대 출력**: 세 값이 변경 전후 모두 동일. 캐시된 `DayLog.versionId`는 무결성 검증 헬퍼 `assertLogConsistency(state, '2026-06-22')`(spec §3.2)로 `versionOf(state, '2026-06-22')?.versionId`와 일치함을 단언한다(PRD 4.4 무결성 검증; 해소 경로 아님).

### 6.4b streak 오늘 경계 — 오늘의 +1/+0 직접 단언 (PRD 4.7, AC-5.7.1)

"변경 전후 동일"만 보는 6.4는 streak가 오늘을 항상 0으로 빠뜨려도 통과하는 구멍이 있다. 오늘 기여를 절대값으로 직접 단언한다.

- **입력**: 기준 fixture. 오늘 = `'2026-06-22'(월, 비휴식·슬롯 있음)`. 어제 `'2026-06-21'(일)`은 `restDays`로 휴식일(통과). 그제 `'2026-06-20'(토)`은 완료(dayComplete==true)로 기록.
- **절차 e1 (오늘 완료)**: 오늘 로그를 dayComplete==true로 채운다(유산소·무산소 모든 슬롯 체크). `streak(state, '2026-06-22')` 계산.
- **기대 출력 e1**: 오늘이 +1로 계상된다. 토요일까지 연속 완료가 N일이면 `streak === N + 1`(일요일은 통과로 카운트 안 됨). 구체 fixture로 예: 토 완료 1일 + 오늘 완료 → `streak === 2`.
- **절차 e2 (오늘 미완료/미기록)**: 오늘 로그를 dayComplete==false(예: 무산소 1개 미체크) 또는 `DayLog` 없음(미기록)으로 둔다. `streak(state, '2026-06-22')` 계산.
- **기대 출력 e2**: 오늘은 streak를 깨지 않고 +0이다(`back == 0 && !complete`는 `continue`). 과거 연속만 카운트되어 `streak === N`(위 예에서 토 완료 1일 → `streak === 1`). 오늘 미완료가 과거 연속을 0으로 만들지 않는다.

### 6.5 null 가드 3종 — 분모 제외 집합 == 스트릭 통과 집합 (PRD 4.5 빈 날 규칙, 4.8)

세 독립 통과가 아니라, **같은 집합을 두 함수가 동일하게 다룸**을 증명하는 케이스다.

- **입력**: 한 주(월~일)에 세 종류의 중립 날을 모두 포함한 fixture:
  - 활성 루틴 없는 날: 타임라인의 첫 `effectiveFrom`보다 이른 날짜 (`versionOf == null`).
  - 휴식일: `restDays`에 포함된 요일.
  - 빈 비휴식일: 휴식일은 아니나 `aerobic.length + anaerobic.length == 0`인 요일.
  - 완료된 날과 미완료(미기록)된 날도 포함.
- **절차**:
  - 진행률 측: `weekProgress` 내부적으로 `total`에 기여한 날짜 집합 `D_progress`를 도출. 그 여집합 = 분모 제외 집합.
  - 스트릭 측: 루프의 세 가드로 `continue`된 날짜 집합 `D_pass`를 도출.
- **기대 출력**: "분모 제외 집합" == "스트릭 통과 집합" (집합 동등). 세 종류 날이 두 함수에서 동일하게 중립 처리됨.

### 6.6 진행률 회귀 — PRD 4.6 "5/8 = 63%" (AC-5.6.1/5.6.2)

- **입력**: PRD 4.4 루틴(`restDays: ['sun']`)을 이번 주 전체에 적용한 fixture. 카테고리 단위 항목(분모):

  | 요일 | 유산소 | 무산소 | 항목 수 |
  |------|--------|--------|---------|
  | 월 | 1 | 1 | 2 |
  | 화 | 1 | 1 | 2 |
  | 수 | 1 | 0 | 1 |
  | 목 | 1 | 0 | 1 |
  | 금 | 1 | 0 | 1 |
  | 토 | 1 | 0 | 1 |
  | 일 | 휴식 제외 | | 0 |
  | **합계** | | | **8** |

  완료 로그를 8개 항목 중 정확히 5개가 `categoryDone == true`가 되도록 구성.
- **기대 출력**: `weekProgress(state, weekStartMonday)` → `{ done: 5, total: 8, pct: 63 }`. (`Math.round(5/8*100) = 63`.)

---

## 4. 종료 조건 (실행 명령)

| # | 종료 조건 | 검증 절차 |
|---|-----------|-----------|
| EC1 | (a)~(d) 불변식 테스트 전부 통과 | `jest __tests__/domain` 실행 → 6.1~6.4 케이스 전부 pass, 실패 0건 |
| EC2 | null 가드 집합 동등 테스트 통과 | 6.5 케이스에서 "분모 제외 집합 == 스트릭 통과 집합" assert pass |
| EC3 | 5/8 = 63% 회귀 테스트 통과 | 6.6 케이스 `weekProgress` 결과가 `{ done:5, total:8, pct:63 }`와 일치 |
| EC4 | 도메인 커버리지 80% 이상 | `jest --coverage --collectCoverageFrom='domain/**/*.ts'` → `domain/` statements ≥ 80% |
| EC5 | Zod 스키마가 PRD 4.4 정식 JSON을 통과시키고, 요일 키 누락 버전을 거부 | `AppStateSchema.parse(PRD 4.4 JSON)` 예외 없이 통과 + `days`에서 요일 1개를 뺀 입력은 `parse`가 예외 (`Object.keys(version.days).length === 7` 강제 확인) |
| EC6 | 타입 검사 무오류 | `tsc --noEmit` exit code 0 |

> 모호한 표현("정상 동작", "잘 작동함")은 종료 조건에 쓰지 않는다. 위 EC1~EC6은 모두 실행 가능한 명령과 측정 가능한 결과를 가진다.
