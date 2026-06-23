# Stage 4 — 공유·임포트 (M4)

> 문서 종류: 단계별 스펙 (docs/spec)
> 작성일: 2026-06-22
> 상위 출처: `docs/prd/2026-06-23/workout-tracker-prd.md` (v1.2, APPROVE 완료), `docs/spec/2026-06-23/00-architecture.md`
> 마일스톤: M4 공유·임포트 (PRD 9.3)
> 하위 파생: day-by-day 실행 계획은 `docs/development/2026-06-23/`로 분해한다.

---

## 1. 개요

| 항목 | 내용 |
|------|------|
| 목표 | 루틴 템플릿을 공유 코드 문자열 / 딥링크 / QR로 내보내고, 같은 경로로 가져오는 서버리스 공유를 구현한다. 백엔드 호출 0건(PRD G4·D7). |
| PRD 마일스톤 | M4 공유·임포트 (PRD 9.3). 종료 조건: 코드/딥링크/QR 왕복(export→import) 후 라이브러리 추가, 로그 미포함 검증. |
| 범위 (in) | `domain/share.ts`(직렬화·역직렬화), 공유 시트(바텀시트), 가져오기 화면 `app/import.tsx`, QR 생성, 딥링크 진입, store `importRoutine` 액션. PRD 5.5·7.1·7.2. |
| 범위 (out) | 멀티 프레임 QR(PRD D7·7.1에서 v1 제외), v2 공유 링크 단축·공개 갤러리·멀티 기기 동기화(PRD 7.3), 전체 백업/복원(완료 로그 포함, PRD 8.5 — 별개 경로). |
| 의존 | Stage 1(데이터 모델·타입·Zod 스키마·Repository·`importRoutine`이 만들 `Routine`/`RoutineVersion` 구조), Stage 3(라이브러리·루틴 에디터 — 공유 진입점·임포트 후 편집/활성 전환). |
| 개략 일수 | 3~4일(풀타임). |

핵심 제약(반복): 공유 페이로드는 **루틴 템플릿만** 담는다. 완료 로그·내부 `id`·`slotId`·`activationTimeline`은 절대 포함하지 않는다(PRD D8.5·7.1).

---

## 2. 구현할 기능·화면 목록

| 산출물 | 역할 | PRD 매핑 |
|--------|------|----------|
| `domain/share.ts` `serializeRoutine()` | 루틴 버전 → 페이로드(템플릿만) → JSON → deflate → base64url | PRD 5.5·7.1, 아키텍처 9장 |
| `domain/share.ts` `deserializeRoutine()` | base64url → inflate → JSON.parse → Zod 검증 → schemaVersion 확인 | PRD 7.1·7.2, 4.8 |
| `domain/share.ts` `buildDeepLink()` / `buildShareCode()` | 인코딩 문자열 → 딥링크 URL·공유 코드 형태 | PRD 7.1 |
| 공유 시트 (바텀시트) | 선택 루틴의 현재(또는 지정) 버전 직렬화 → 코드·딥링크·QR 생성·복사 | PRD 5.5·6.3·7.1 |
| QR 생성 (`react-native-qrcode-svg`) | 딥링크 URL을 QR로. 용량 초과 시 비활성화·코드 폴백 | PRD 7.1·D7 |
| 가져오기 화면 `app/import.tsx` | 코드 붙여넣기 / QR 스캔 / 딥링크 진입 → 미리보기 → "라이브러리에 추가" | PRD 5.5·7.1, 아키텍처 7장 |
| QR 스캔 (`expo-camera`) | 카메라 바코드 스캔으로 딥링크 URL 획득 | PRD 5.5, 아키텍처 1장 |
| 딥링크 등록 (`expo-linking` + expo-router) | `workouttracker://import?d=...` → `import` 라우트 진입 | PRD 7.1, 아키텍처 7장 |
| store `importRoutine(payload)` | 페이로드 → 새 `Routine` + `id`·`slotId` 재발급 + 첫 `RoutineVersion` | PRD 5.5·4.8·7.1, 아키텍처 6장 |

---

## 3. 공유 페이로드 설계

PRD 7.1의 페이로드 예시(루틴 템플릿만)를 TypeScript 타입과 Zod 스키마로 고정한다. 페이로드는 PRD 7.1을 인용하며 임의로 구조를 바꾸지 않는다.

페이로드에 담는 것: `schemaVersion`, `type`, 루틴 `name`, 단일 버전의 `restDays`·`days`(요일별 `aerobic`/`anaerobic` 종목 = `name`+`sets`). 담지 않는 것: 앱 내부 `id`·`slotId`·`completionLogs`·`activationTimeline`·`createdAt`·`versionId`(PRD 7.1 인용문 "페이로드에는 앱 내부 id·slotId·completionLogs·activationTimeline을 담지 않는다").

```typescript
// domain/share.ts (페이로드 타입 — PRD 7.1 인용)
type SharedExercise = {
  name: string          // 운동 종목명. slotId 없음(받는 쪽이 재발급)
  sets: string          // 세트 정보 자유 문자열(PRD D4), 예: "4 × 12"
}

type SharedDayPlan = {
  aerobic: SharedExercise[]
  anaerobic: SharedExercise[]
}

type SharedRoutineVersion = {
  restDays: Weekday[]                          // 휴식일 = 데이터 속성(PRD D8.6)
  days: Record<Weekday, SharedDayPlan>         // mon ~ sun
}

type SharePayload = {
  schemaVersion: number                        // 호환성 판정(PRD 7.2)
  type: 'routine-share'                        // 페이로드 종류 판별
  routine: {
    name: string
    version: SharedRoutineVersion              // 단일 버전만(버전 히스토리 미포함)
  }
}
```

```typescript
// Zod 스키마 — 임포트 입력 검증(PRD 7.2·10.2 악성 페이로드 리스크 완화)
const sharedExerciseSchema = z.object({
  name: z.string().min(1).max(MAX_NAME_LEN),
  sets: z.string().max(MAX_SETS_LEN),
})

const sharedDayPlanSchema = z.object({
  aerobic: z.array(sharedExerciseSchema).max(MAX_SLOTS_PER_DAY),
  anaerobic: z.array(sharedExerciseSchema).max(MAX_SLOTS_PER_DAY),
})

const weekdaySchema = z.enum(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'])

// days는 z.record(enum, ...) 대신 명시적 7-키 z.object로 강제한다.
// z.record(enum, ...)는 키 완전성을 신뢰성 있게 강제하지 못하므로(Stage 1 DaysSchema와 동일 패턴으로
// 요일 키 완전성을 강제 — 단일 출처 정합), 7개 요일을 명시한 z.object를 사용한다.
const sharedDaysSchema = z.object({
  mon: sharedDayPlanSchema,
  tue: sharedDayPlanSchema,
  wed: sharedDayPlanSchema,
  thu: sharedDayPlanSchema,
  fri: sharedDayPlanSchema,
  sat: sharedDayPlanSchema,
  sun: sharedDayPlanSchema,
})

const sharePayloadSchema = z.object({
  schemaVersion: z.number().int().positive(),
  type: z.literal('routine-share'),
  routine: z.object({
    name: z.string().min(1).max(MAX_NAME_LEN),
    version: z.object({
      restDays: z.array(weekdaySchema),
      days: sharedDaysSchema,
    }),
  }),
})
```

> 길이 상한(`MAX_NAME_LEN`, `MAX_SETS_LEN`, `MAX_SLOTS_PER_DAY`)과 디코드 전 바이트 상한은 6장 보안에서 정의한다. 스키마는 `schemaVersion` 자체의 검증만 하고, 호환성(현재 앱이 받아들일 수 있는 버전인지) 판정은 디코드 후 별도 단계(5·6장)에서 수행한다.

---

## 4. 직렬화·전달 파이프라인

아키텍처 9장에서 고정한 책임 경계를 따른다. `domain/share.ts`는 순수 함수만 두며 store·UI·저장에 의존하지 않는다.

```
내보내기: payload(템플릿만) → JSON.stringify → pako.deflate → base64url
가져오기: base64url → pako.inflate → JSON.parse → Zod 검증 → schemaVersion 확인 → id/slotId 재발급
```

### 4.1 내보내기 단계

1. 선택한 루틴과 버전으로 `SharePayload`를 구성한다(현재 버전 기본, 지정 버전 가능). 이때 `id`·`slotId`·`versionId`·`createdAt`을 제거하고 `name`+`sets`만 남긴다.
2. `JSON.stringify(payload)`.
3. `pako.deflate`로 바이트 배열 압축.
4. URL-safe Base64 인코딩(base64url): 표준 Base64에서 `+`→`-`, `/`→`_`, 끝의 `=` 패딩 제거.

### 4.2 전달 형태 (PRD 7.1)

| 형태 | 값 | 비고 |
|------|-----|------|
| 공유 코드 | base64url 문자열(필요 시 사람이 읽기 쉽게 블록 분할 표시) | 길면 사용성 저하 → 압축이 중요(PRD 10.2 리스크) |
| 딥링크 | `workouttracker://import?d=<base64url문자열>` | 설치 시 탭하면 가져오기 화면 직접 진입 |
| QR | 딥링크 URL을 QR로 인코딩 | 단일 프레임 용량 초과 시 QR 비활성화·코드 폴백(PRD D7·7.1) |

### 4.3 가져오기 단계 (디코드)

1. 입력 문자열에서 딥링크면 `d` 파라미터 추출, 코드면 그대로 사용.
2. base64url 디코드(역변환: `-`→`+`, `_`→`/`, 패딩 복원) → 바이트 배열.
3. `pako.inflate` 압축 해제.
4. `JSON.parse`.
5. `sharePayloadSchema.safeParse`로 Zod 검증.
6. `schemaVersion` 호환성 확인(6장).

### 4.4 라이브러리 사용 방침

- 압축: `pako`(deflate). 브라우저/RN 양쪽 검증(아키텍처 1장).
- 인코딩: URL-safe Base64. RN 환경에서는 `Buffer`/`atob` 대신 명시적 base64url 변환 유틸을 두어 표준 Base64와의 차이(문자 치환·패딩)를 일관 처리한다(7장 주의).
- QR 생성: `react-native-qrcode-svg`. QR 스캔: `expo-camera`. 딥링크: `expo-linking`(아키텍처 1장·7장).

---

## 5. 임포트 절차

PRD 7.1 임포트 절차와 4.8(slotId 충돌·재발급)을 운영화한다. 입력 진입점은 세 가지이며, 디코드 이후는 공통이다.

### 5.1 입력 진입점

| 진입점 | 처리 |
|--------|------|
| 코드 붙여넣기 | 사용자가 붙여넣은 문자열을 그대로 디코드 파이프라인에 투입 |
| QR 스캔 | `expo-camera`로 딥링크 URL 인식 → `d` 파라미터 추출 |
| 딥링크 | `workouttracker://import?d=...` 진입 → `import` 라우트가 `d`를 받아 디코드 |

### 5.2 공통 절차

1. 입력 파싱 → base64url 디코드 → `pako.inflate` → `JSON.parse`(4.3).
2. Zod 검증(`sharePayloadSchema`). 실패 시 "올바른 공유 코드가 아닙니다" 안내, 중단.
3. `schemaVersion` 호환성 확인(6장). 비호환이면 거부 안내, 중단(AC-5.5.3).
4. 미리보기 표시: 루틴 이름, 요일별 유산소·무산소 종목·세트, 휴식일(PRD 5.5).
5. "라이브러리에 추가" 확정 → `store.importRoutine(payload)` 호출.

### 5.3 store `importRoutine(payload)` 액션

페이로드를 내 데이터 모델로 변환한다(아키텍처 6장 `importRoutine`). 불변 갱신으로 새 `AppState`를 만든다.

- 새 `Routine.id` 발급(앱 측, 충돌 회피 — PRD 4.8·7.1).
- 페이로드의 단일 버전으로 첫 `RoutineVersion(versionId 새로 발급, createdAt = now)` 구성.
- 각 종목에 `slotId`를 **재발급**한다. PRD 4.4 정의대로 `slotId`는 `(버전, 요일, 카테고리)` 범위에서 안정적인 위치 식별자이므로, 요일·카테고리별 슬롯 배열 순서대로 새 `slotId`를 부여한다(PRD 4.8 remap). 재발급되는 `slotId`는 `(버전, 요일, 카테고리)` 범위 내에서 고유하면 충분하며 전역 고유일 필요는 없다(PRD 4.4). 동일 버전 내 다른 요일에서 같은 `slotId` 값이 재사용될 수 있다.
- **7요일 완전성 보장 (단일 방어선)**: `sharedDaysSchema`(§3)는 7개 요일 키를 모두 필수로 강제하므로, 요일 키가 누락된 페이로드는 임포트 파이프라인의 Zod 검증 단계(§5.1~5.2)에서 거부되어 `importRoutine`에 도달하지 못한다. 따라서 `importRoutine`이 받는 페이로드는 항상 7요일이 완전하며, **누락 요일을 빈 `DayPlan`으로 채우는 별도 처리는 두지 않는다**(검증 거부와 채움이 상반된 동작을 낳지 않도록 방어를 한 곳으로 일원화한다). 이 strict 거부 정책은 손상·악성 페이로드를 조용히 받아들이지 않고 명확히 차단하는 PRD 10.2의 위협 모델과 정합하며, 그 결과 생성되는 `RoutineVersion.days`는 항상 7요일 완전성을 가져 `versionOf(date) != null ⟺ plan(date) != null` 불변식을 유지한다.
- 새 `Routine`을 `routines` 라이브러리에 append. 기존 루틴·완료 로그·타임라인은 변형하지 않는다(AC-5.5.2).
- 가져온 직후에는 활성으로 만들지 않는다. 활성 전환은 사용자가 라이브러리에서 별도로 수행한다(Stage 3, PRD 저니 C-5). 이름 충돌 처리는 10장 참조.

> 가져온 루틴은 내 루틴과 동일한 구조이므로 이후 편집 시 Stage 3의 `editRoutine`이 새 버전을 생성한다(AC-5.5.4). 임포트가 별도의 특수 경로를 만들지 않는다.

---

## 6. 버전 호환성·보안

### 6.1 버전 호환성 (PRD 7.2)

- 페이로드와 앱 모두 `schemaVersion`을 가진다.
- 임포트 허용 규칙: `payload.schemaVersion <= app.supportedSchemaVersion`이면 허용. 더 높으면 "앱 업데이트가 필요합니다" 안내 후 거부(AC-5.5.3).
- 하위 호환: 페이로드 `schemaVersion`이 현재보다 낮으면 `domain/migration.ts`의 `migrateSharePayload(payload, targetVersion)`로 현재 모델에 맞춘 뒤 임포트한다(PRD 7.2·8.4). 마이그레이션 소유는 spec stage-1 §3.6에 단일 정의된다 — `migrateSharePayload`(공유 페이로드 계열)의 실제 변환은 **향후 v2** 책임이고, v1 시점에는 `schemaVersion = 1` 단일이므로 빈 통과(payload 그대로 반환)다.
- **상위 버전 거부는 의도된 동작이다**: v2에서 `schemaVersion`이 오르면(예: PRD 11장 실측 입력 도입으로 `checks` 구조가 확장되는 데이터 모델 변경), 그 v2 페이로드를 v1 앱이 받으면 `payload.schemaVersion > app.supportedSchemaVersion`이 되어 "앱 업데이트가 필요합니다" 안내 후 거부한다. 이는 v1 앱이 해석할 수 없는 새 필드를 조용히 누락·오해석하지 않기 위한 의도된 안전 장치이며 오류가 아니다(AC-5.5.3).

### 6.2 보안 (PRD 10.2 악성 페이로드 리스크 완화)

임포트 전 다음을 강제한다. 페이로드는 데이터만 담으며 실행 코드를 포함하지 않는다(PRD 10.2).

| 방어 | 내용 |
|------|------|
| 크기 제한 | 디코드 전 입력 문자열 길이 상한, inflate 후 바이트 상한(decompression bomb 방지). 상한 초과 시 거부. |
| 스키마 검증 | `sharePayloadSchema`로 구조·타입·필드 길이 상한 검증. 미상의 필드는 무시(`type` 리터럴·`schemaVersion`은 필수). |
| 미리보기 확인 | 추가 전 운동·세트·요일·휴식일을 사용자에게 보여주고 명시적 확정(PRD 5.5·10.2). |
| 실행 코드 미포함 | 페이로드는 JSON 데이터만. eval·동적 import 등 실행 경로를 두지 않는다. |

---

## 7. 기술 노트

- **expo-camera 바코드 스캔**: 카메라 권한 요청 후 QR(바코드) 스캔 결과에서 딥링크 URL을 받는다. 권한 거부 시 코드 붙여넣기로 폴백 안내. Expo Go 기본 모듈 범위에서 사용(아키텍처 1장).
- **expo-linking 딥링크**: 스킴 `workouttracker`를 앱 설정(app.json/app.config)에 등록하고, `workouttracker://import?d=...`를 expo-router의 `import` 라우트에 매핑한다. 콜드 스타트(앱이 꺼진 상태에서 링크 진입)와 웜 스타트(실행 중 진입) 모두에서 `d` 파라미터를 파싱해 동일 디코드 파이프라인으로 보낸다.
- **QR 용량 한계와 폴백 판정**: QR 단일 프레임 용량(인코딩 모드·오류정정 레벨에 따른 최대 바이트)을 기준으로, 딥링크 URL 길이가 상한을 넘으면 QR을 비활성화하고 "코드가 길어 QR 대신 코드 문자열로 공유하세요" 안내와 함께 코드 복사를 노출한다(PRD D7·7.1). 폴백 판정의 구체 임계값과 검증 조건은 `docs/development/2026-06-23/stage-4-share-import.md` 참조. 멀티 프레임 QR은 v1 제외.
- **base64url 인코딩 주의**: RN에는 `atob`/`btoa`가 표준 보장되지 않으므로, deflate 출력(바이트)을 base64url로 변환·역변환하는 유틸을 명시적으로 둔다. 표준 Base64 대비 `+`→`-`, `/`→`_`, 패딩(`=`) 제거를 일관 적용하고, 딥링크 URL 파라미터로 안전하게 실린다. 디코드 시 패딩 복원·역치환을 반드시 수행한다.

---

## 8. 테스트 방향

`domain/share.ts` 순수 함수는 단위 테스트가 1순위다. 검증 방향: 직렬화·역직렬화 왕복 동치, 완료 로그 미포함(AC-5.5.1), 비호환 `schemaVersion` 거부(AC-5.5.3), 요일 키 완전성(`sharedDaysSchema`), 기존 상태 불변(AC-5.5.2), id/slotId 재발급(PRD 4.8). 구체 테스트 케이스·fixture·종료 조건(실행 명령·수치 기준)은 `docs/development/2026-06-23/stage-4-share-import.md` 참조.

---

## 9. 주의·미해결 연계

- **같은 이름 루틴(PRD 10.1 Q3)**: 같은 이름의 루틴을 이미 보유해도 `id` 재발급으로 데이터 충돌은 없다. 이름은 그대로 두되 "(가져옴)" 접미를 붙이거나 사용자에게 리네임을 유도한다(잠정안, PRD 10.1 Q3 — 확정 필요). v1 구현은 잠정안 중 하나를 택하되 데이터 충돌이 없음을 우선 보장한다.
- **공유 코드 길이 리스크(PRD 10.2)**: 큰 루틴은 코드가 길어 사용성이 떨어진다. 완화: `pako` 압축 적용, 딥링크/QR을 우선 노출(코드 문자열은 보조), QR 용량 초과 시 코드 폴백. 근본 해결은 v2 링크 단축(PRD 7.3)으로 미룬다.
- **멀티 프레임 QR·v2 링크 단축은 범위 밖**: 본 단계는 단일 프레임 QR + 코드 폴백까지만 구현한다(PRD D7·7.1·7.3).
- **Stage 3 의존**: 공유 진입(라이브러리의 "공유" 액션), 가져온 루틴의 활성 전환·편집은 Stage 3 산출물에 의존한다. 본 단계는 직렬화·임포트와 공유/가져오기 화면까지를 책임진다.
