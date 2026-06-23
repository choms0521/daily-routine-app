# Stage 4 — 공유·임포트 개발계획서

> 문서 종류: 상세 개발계획서 (docs/development)
> 작성일: 2026-06-23
> 상위 출처: `docs/spec/2026-06-23/stage-4-share-import.md`, `docs/prd/2026-06-23/workout-tracker-prd.md` (v1.2)
> 마일스톤: M4 공유·임포트 (PRD 9.3)

---

## 1. 개요

| 항목 | 내용 |
|------|------|
| 목표 | 루틴 템플릿을 공유 코드·딥링크·QR로 내보내고 가져오는 서버리스 공유 구현. 백엔드 호출 0건(PRD G4). |
| 의존 | Stage 1(데이터 모델·타입·Zod 스키마·Repository·`Routine`/`RoutineVersion` 구조 완성), Stage 3(라이브러리·루틴 에디터·`editRoutine` 액션 완성). |
| 기간 | 3~4일(풀타임). |
| 핵심 불변 | 공유 페이로드에 완료 로그(`completionLogs`)·`activationTimeline`·내부 `id`·`slotId`·`versionId` 절대 미포함(PRD D8.5). |

---

## 2. Day별 work package

### Day 1 — `domain/share.ts` 직렬화·역직렬화

**목표**: 페이로드 타입·Zod 스키마·직렬화(`serializeRoutine`)·역직렬화(`deserializeRoutine`) 순수 함수 완성. 단위 테스트 Red→Green.

**산출물**
- `domain/share.ts`: `SharePayload` 타입, `sharedDaysSchema`(명시적 7-키), `sharePayloadSchema`, `serializeRoutine()`, `deserializeRoutine()`, base64url 유틸.
- `__tests__/domain/share.test.ts`: 단위 테스트 전체(3장 케이스 포함).

**작업**
1. `SharePayload` 타입 및 Zod 스키마 정의. `sharedDaysSchema`는 `z.object({ mon, tue, ..., sun })`으로 7개 키 명시(spec §3).
2. base64url 변환 유틸 구현(`+`→`-`, `/`→`_`, 패딩 제거·복원).
3. `serializeRoutine(version, name)`: 페이로드 구성(완료 로그 필드 제거) → `JSON.stringify` → `pako.deflate` → base64url.
4. `deserializeRoutine(encoded, supportedSchemaVersion)`: base64url 디코드 → `pako.inflate` → `JSON.parse` → Zod 검증 → schemaVersion 확인 → 성공/거부 결과 반환.
5. 단위 테스트 작성 후 실행: `jest __tests__/domain/share.test.ts`.

**측정 가능한 종료 조건**
- `jest __tests__/domain/share.test.ts` → 전체 통과(0 failures).
- 왕복 동치 테스트: `serializeRoutine` → `deserializeRoutine` 결과에서 `routine.name`, `routine.version.restDays`, 모든 요일 슬롯 `name`·`sets` 값이 원본과 일치(`deepEqual`).
- 완료 로그 미포함 테스트: 출력 페이로드를 `JSON.parse`한 객체에 `completionLogs`, `activationTimeline`, `slotId`, `versionId`, `id` 키가 0개(`Object.keys` 탐색).
- 요일 키 완전성 테스트: `mon` 키를 제거한 페이로드를 `deserializeRoutine`에 투입 → `success: false` 반환(Zod 거부).
- schemaVersion 거부 테스트: `schemaVersion: 999`인 페이로드 → `success: false`, `reason: 'incompatible-schema'` (또는 동등 식별자).
- `tsc --noEmit` → 0 errors.

---

### Day 2 — 공유 시트(바텀시트)·코드/딥링크/QR 생성

**목표**: 라이브러리 화면에서 루틴을 선택해 공유 시트를 열면 코드·딥링크·QR 세 형태를 생성·복사할 수 있다.

**산출물**
- `components/sheet/ShareSheet.tsx`: 공유 시트 컴포넌트.
- `domain/share.ts` 추가: `buildDeepLink(encoded)`, `buildShareCode(encoded)`.
- QR 렌더러 통합(`react-native-qrcode-svg`).

**작업**
1. `buildDeepLink(encoded)` → `workouttracker://import?d=<encoded>` 문자열 반환.
2. `buildShareCode(encoded)` → 공유 코드 문자열 반환(필요 시 블록 분할 형식).
3. QR 용량 판정 로직: 딥링크 URL 길이 > `QR_MAX_URL_LEN`(측정값 기반 상수)이면 QR 비활성화, 코드 문자열 폴백. `QR_MAX_URL_LEN` 기준: `react-native-qrcode-svg` ECC Level M, Binary 모드 기준 최대 2953 바이트에서 스킴 오버헤드를 뺀 값으로 설정.
4. `ShareSheet`: 코드 복사 버튼, 딥링크 복사 버튼, QR 뷰(조건부 렌더). Toss 바텀시트 스타일.
5. 라이브러리 화면의 "공유" 진입점 연결(Stage 3 산출물에 훅).

**측정 가능한 종료 조건**
- `buildDeepLink` 단위 테스트: 출력이 `workouttracker://import?d=` 접두사를 가지고, `d` 파라미터를 `deserializeRoutine`에 투입하면 원본과 일치.
- QR 폴백 테스트: `encoded` 길이가 `QR_MAX_URL_LEN`을 초과하는 케이스에서 `ShareSheet` 내 QR 컴포넌트 미렌더(`queryByTestId('qr-view')` → null), 코드 복사 버튼 존재.
- 공유 시트가 열리고 코드 복사 버튼 탭 후 클립보드에 base64url 문자열 저장 확인(RNTL + `@react-native-clipboard/clipboard` 모킹).
- `tsc --noEmit` → 0 errors.

---

### Day 3 — 가져오기 화면·파싱·미리보기·`importRoutine` 액션

**목표**: `app/import.tsx` 화면에서 코드 붙여넣기·QR 스캔·딥링크 세 진입점이 모두 동작하고, 미리보기 → "라이브러리에 추가"까지 완성.

**산출물**
- `app/import.tsx`: 가져오기 화면.
- `store/appStore.ts` 추가: `importRoutine(payload)` 액션.
- 딥링크 등록: `app.json`(또는 `app.config.ts`) 스킴 `workouttracker` 추가, `app/_layout.tsx` 딥링크 핸들.

**작업**
1. `importRoutine(payload)` store 액션 구현:
   - 새 `Routine.id` 발급.
   - `payload.routine.version`을 `RoutineVersion`으로 변환 (새 `versionId`, `createdAt = now`).
   - 각 요일·카테고리 슬롯에 `slotId` 재발급 (배열 순서 기반, 요일 내 고유, 전역 고유 불필요 — PRD 4.4).
   - 페이로드는 Zod `sharedDaysSchema`(7키 필수)를 이미 통과했으므로 `importRoutine`은 7요일 완전성을 신뢰하고 별도 채움을 하지 않는다(spec §5.3). 누락 요일 페이로드는 디코드 단계의 Zod 검증에서 이미 거부되어 여기 도달하지 못한다.
   - 새 `Routine` → `routines` append. 기존 상태 불변.
2. `app/import.tsx` 구현: 탭(코드 입력 / QR 스캔) UI.
   - 코드 탭: `TextInput` 붙여넣기 → 디코드 → 미리보기.
   - QR 탭: `expo-camera` 바코드 스캔 → 딥링크 URL 감지 → `d` 파라미터 추출 → 디코드 → 미리보기. 카메라 권한 거부 시 코드 탭으로 유도.
   - 딥링크 진입: `_layout.tsx`에서 `workouttracker://import?d=...` 감지 → `import` 라우트로 `d` 파라미터 전달.
3. 미리보기 컴포넌트: 루틴 이름, 요일별 유산소·무산소 종목·세트, 휴식일 표시 (PRD 5.5).
4. "라이브러리에 추가" 버튼 → `store.importRoutine` 호출 → 성공 토스트 → 라이브러리로 이동.

**측정 가능한 종료 조건**
- `importRoutine` 통합 테스트: 호출 전후 `routines.length` 차이 정확히 +1. 기존 `routines[0]`·`completionLogs`·`activationTimeline`이 호출 전과 `JSON.stringify` 동일.
- id/slotId 재발급 테스트: 가져온 루틴의 `Routine.id`가 기존 루틴 id 목록에 없음. 모든 `slotId`가 기존 슬롯 id와 겹치지 않음.
- 7요일 완전성 테스트: `importRoutine` 호출 후 생성된 `RoutineVersion.days`에서 `Object.keys(version.days).length === 7`.
- 딥링크 파싱 단위 테스트: `workouttracker://import?d=<encoded>` URL에서 `d` 파라미터 추출 → `deserializeRoutine` 성공.
- `tsc --noEmit` → 0 errors.

---

### Day 4 — 호환성·보안 강화·E2E 왕복·버그 수정

**목표**: schemaVersion 하위 호환 골격, 크기 제한, 악성 입력 방어, E2E 왕복 테스트 통과. 전체 종료 조건 체크.

**산출물**
- `domain/share.ts` 보완: 크기 상한 상수(`MAX_INPUT_CHARS`, `MAX_INFLATED_BYTES`), 악성 입력 방어 경로.
- `domain/migration.ts` 보완: 페이로드 schemaVersion 마이그레이션 골격.
- `__tests__/e2e/share-import.yml` (Maestro): export→import E2E 시나리오.
- 버그 수정 및 미완 항목 마무리.

**작업**
1. `deserializeRoutine` 크기 제한 강화:
   - 입력 문자열 길이 > `MAX_INPUT_CHARS`(예: 50,000자) → 즉시 거부.
   - `pako.inflate` 후 바이트 > `MAX_INFLATED_BYTES`(예: 500,000 bytes) → 거부(decompression bomb 방지).
2. schemaVersion 하위 호환 골격: `payload.schemaVersion < supportedSchemaVersion`인 경우 `domain/migration.ts`의 `migrateSharePayload(payload, targetVersion)` 호출 경로 추가. v1 단일 버전이므로 실제 변환 로직은 빈 통과(`payload` 그대로 반환), 향후 버전에서 채움.
3. 악성/손상 입력 방어 테스트 보완: 깨진 base64url, inflate 예외, JSON.parse 예외, Zod 실패 각각이 `{ success: false, reason: string }` 반환 확인.
4. Maestro E2E: 공유 시트 열기 → 코드 복사 → 가져오기 화면 붙여넣기 → 미리보기 표시 → "라이브러리에 추가" → 라이브러리 화면에 새 루틴 1개 추가 확인. 가져온 루틴의 완료 상태가 비어 있음 확인.
5. 전체 종료 조건 체크리스트 실행.

**측정 가능한 종료 조건**
- `MAX_INPUT_CHARS` 초과 문자열 → `{ success: false, reason: 'input-too-large' }` 단위 테스트 통과.
- `MAX_INFLATED_BYTES` 초과 inflate 결과 → `{ success: false, reason: 'payload-too-large' }` 단위 테스트 통과.
- Maestro E2E 시나리오 통과: 코드 경로 왕복, 완료 로그 미포함 확인.
- `jest --coverage __tests__/domain/share.test.ts` → 커버리지 80% 이상.
- `tsc --noEmit` → 0 errors.

---

## 3. 상세 테스트 케이스

### 3.1 단위 테스트 (`__tests__/domain/share.test.ts`, Jest)

**왕복 동치 (AC 기반)**
```
입력: { name: "여름 컨디셔닝", version: { restDays: ["sun"], days: { mon: { aerobic: [{name:"러닝", sets:"30분"}], anaerobic: [] }, tue: ..., ..., sun: { aerobic: [], anaerobic: [] } } } }
serializeRoutine(version, name) → encoded (string)
deserializeRoutine(encoded, 1) → { success: true, payload: { routine: { name: "여름 컨디셔닝", version: { restDays: ["sun"], days: { mon: { aerobic: [{name:"러닝", sets:"30분"}], ... } } } } } }
기대: deepEqual(원본 name·restDays·days[*].aerobic[*].name, 역직렬화 결과)
```

**완료 로그 미포함 (AC-5.5.1)**
```
입력: AppState에 completionLogs, activationTimeline 포함된 상태에서 serializeRoutine 호출
기대: JSON.parse(pako.inflate(base64url_decode(encoded)))의 키 목록에
      "completionLogs", "activationTimeline", "slotId", "versionId", "id" 없음
      (Object.keys로 재귀 탐색하거나 JSON.stringify 문자열 포함 여부 확인)
```

**비호환 schemaVersion 거부 (AC-5.5.3)**
```
입력: { schemaVersion: 999, type: "routine-share", routine: { ... } } → serialize → encoded
deserializeRoutine(encoded, supportedSchemaVersion=1)
기대: { success: false, reason: "incompatible-schema" } (또는 동등 식별자)
```

**요일 키 완전성 — Zod 거부 (C1)**
```
입력: 정상 페이로드에서 "mon" 키 제거 후 직접 inflate·JSON.stringify → base64url
deserializeRoutine(encoded, 1)
기대: { success: false, reason: "zod-validation" } — sharedDaysSchema의 mon 필드 required 위반
```

**악성/손상 입력**
```
케이스 1: 깨진 base64url(비ASCII 포함) → { success: false, reason: "decode-error" }
케이스 2: 정상 base64url이지만 inflate 실패 데이터 → { success: false, reason: "inflate-error" }
케이스 3: inflate 성공이지만 JSON 파싱 실패 → { success: false, reason: "parse-error" }
케이스 4: 크기 상한 초과 입력 문자열(> MAX_INPUT_CHARS) → { success: false, reason: "input-too-large" }
케이스 5: inflate 후 바이트 상한 초과(> MAX_INFLATED_BYTES) → { success: false, reason: "payload-too-large" }
```

**buildDeepLink**
```
입력: encoded = "abc123"
buildDeepLink("abc123") → "workouttracker://import?d=abc123"
```

**QR 폴백 판정**
```
입력: encoded 길이가 QR_MAX_URL_LEN - len("workouttracker://import?d=") 이하 → isQrAvailable = true
입력: 초과 → isQrAvailable = false
```

---

### 3.2 통합 테스트 (`__tests__/store/importRoutine.test.ts`, Jest + RNTL)

**새 루틴 추가·기존 상태 불변 (AC-5.5.2)**
```
초기 AppState: routines=[기존루틴A], completionLogs={...}, activationTimeline=[...]
importRoutine(validPayload) 호출
기대:
  - state.routines.length === 2
  - state.routines[0] deepEqual 기존루틴A (불변)
  - JSON.stringify(state.completionLogs) === JSON.stringify(초기completionLogs)
  - JSON.stringify(state.activationTimeline) === JSON.stringify(초기activationTimeline)
```

**id/slotId 재발급 (PRD 4.8)**
```
importRoutine(payload) 호출 후 새 루틴 = state.routines[routines.length - 1]
기대:
  - 새 루틴.id !== 기존루틴A.id
  - 새 루틴 버전의 모든 slotId 값이 기존루틴A의 모든 slotId 값과 교집합 없음
  (단, 새 루틴 내부에서 다른 요일 간 같은 slotId 값 재사용은 허용 — PRD 4.4)
```

**7요일 완전성 (C1 — importRoutine 방어 심층화)**
```
importRoutine(validPayload) 호출 후
새 RoutineVersion = state.routines[last].versions[0]
기대: Object.keys(newVersion.days).length === 7
      ["mon","tue","wed","thu","fri","sat","sun"].every(d => d in newVersion.days) === true
```

**임포트 후 편집 시 새 버전 생성 (AC-5.5.4)**
```
importRoutine(payload) → editRoutine(새루틴.id, 수정draft) 호출
기대:
  - state.routines[last].versions.length === 2
  - versions[0] deepEqual 임포트 직후 버전 (불변)
  - versions[1] 새 버전 (수정 내용 반영)
```

---

### 3.3 E2E 테스트 (`__tests__/e2e/share-import.yml`, Maestro)

**export→import 코드 경로 왕복**
```yaml
# share-import.yml (Maestro)
- launchApp
- tapOn: "루틴 라이브러리"
- tapOn: { id: "routine-card-0" }
- tapOn: "공유"                        # ShareSheet 열기
- tapOn: "코드 복사"                   # 클립보드에 encoded 저장
- tapOn: "뒤로"
- tapOn: "루틴 가져오기"               # import 화면
- tapOn: { id: "code-input" }
- pasteText                            # 클립보드 붙여넣기
- tapOn: "미리보기 확인"
- assertVisible: "러닝 가볍게"         # 미리보기에 운동 종목 표시
- tapOn: "라이브러리에 추가"
- assertVisible: "루틴이 추가됐습니다" # 성공 토스트
- tapOn: "루틴 라이브러리"
- assertVisible: { id: "routine-list" } # 루틴 목록에 새 항목 있음
```

**완료 로그 미포함 확인 (Maestro 측정 스텝)**
```yaml
# 전제: 원본 루틴은 오늘 유산소 칩이 완료(체크)된 상태로 공유한다.
- tapOn: "공유"
- tapOn: "코드 복사"
- tapOn: "뒤로"
- tapOn: "루틴 가져오기"
- tapOn: { id: "code-input" }
- pasteText
- tapOn: "미리보기 확인"
- tapOn: "라이브러리에 추가"
- tapOn: { id: "routine-card-imported" }   # 가져온 루틴 활성화
- tapOn: "활성으로 설정"
- tapOn: "확인"                              # 최초 활성화면 즉시 적용
- tapOn: "홈"
# 측정: 가져온 루틴의 오늘 유산소 칩이 미완료(완료 표식 없음)
- assertVisible: { id: "chip-aerobic-today", text: "유산소" }
- assertNotVisible: { id: "chip-aerobic-today-checked" }   # 완료 점등 표식 없음
```
기대: 가져온 루틴의 오늘 칩이 미완료로 표시된다(완료 로그가 페이로드에 포함되지 않았음을 화면에서 확인). 종료 조건 #5(jest 키 0개)와 함께 이중 검증한다.

---

## 4. 종료 조건 (실행 검증)

| # | 조건 | 실행 명령 / 검증 기준 |
|---|------|----------------------|
| 1 | 코드 왕복(export→import) 후 라이브러리에 새 루틴 1개 추가 | `jest __tests__/store/importRoutine.test.ts` — `routines.length` === 초기 + 1 |
| 2 | 딥링크 왕복: `workouttracker://import?d=...` 진입 → 미리보기 → 추가 성공 | `jest __tests__/domain/share.test.ts` — `buildDeepLink` + `deserializeRoutine` 통합 경로 통과 |
| 3 | QR 왕복: 딥링크 URL → QR 생성 → 스캔 디코드 → 추가 성공(용량 내 페이로드) | `jest` QR 폴백 단위 테스트 통과 + 수동 스캔 확인 |
| 4 | 직렬화 왕복 동치: serialize→deserialize 결과가 원본 템플릿과 일치 | `jest __tests__/domain/share.test.ts` — 왕복 동치 케이스 `deepEqual` 0건 불일치 |
| 5 | 페이로드에 완료 로그 미포함(AC-5.5.1) | `jest` — 출력 페이로드에 `completionLogs`·`activationTimeline`·`slotId` 키 0개 |
| 6 | 가져온 루틴이 기존 루틴·로그·타임라인에 영향 없음(AC-5.5.2) | `jest __tests__/store/importRoutine.test.ts` — 기존 상태 `JSON.stringify` 동일 |
| 7 | 비호환 `schemaVersion` 페이로드 거부(AC-5.5.3) | `jest` — `schemaVersion: 999` 케이스에서 `{ success: false }` 반환 |
| 8 | 가져온 루틴 편집 시 새 버전 생성(AC-5.5.4) | `jest` — `editRoutine` 후 `versions.length` === 2, `versions[0]` 불변 |
| 9 | QR 용량 초과 시 QR 비활성화·코드 폴백 동작 | `jest` — `isQrAvailable === false` + RNTL `queryByTestId('qr-view')` null |
| 10 | 요일 키 누락 페이로드 거부 및 임포트 후 7요일 완전성 보장(C1) | `jest` — 누락 페이로드 → `{ success: false }` + `importRoutine` 후 `Object.keys(version.days).length === 7` |
| 11 | TypeScript 오류 없음 | `tsc --noEmit` → exit code 0 |
| 12 | 단위 테스트 커버리지 | `jest --coverage __tests__/domain/share.test.ts` → `domain/share.ts` 80% 이상 |
