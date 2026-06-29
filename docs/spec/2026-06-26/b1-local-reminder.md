# B1 — 로컬 리마인더 알림 설계서

> 문서 종류: 큰 그림 설계서 (docs/spec)
> 작성일: 2026-06-26
> 상위 출처: `docs/prd/2026-06-26/feature-discovery-idea-pool.md` (B1), `docs/spec/2026-06-26/00-overview.md` (공유 계약)

---

## 범위 게이트 (먼저 읽을 것)

PRD 9.2는 "푸시 알림"을 v2/향후로 분류한다. 본 설계는 **로컬 알림 한정**(원격 푸시·EAS 푸시 토큰·`projectId` 미사용)이다. Expo SDK 56 공식 문서 확인 결과 **로컬 예약 알림은 Expo Go에서 그대로 동작**하며(원격 푸시만 development build 필요), 따라서 아키텍처 제약("Expo Go에서 v1 전 기능 동작")을 위반하지 않는다. 다만 v1.x 편입은 **PRD 범위 재검토 결정이 선행**되어야 한다. 본 설계서는 그 결정이 승인됨을 전제로 한 구현 설계이다.

또한 본 기능은 Top 5 중 **유일하게 스키마 마이그레이션을 동반**한다(§1). 이는 계산 의미를 바꾸지 않는 가법적 변경이지만, "큰 모델 변화 없음" 전제의 예외로 명시한다.

---

## 0. 개요

| 항목 | 내용 |
|------|------|
| 목표 | 매일 정해진 시각에 로컬 알림을 보내 체크 복귀를 유도한다 |
| 범위(in) | 알림 on/off, 알림 시각 설정, 매일 반복 로컬 알림 예약/취소, 권한 요청 |
| 범위(out) | 원격 푸시·서버 발송(v2), 완료 시 자동 skip(백그라운드 실행 필요, §6 플래그), 요일별 개별 시각 |
| 의존 | `expo-notifications`(신규 패키지), `SettingsSchema` 확장(스키마 2), `lib/notifications.ts`(신규 I/O 셸), `domain/migration.ts` |
| 산출물 | 스키마 마이그레이션 1단계, 신규 도메인 함수 1개, 신규 I/O 셸, 설정 탭 알림 UI, store 액션 1개 |

알림 설정 UI는 기록 탭이 아니라 **기존 설정 탭**(`app/(tabs)/settings.tsx`)에 둔다(개요 §3).

---

## 1. 데이터·스키마 설계 (마이그레이션 동반)

`SettingsSchema`에 알림 설정을 추가한다.

```ts
// types/schema.ts (확장)
export const ReminderSchema = z.object({
  enabled: z.boolean(),
  time: z.string().regex(/^\d{2}:\d{2}$/), // 'HH:MM' 로컬 시각
});
export const SettingsSchema = z.object({
  activeRoutineId: z.string().nullable(),
  reminder: ReminderSchema, // 신규
});
```

- **마이그레이션**: `CURRENT_SCHEMA_VERSION` 1 → 2. `domain/migration.ts`의 `migrations[1]`을 추가해 기존 `settings`에 `reminder` 기본값(`{ enabled: false, time: '20:00' }`)을 주입한다. 기존 값은 보존한다. (migrate 루프는 `migrations[version]`로 FROM 버전을 키로 조회하므로, v1 → v2 단계의 키는 `migrations[1]`이다.)
- **신규 설치 경로 시드(중요)**: `reminder`를 필수 필드로 둘 경우, 마이그레이션뿐 아니라 `store/appStore.ts`의 `emptyAppState()`도 동일 기본값으로 시드해야 한다. 신규 설치는 `schemaVersion`이 이미 2라 마이그레이션을 거치지 않으므로, `emptyAppState()`에 `reminder`를 넣지 않으면 `state.settings.reminder`가 `undefined`가 되어 `selectReminder`/`ReminderCard`가 깨진다. 두 진입점(마이그레이션 + `emptyAppState()`)을 모두 시드한다. 대안: `reminder`를 `.optional()`로 두고 읽기 시점에 기본값을 적용하면 두 경로 시드를 모두 우회할 수 있다(둘 중 하나만 채택).
- **안전망**: 마이그레이션 전 자동 백업은 기존 `AsyncStorageRepository.load()` 경로(PRD 8.4)를 그대로 거치므로 새 코드가 필요 없다. v1→v2 변환 후 모든 기존 참조(`versionId` 등)는 불변이다(가법적 변경).
- **순수 도메인 함수 1개**: `needsReminderToday(state, today): boolean` — 오늘이 활동일이고 아직 미완료인지(표시·테스트용). 단 알림 발화 시점에 이 함수를 평가하려면 백그라운드 실행이 필요하므로, v1.x는 단순 매일 반복 알림으로 고정한다(§6).

---

## 2. 상태·셀렉터

- store 액션 1개 추가: `setReminder(next: { enabled: boolean; time: string })` — `settings.reminder`를 불변 갱신 후 `persist`(기존 옵티미스틱 저장 경로 재사용).
- 셀렉터 `selectReminder(state)`로 설정 화면이 현재 값을 구독한다.
- **부수효과 분리**: 알림 예약/취소(I/O)는 store가 아니라 설정 화면의 effect에서 `lib/notifications.ts`를 호출한다(레이어 규약: store는 상태만, I/O 셸은 별도).

---

## 3. I/O 셸 — `lib/notifications.ts` (신규)

네이티브 알림 호출을 모으는 얇은 셸. `src/lib/backupFile.ts`와 동일하게 **jest로 검증 불가**한 I/O 경계이며, 순수 로직(시각 파싱·조건 판정)은 도메인에 둔다.

```ts
// lib/notifications.ts (시그니처 개요)
export async function ensurePermission(): Promise<boolean>;       // iOS 권한 요청 / Android 채널 보장
export async function scheduleDailyReminder(time: string): Promise<void>; // 기존 예약 취소 후 매일 반복 예약
export async function cancelReminders(): Promise<void>;
```

- iOS: `requestPermissionsAsync`. Android: `setNotificationChannelAsync`로 채널 보장(권한 프롬프트 노출 전제).
- 매일 반복은 `scheduleNotificationAsync`의 일일 트리거(시·분)로 예약한다. 예약 전 기존 리마인더를 취소해 중복을 막는다.
- 포그라운드 표시는 앱 진입점에서 `setNotificationHandler`를 1회 설정한다.

---

## 4. 화면·컴포넌트 구조

```
app/(tabs)/settings.tsx          # 기존 설정 탭에 "알림" 카드 추가
└─ components/settings/
   └─ ReminderCard.tsx           # on/off 토글 + 시각 선택
```

- 토글 변경 → `setReminder` → effect가 `lib/notifications.ts`로 예약/취소.
- 시각 선택 UI(시·분)는 Expo Go 호환 컴포넌트를 development에서 확정한다(§6).

---

## 5. 디자인 토큰 적용

- 알림 카드는 기존 백업/복원 카드와 동일한 `Card` + `SettingButton` 언어 재사용.
- 토글 on 색 `color.primary`, off `color.chipIdleBg`. 설명 텍스트 `color.fgMuted`.

---

## 6. 테스트 방향

- 도메인: `needsReminderToday` 순수 함수(활동일·미완 경계), 마이그레이션 v1→v2(기존 `settings`에 `reminder` 기본값 주입·기존 값 보존).
- I/O 셸: jest 미검증. `backupFile.ts`와 동일하게 실기기 검증 대상으로 명시(예약·발화·권한 거부).

> 구체 fixture·기대 동작·실행 명령은 `docs/development/`로 파생.

---

## 7. 미해결·리스크

- **범위 게이트(최우선)**: v1.x 편입은 PRD 범위 재검토 결정 후. 미결 시 본 설계는 보류.
- **Expo Go 실동작**: 문서상 로컬 알림은 Expo Go 지원이나, 실기기에서 예약·발화·권한 흐름은 미검증(I/O 셸 특성). development에서 실기기 검증 필요.
- **완료 시 자동 skip 제외**: "오늘 이미 완료했으면 알림 생략"은 발화 시점 상태 평가가 필요해 백그라운드 태스크를 요구한다. v1.x는 단순 매일 반복으로 고정하고, 조건부 skip은 향후 확장으로 분리(`needsReminderToday`는 인앱 배지·향후 백그라운드용으로 준비).
- **시각 선택 컴포넌트**: Expo Go 호환 datetime 선택 수단을 development에서 확정.
