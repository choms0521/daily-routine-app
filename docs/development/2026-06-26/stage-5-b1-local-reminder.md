# Stage 5 — B1 로컬 리마인더 알림 개발계획서

> 문서 종류: 상세 개발계획서 (docs/development)
> 작성일: 2026-06-26
> 상위 출처: `docs/spec/2026-06-26/b1-local-reminder.md`, `docs/spec/2026-06-26/00-overview.md`

> **범위 게이트(먼저 읽을 것)**: PRD 9.2는 "푸시 알림"을 v2로 분류한다. 본 계획은 **로컬 알림 한정**(원격 푸시·EAS 토큰·`projectId` 미사용)이며, Expo SDK 56 문서상 로컬 예약 알림은 Expo Go에서 동작한다(원격 푸시만 dev build 필요). **v1.x 편입은 PRD 범위 재검토 결정이 선행**되어야 한다. 또한 Top 5 중 **유일하게 스키마 마이그레이션을 동반**한다(아래 Day 1).

> **의존·순서**: A1~A3와 독립이다(기록 탭 아님, 설정 탭에 위치). 기존 `domain/migration.ts`·`AsyncStorageRepository`·`store/appStore.ts`를 확장한다. 순서상 마지막에 둔다(`00-overview.md` §1).

---

## 1. 개요

| 항목 | 내용 |
|------|------|
| 목표 | 매일 정해진 시각에 로컬 알림을 보내 체크 복귀를 유도한다 |
| 의존 | 범위 결정 승인(게이트), `expo-notifications`(신규 패키지) |
| 기간 | 2~3일 (마이그레이션·실기기 검증 포함) |
| 테스트 도구 | Jest(마이그레이션·순수 함수), `tsc --noEmit`, 실기기(I/O) |

---

## 2. Day별 work package

### Day 1 — 스키마 마이그레이션 (schemaVersion 1 → 2)

**목표**: `Settings.reminder`를 추가하고 두 진입점(마이그레이션·신규 설치)을 모두 시드한다.

**산출물**
- `src/types/schema.ts` — `ReminderSchema`, `SettingsSchema.reminder`
- `src/domain/migration.ts` — `CURRENT_SCHEMA_VERSION = 2`, `migrations[2]`
- `src/store/appStore.ts` — `emptyAppState()`에 `reminder` 기본값 시드
- `src/domain/reminder.ts` (신규) — `needsReminderToday(state, today): boolean`

**작업**
1. `ReminderSchema = { enabled: boolean, time: 'HH:MM' 정규식 }`. `SettingsSchema`에 `reminder` 추가.
2. `migrations[2]`: 기존 `settings`에 `reminder` 기본값 `{ enabled:false, time:'20:00' }` 주입, 기존 값 보존.
3. **신규 설치 경로 시드(중요)**: `emptyAppState()`도 동일 기본값으로 시드한다. 신규 설치는 `schemaVersion`이 이미 2라 마이그레이션을 거치지 않으므로, 누락 시 `state.settings.reminder`가 `undefined`가 되어 셀렉터/UI가 깨진다(spec §1). 두 진입점을 모두 시드한다.
4. `needsReminderToday`: 오늘이 활동일(`versionOf != null` + 비휴식 + 슬롯 있음)이고 `dayComplete == false`이면 `true`.
5. **기존 v1 가정 테스트 갱신**: `CURRENT_SCHEMA_VERSION` 상승으로, `schemaVersion: 1` 원본을 `load`·`migrate`하는 기존 `AsyncStorageRepository`/`migration` 테스트가 v2 마이그레이션을 거치게 된다. 해당 기대값을 v2로 갱신한다(도메인 함수 테스트는 `schemaVersion`을 무시하므로 영향 없음).

**측정 가능한 종료 조건** (아래 §3)
- `migrate(clone(baseState))` → `schemaVersion === 2`, `settings.reminder` `{enabled:false, time:'20:00'}`, `settings.activeRoutineId === 'rt_aXk92'`(보존)
- `emptyAppState().settings.reminder` → `{enabled:false, time:'20:00'}`, `emptyAppState().schemaVersion === 2`
- `needsReminderToday(baseState, '2026-06-22')` → `true`
- `tsc --noEmit` exit code 0

### Day 2 — lib/notifications.ts + 설정 UI

**목표**: 알림 I/O 셸과 설정 화면을 구현한다.

**산출물**
- `src/lib/notifications.ts` (신규) — `ensurePermission`/`scheduleDailyReminder`/`cancelReminders`
- `src/store/appStore.ts` — `setReminder` 액션 / `src/store/selectors.ts` — `selectReminder`
- `src/components/settings/ReminderCard.tsx` (신규), `app/(tabs)/settings.tsx` 통합
- 앱 진입점 — `setNotificationHandler` 1회 설정

**작업**
1. `expo-notifications` 설치(Expo Go 호환 로컬 알림 범위만 사용). iOS `requestPermissionsAsync`, Android `setNotificationChannelAsync`.
2. `scheduleDailyReminder(time)`: 기존 리마인더 취소 후 매일 반복 트리거로 예약.
3. `setReminder`는 `settings.reminder`를 불변 갱신 후 `persist`. 예약/취소(I/O)는 설정 화면 effect에서 `lib/notifications.ts` 호출(레이어 분리: store는 상태만).
4. `ReminderCard`: 토글 + 시각 선택. 기존 `Card`/`SettingButton` 언어 재사용. 토글 on `color.primary`.

**측정 가능한 종료 조건**
- `tsc --noEmit` exit code 0
- 설정 토글 → `selectReminder` 값 변경(통합 테스트, store 레벨)
- I/O(`lib/notifications.ts`)는 jest 미검증임을 코드 주석에 명시(`backupFile.ts`와 동일 취급)

### Day 3 — 테스트 + 실기기 검증 체크리스트

**목표**: 마이그레이션·순수 함수 테스트를 통과하고 I/O를 실기기로 검증한다.

**산출물**
- `__tests__/domain/migration.test.ts` (v1→v2 추가), `__tests__/domain/reminder.test.ts`

**작업**
1. §3 케이스 구현.
2. 실기기 체크리스트: 예약·발화·권한 거부 경로.

**측정 가능한 종료 조건**
- `jest __tests__/domain/migration.test.ts __tests__/domain/reminder.test.ts` → pass
- 실기기: 설정한 시각에 알림 발화 1건, 권한 거부 시 토글 비활성·안내(수동 체크)
- `tsc --noEmit` exit code 0

---

## 3. 상세 테스트 케이스 (fixture·입력→기대 출력)

기준 fixture: `baseState`(`schemaVersion: 1`). 마이그레이션 테스트는 `clone(baseState)`를 입력으로 쓴다.

### 3.1 마이그레이션 v1 → v2

- **입력**: `migrate(clone(baseState))` (CURRENT_SCHEMA_VERSION = 2 적용 후)
- **기대 출력**:
  - `result.schemaVersion === 2`
  - `result.settings.reminder` → `{ enabled:false, time:'20:00' }` (기본값 주입)
  - `result.settings.activeRoutineId === 'rt_aXk92'` (기존 값 보존)
  - `result.routines`/`result.completionLogs`/`result.activationTimeline` 불변(가법적 변경)

### 3.2 신규 설치 시드

- `emptyAppState().schemaVersion` → `2`
- `emptyAppState().settings.reminder` → `{ enabled:false, time:'20:00' }`

### 3.3 needsReminderToday

| 입력 | fixture | 기대 | 근거 |
|------|---------|------|------|
| `('2026-06-22')` | `baseState` | `true` | 월 활동일·미완(`x3` 미체크) |
| `('2026-06-22')` | 월 완전 완료 fixture | `false` | 오늘 완료 → 알림 불필요 |
| `('2026-06-21')` | `baseState` | `false` | 일 휴식일(활동일 아님) |
| `('2026-05-31')` | `baseState` | `false` | 활성 버전 없음 |

### 3.4 마이그레이션 전 자동 백업 (기존 경로 재사용)

- **입력**: `AsyncStorageRepository.load()`에 `schemaVersion < 2` 원본이 저장된 상태
- **기대**: `BACKUP_KEY`에 원본 raw 기록(기존 best-effort 백업 경로, PRD 8.4). 새 코드 불필요.

---

## 4. 종료 조건 (실행 명령)

| # | 종료 조건 | 검증 절차 |
|---|-----------|-----------|
| EC0 | 범위 게이트 승인 | PRD 범위 재검토 결정이 "로컬 알림 v1.x 편입"으로 승인됨(선행). 미승인 시 본 Stage 보류 |
| EC1 | v1→v2 마이그레이션 | `jest __tests__/domain/migration.test.ts` → 3.1 전 필드 일치(`schemaVersion:2`, reminder 기본값, activeRoutineId 보존) |
| EC2 | 신규 설치 시드 | 3.2 `emptyAppState()` reminder·schemaVersion 일치 |
| EC3 | `needsReminderToday` | `jest __tests__/domain/reminder.test.ts` → 3.3 네 케이스 일치 |
| EC4 | 마이그레이션 전 백업 | 3.4에서 `BACKUP_KEY` 기록 확인(`AsyncStorageRepository.test.ts`) |
| EC5 | 타입 검사 무오류 | `tsc --noEmit` exit code 0 |
| EC6 | 실기기 알림 발화 | 설정 시각에 알림 1건 발화, 권한 거부 경로 안내(수동 체크) |
