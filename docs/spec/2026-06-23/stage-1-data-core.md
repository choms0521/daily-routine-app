# Stage 1 — M1 데이터 코어

> 문서 종류: 단계별 스펙 (docs/spec)
> 작성일: 2026-06-22
> 상위 출처: `docs/prd/2026-06-23/workout-tracker-prd.md` (v1.2, APPROVE 완료), `docs/spec/2026-06-23/00-architecture.md`
> 하위 파생: day-by-day 실행 계획 및 테스트 케이스·종료 조건은 `docs/development/2026-06-23/stage-1-data-core.md` 참조.

---

## 1. 개요

이 단계는 앱의 모든 후속 단계가 의존하는 토대다. UI 없이 데이터 모델, 도메인 계산(진행률·스트릭), 저장 레이어, 마이그레이션 골격까지를 순수 타입·함수로 구현한다. 핵심 목표는 PRD D8 불변식(정의/기록 분리, 버전 관리, 오늘 보호)을 단위 테스트로 보증하는 것이다.

| 항목 | 내용 |
|------|------|
| 목표 | PRD 4장 데이터 모델 전체 + 진행률/스트릭 계산 + 저장 레이어 + 마이그레이션 골격을 순수 도메인·저장·타입으로 구현 |
| PRD 마일스톤 | M1 데이터 코어 (PRD 9.3) |
| 범위 (in) | `types/schema.ts`, `domain/date.ts`, `domain/timeline.ts`, `domain/completion.ts`, `domain/progress.ts`, `domain/streak.ts`, `domain/migration.ts`(골격), `repository/StorageRepository.ts`, `repository/AsyncStorageRepository.ts`, M1 필수 단위 테스트 |
| 범위 (out) | UI/화면/컴포넌트, Zustand store, 공유 직렬화(`domain/share.ts`, M4), 실제 마이그레이션 변환 단계(현 `schemaVersion = 1`), 디자인 토큰 |
| 의존 | 없음 (Stage 1이 모든 단계의 진입점) |
| 개략 일수 | 3~4일 (풀타임 기준) |

이 단계가 만드는 산출물은 모두 입력 → 출력의 순수 함수이거나 무상태 인터페이스다. "오늘" 같은 시간 입력도 함수 인자로 받아 외부 시간·상태에 의존하지 않는다(아키텍처 §2). 이로써 PRD가 요구하는 (a)전환·(b)편집·(c)휴식일 변경·(d)오늘 보호 불변식을 단위 테스트로 직접 검증할 수 있다.

---

## 2. 구현할 기능·모듈 목록

| 모듈 | 산출물 | PRD 절 매핑 | 아키텍처 매핑 |
|------|--------|------------|--------------|
| `types/schema.ts` | AppState·Routine·RoutineVersion·DayPlan·ExerciseSlot·Activation·DayLog·Weekday TypeScript 타입 + Zod 스키마 | 4.2, 4.4 | §3 types, §5 |
| `domain/date.ts` | 주(월요일 시작) 계산, 로컬 타임존 날짜 키 산출. date-fns 래핑 | D9 | §3 domain/date |
| `domain/timeline.ts` | `versionOf(state, date)`, `plan(state, date)` | 4.3, 4.5 | §5 |
| `domain/completion.ts` | `categoryDone`, `isRestDay`, `hasAnySlot`, `dayComplete` | 4.5 | §5 |
| `domain/progress.ts` | `weekProgress(state, weekStartMonday)` | 4.6 | §5 |
| `domain/streak.ts` | `streak(state, today)` | 4.7 | §5 |
| `domain/migration.ts` | `schemaVersion` 마이그레이션 골격(순차 적용 + 마이그레이션 전 백업) | 8.4 | §4 |
| `repository/StorageRepository.ts` | `StorageRepository` 인터페이스 (`load` / `save`) | 8.1 | §4 |
| `repository/AsyncStorageRepository.ts` | AsyncStorage 기반 구현 (단일 JSON 키) | 8.1 | §4 |
| `__tests__/domain/*` | M1 필수 단위 테스트 ((a)~(d) + null 가드 + 5/8 회귀) | 9.3, 10.2 | §10 |

---

## 3. 모듈별 설계

도메인 함수 시그니처는 아키텍처 §5의 형태를 따른다. **모든 함수가 `state`와 시간(`date`/`today`/`weekStartMonday`)을 명시 인자로 받는 순수 함수**다. PRD 의사코드와의 대응 관계를 각 절에 명시한다.

### 3.1 `domain/date.ts` (PRD D9)

주는 월요일 시작으로 고정하고, 날짜·"오늘" 판정은 기기 로컬 타임존 기준이다(PRD D9). date-fns를 래핑해 다른 모듈이 직접 date-fns에 의존하지 않게 한다.

```typescript
type DateKey = string; // 'YYYY-MM-DD' 형식 로컬 날짜 키. 모든 모듈의 날짜 인자·키 표준.

function toDateKey(d: Date): DateKey;                         // 로컬 타임존 기준 날짜 키
function weekdayOf(date: DateKey): Weekday;                   // 요일 ('mon'..'sun'), Monday-start
function weekStartOf(date: DateKey): DateKey;                 // 해당 주의 월요일 날짜 키
function addDays(date: DateKey, days: number): DateKey;       // 일수 가감 (음수 가능)
function compareDateKey(a: DateKey, b: DateKey): number;      // 날짜 키 비교 (ISO 문자열 비교)
function weekDays(weekStartMonday: DateKey): DateKey[];        // 주의 7개 날짜 키 [월..일]
```

> `effectiveFrom <= date` 판정은 ISO `'YYYY-MM-DD'` 키의 문자열 비교(`compareDateKey`)로 충분하다(사전식 정렬 = 시간순).

### 3.2 `domain/timeline.ts` (PRD 4.3, 4.5)

두 리졸버는 "날짜 → 타임라인 → 버전 → 계획" 경로(PRD 4.1)의 단일 진입점이다. **계획 해소의 단일 출처는 활성 타임라인이며, `DayLog.versionId`는 비정규화 캐시일 뿐 해소 경로로 쓰지 않는다(PRD 4.4).**

```typescript
// PRD 4.5: versionOf(date) = timeline에서 effectiveFrom <= date 중 최근 엔트리의 RoutineVersion
function versionOf(state: AppState, date: DateKey): RoutineVersion | null;

// PRD 4.5: plan(date) = versionOf(date)?.days[weekdayOf(date)]
function plan(state: AppState, date: DateKey): DayPlan | null;

// 무결성 검증 헬퍼(PRD 4.4): DayLog의 비정규화 캐시 versionId가 타임라인 재유도 결과와 일치하는지 단언한다.
// 해소 경로가 아니라 검증·테스트 용도다(계산은 항상 versionOf/plan을 쓴다).
// DayLog가 없는 날은 검증 대상이 아니므로 true. 불일치는 데이터 손상 신호다.
function assertLogConsistency(state: AppState, date: DateKey): boolean;
//   = state.completionLogs[date] == null
//     || state.completionLogs[date].versionId === versionOf(state, date)?.versionId;
```

핵심 분기: `versionOf`는 `effectiveFrom <= date` 필터 후 가장 늦은 엔트리를 선택한다. 같은 `effectiveFrom`에 다수 엔트리가 있으면 배열 뒤쪽(마지막 append)이 유효하다(PRD 4.8). 모든 요일이 버전의 `days`에 존재하므로(§4.2 `DaysSchema`가 7개 요일 키 완전성을 강제) `versionOf == null`과 `plan == null`은 동치다. 이 동치는 도메인이 의존하는 불변식이며, null 가드 집합 동등 테스트(`docs/development/2026-06-23/stage-1-data-core.md` §3)가 이 위에 선다.

### 3.3 `domain/completion.ts` (PRD 4.5)

PRD 4.5 의사코드를 따른다. `log(date)`는 `state.completionLogs[date]`이며 `?.`로 null-safe 접근한다(완료 로그 없는 날 = 모든 슬롯 미체크). 빈 카테고리(슬롯 0개)는 완료/미완료 판정에서 제외한다.

```typescript
type Category = 'aerobic' | 'anaerobic';

function categoryDone(state: AppState, date: DateKey, category: Category): boolean;
// PRD 4.5: plan[category].length > 0 && 모든 slot에 대해 checks[category][slotId] === true

function isRestDay(state: AppState, date: DateKey): boolean;
// PRD 4.5: versionOf(date)?.restDays.includes(weekdayOf(date)). versionOf == null이면 false.

function hasAnySlot(state: AppState, date: DateKey): boolean;
// PRD 4.5: aerobic.length + anaerobic.length > 0

function dayComplete(state: AppState, date: DateKey): boolean;
// PRD 4.5: plan != null && !isRestDay && hasAnySlot && 슬롯 있는 모든 카테고리 categoryDone
```

### 3.4 `domain/progress.ts` (PRD 4.6)

PRD 4.6 의사코드를 따른다. 분모는 "휴식 아닌 날 × 슬롯 있는 카테고리 수"의 합이며 "요일 수"가 아니다. `plan(date) == null`인 날과 빈 비휴식일은 분모에서 제외되어 스트릭의 통과 규칙(4.7)과 같은 집합을 다룬다. 상세 테스트 케이스(5/8=63% 회귀)는 `docs/development/2026-06-23/stage-1-data-core.md` §3 참조.

```typescript
interface WeekProgress {
  done: number;   // categoryDone == true 인 항목 수 (분자)
  total: number;  // 휴식 아닌 날의 슬롯 있는 카테고리 개수 (분모)
  pct: number;    // total > 0 ? Math.round(done / total * 100) : 0
}

// 한 주(월~일)의 진행률. 날짜마다 plan(date)를 조회하므로 한 주가 두 버전에 걸쳐도 정확.
function weekProgress(state: AppState, weekStartMonday: DateKey): WeekProgress;
```

### 3.5 `domain/streak.ts` (PRD 4.7)

PRD 4.7 의사코드를 따른다. 루프 진입부 세 가드(`versionOf == null` / 휴식일 / 빈 비휴식일)가 PRD 4.8 엣지 케이스를 운영화하며, 이 세 가드는 `weekProgress`의 분모 제외 집합과 정확히 같은 날을 다룬다. 집합 동등 검증은 `docs/development/2026-06-23/stage-1-data-core.md` §3 참조.

```typescript
// 오늘부터 과거로 최대 60일 소급한 연속 달성 일수.
// back == 0 미완료는 깨지 않는다(오늘 보호, PRD D8.8). 그 외 미완료(미기록 포함)는 break.
function streak(state: AppState, today: DateKey): number;
```

### 3.6 `domain/migration.ts` (PRD 8.4, 골격 — 마이그레이션 소유 단일 정의)

**마이그레이션 소유 정의(단일 출처)**. `domain/migration.ts`는 두 계열의 변환을 소유한다. 단계별 책임은 다음과 같으며, Stage 4·5는 이 정의를 참조한다(중복 정의 금지).

| 계열 | 책임 | 골격 | 완성 |
|------|------|------|------|
| `migrate(raw → AppState)` | 저장된 전체 `AppState`의 `schemaVersion` 진화 | Stage 1 | **AppState 변환 완성 = Stage 5** (spec stage-5 §4) |
| `migrateSharePayload(payload, targetVersion)` | 공유 페이로드의 `schemaVersion` 변환 | Stage 1(빈 통과) | **공유 페이로드 변환 = 향후 v2** (spec stage-4 §6.1) |

현 `schemaVersion = 1`이므로 실제 변환 로직은 없다. 향후 버전이 추가될 때 끼워 넣을 순차 적용 메커니즘과 마이그레이션 전 백업 지점만 정의한다.

```typescript
const CURRENT_SCHEMA_VERSION = 1;

type MigrationStep = (raw: unknown) => unknown;

// migrations[n] = schemaVersion n → n+1 변환. 키가 곧 "from 버전"이다.
// v0→v1(schemaVersion만 1로 올리는 최소 변환)을 등록해 빈 객체로 인한
// 런타임 구멍(while 루프에서 migrations[s.schemaVersion] === undefined)을 막는다.
// 이 골격 항목은 stage-5 fixture 테스트(T1: state-v0.json)가 의존한다.
const migrations: Record<number, MigrationStep> = {
  0: (s) => ({ ...(s as object), schemaVersion: 1 }), // v0 → v1 최소 변환
};

// raw를 현재 스키마로 순차 마이그레이션 후 Zod 검증해 AppState 반환.
// schemaVersion > CURRENT_SCHEMA_VERSION이면 거부(IncompatibleVersionError).
function migrate(raw: unknown): AppState;

// 공유 페이로드 schemaVersion 변환(PRD 7.2). v1은 빈 통과(payload 그대로 반환), 향후 v2에서 채움.
function migrateSharePayload(payload: unknown, targetVersion: number): unknown;

// 마이그레이션 전 원본 보존(실패 복구). Repository가 load() 안에서 호출.
function backupBeforeMigrate(raw: unknown): Promise<void>;
```

> 버전 불변성 덕분에 완료 로그의 `versionId` 참조는 마이그레이션 후에도 유효해야 한다(PRD 8.4).

---

## 4. 데이터 스키마 (PRD 4.2, 4.4)

PRD 4.4 JSON을 TypeScript 타입과 Zod 스키마로 옮긴다. 필드는 PRD와 1:1로 일치하며 drift를 금지한다(PRD 4.1, 아키텍처 부록 1).

### 4.1 TypeScript 타입

```typescript
type Weekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
type Category = 'aerobic' | 'anaerobic';
type DateKey = string;        // 'YYYY-MM-DD' 로컬 날짜 키
type ISOTimestamp = string;   // 'createdAt' 등

interface ExerciseSlot {
  slotId: string;   // (버전, 요일, 카테고리) 범위에서 안정적인 위치 식별자 (PRD 4.4)
  name: string;
  sets: string;     // 세트 정보 = 자유 문자열 (PRD D4) 예: "4 × 12", "30분"
}
interface DayPlan { aerobic: ExerciseSlot[]; anaerobic: ExerciseSlot[]; }
interface RoutineVersion {     // 불변 (append-only, PRD 4.1)
  versionId: string;
  createdAt: ISOTimestamp;
  restDays: Weekday[];         // 휴식일 = 데이터 속성 (PRD D8.6)
  days: Record<Weekday, DayPlan>;
}
interface Routine {
  id: string;
  name: string;
  createdAt: ISOTimestamp;
  versions: RoutineVersion[];  // append-only 버전 히스토리
  hidden?: boolean;            // 표시 전용 플래그. Stage 3 라이브러리의 숨김 기능(AC-5.4.3)이 사용.
                               // 스키마에 등록해 hydrate 시 strip으로 소실되지 않게 한다.
                               // PRD 4.2 핵심 엔티티에는 없는 v1 표시 보조 필드이므로 선택 필드로 둔다.
                               // 버전 불변성·타임라인·계산(versionOf/plan/weekProgress/streak)과 무관.
}
interface Activation {         // append-only 활성 이벤트 (PRD 4.3)
  effectiveFrom: DateKey;      // 이 날짜부터 적용
  routineId: string;
  versionId: string;
}
interface DayLog {
  date: DateKey;
  routineId: string;           // 그날 활성이던 루틴 (캐시/검증용, PRD 4.4)
  versionId: string;           // 그날 활성이던 버전 (비정규화 캐시 — 해소 경로 아님, PRD 4.4)
  checks: {
    aerobic: Record<string, boolean>;    // slotId → 체크 여부
    anaerobic: Record<string, boolean>;
  };
}
interface Settings {
  activeRoutineId: string | null;        // 선택된 활성 루틴 (전환 당일엔 오늘 계획과 다를 수 있음, PRD 5.4)
}
interface AppState {
  schemaVersion: number;                 // 마이그레이션·공유 호환 판정 (PRD 7, 8.4)
  routines: Routine[];                   // 라이브러리
  activationTimeline: Activation[];      // append-only, 정렬된 활성 이벤트
  completionLogs: Record<DateKey, DayLog>;
  settings: Settings;
}
```

### 4.2 Zod 스키마

저장 데이터 무결성·마이그레이션 입력 검증을 위해 위 타입과 1:1 대응하는 Zod 스키마를 둔다(아키텍처 §1 스키마 검증).

```typescript
const WeekdaySchema = z.enum(['mon','tue','wed','thu','fri','sat','sun']);
const ExerciseSlotSchema = z.object({ slotId: z.string(), name: z.string(), sets: z.string() });
const DayPlanSchema = z.object({
  aerobic: z.array(ExerciseSlotSchema),
  anaerobic: z.array(ExerciseSlotSchema),
});
// days는 7개 요일 키 전부를 가져야 한다. z.record(enum, ...)는 키 완전성을
// 신뢰성 있게 강제하지 못하므로(Zod 버전 의존 함정), 7개 요일을 명시한 z.object로 강제한다.
const DaysSchema = z.object({
  mon: DayPlanSchema, tue: DayPlanSchema, wed: DayPlanSchema, thu: DayPlanSchema,
  fri: DayPlanSchema, sat: DayPlanSchema, sun: DayPlanSchema,
});
const RoutineVersionSchema = z.object({
  versionId: z.string(),
  createdAt: z.string(),
  restDays: z.array(WeekdaySchema),
  days: DaysSchema,                               // 7개 요일 키 전부 존재 강제
});
const RoutineSchema = z.object({
  id: z.string(), name: z.string(), createdAt: z.string(),
  versions: z.array(RoutineVersionSchema).min(1),
  hidden: z.boolean().optional(),                 // 표시 전용. 없으면 표시(기본), Stage 3 숨김(AC-5.4.3)용.
});
const ActivationSchema = z.object({
  effectiveFrom: z.string(),
  routineId: z.string(), versionId: z.string(),
});
const DayLogSchema = z.object({
  date: z.string(), routineId: z.string(), versionId: z.string(),
  checks: z.object({
    aerobic: z.record(z.string(), z.boolean()),
    anaerobic: z.record(z.string(), z.boolean()),
  }),
});
const AppStateSchema = z.object({
  schemaVersion: z.number(),
  routines: z.array(RoutineSchema),
  activationTimeline: z.array(ActivationSchema),
  completionLogs: z.record(z.string(), DayLogSchema),
  settings: z.object({ activeRoutineId: z.string().nullable() }),
});
```

> PRD 4.4의 정식 JSON 예시(`rt_aXk92` / `v_001` / `restDays: ["sun"]` 등)는 위 스키마를 그대로 만족한다. 스키마 변경 시 PRD 4.4를 단일 출처로 삼아 동기화한다.

---

## 5. 저장 레이어 (PRD 8.1, 아키텍처 §4)

### 5.1 인터페이스

```typescript
// repository/StorageRepository.ts
interface StorageRepository {
  load(): Promise<AppState | null>;     // 전체 상태 로드 (앱 시작 시). 없으면 null.
  save(state: AppState): Promise<void>; // 전체 상태 저장.
}
```

저장 접근을 추상화 뒤에 둔다(PRD 8.1). store·도메인은 이 인터페이스에만 의존하므로 향후 MMKV 교체 시 변경되지 않는다.

### 5.2 AsyncStorage 구현 방침

- `AsyncStorageRepository`는 `AppState`를 단일 JSON 키(예: `'workout-tracker:appstate'`)로 직렬화해 저장한다(아키텍처 §4). v1 데이터 규모에서 전체 저장이 단순하고 충분하다.
- `save`는 `JSON.stringify(state)` → `AsyncStorage.setItem`. 불변 갱신(코딩 규약)으로 만들어진 새 `state`를 그대로 직렬화한다.
- `load`는 `AsyncStorage.getItem` → 없으면 `null`, 있으면 마이그레이션·검증(§5.3)을 거쳐 `AppState` 반환.

### 5.3 마이그레이션 적용 시점 (PRD 8.4)

마이그레이션은 **앱 시작 hydrate 시점**, 즉 `load()` 안에서 일어난다. 순서: `getItem` → `JSON.parse`(raw) → `schemaVersion`이 낮으면 `backupBeforeMigrate(raw)` 후 `migrate(raw)` 순차 적용 → `AppStateSchema.parse` 최종 검증 → `AppState` 반환. `schemaVersion > CURRENT_SCHEMA_VERSION`이면 거부한다(PRD 7.2 동일 정책). M1에서는 변환 단계가 없고 흐름 골격만 갖춘다.

---

## 6. 테스트 방향

(a)전환·(b)주중 편집·(c)휴식일 변경·(d)오늘 보호 불변식, null 가드 집합 동등(분모 제외 집합 == 스트릭 통과 집합), 5/8=63% 회귀를 단위 테스트로 검증한다. 구체 fixture·입력→기대 출력·실행 명령·커버리지 목표는 `docs/development/2026-06-23/stage-1-data-core.md` 참조.

---

## 7. 주의·미해결 연계 (PRD 10.1)

이 단계와 관련된 미해결 질문은 **Q4(DST 전환·자정 경계의 "오늘" 판정 세부)**다.

- **이 단계의 처리 방침**: PRD D9·Q4의 잠정 제안을 그대로 채택한다. **로컬 자정 기준 날짜 키를 사용하고, DST 전환일이 23시간이든 25시간이든 날짜 키 1개로 처리**한다(`toDateKey`는 로컬 시계의 연·월·일만 추출). 주 기준(월요일)·로컬 타임존은 D9로 확정이므로 재논의하지 않는다.
- **세부 경계 검증**은 Stage 2 이후 실제 기기 시간 동작 확인 단계로 미룬다.
- **다른 미해결(Q1·Q3·Q6)은 이 단계 범위 밖**이다. Q1(전환 당일 홈 시각화)·Q6(빈 주 빈 상태 UI)는 Stage 2 이후, Q3(임포트 동명 루틴)는 Stage 4에서 다룬다. M1은 계산·저장만 다루며 이들의 계산 측 토대는 이미 이 단계에서 완결된다.
