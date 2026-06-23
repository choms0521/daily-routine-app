# 운동 트래커 — 전체 아키텍처 설계서

> 문서 종류: 큰 그림 설계서 (docs/spec)
> 작성일: 2026-06-22
> 상위 출처: `docs/prd/2026-06-23/workout-tracker-prd.md` (v1.2, APPROVE 완료)
> 하위 파생: 단계별 스펙(`docs/spec/2026-06-23/stage-*.md`) → 상세 개발계획서(`docs/development/2026-06-23/`)

---

## 0. 이 문서의 위치

문서 흐름은 `prd → spec → development` 순으로 상세화한다. 이 문서는 그 가운데 **spec(큰 그림 설계서)** 의 최상위로, "PRD의 결정을 어떤 기술과 구조로 구현할 것인가"의 전체 그림을 정한다.

- **상위(단일 출처)**: PRD가 모든 제품 결정의 단일 출처다. 이 문서는 PRD의 결정(D1~D9, 4장 데이터 모델, 5장 기능 명세, 6장 UX)을 위반하지 않는다.
- **이 문서의 역할**: 기술 스택 확정, 레이어 구조, 폴더 구조, 상태관리, 저장 레이어, 도메인 코어, 네비게이션, 디자인 시스템 적용, 테스트 전략을 정의한다. 날짜·단계와 무관한 "모든 단계가 공유하는 기준"이다.
- **하위 파생**: 단계별 스펙 문서(`stage-1` ~ `stage-5`)는 이 문서의 구조를 전제로, 각 마일스톤에서 "무슨 기능을 어디까지 만드는지"를 정한다. 그 아래 day-by-day 실행 계획은 `docs/development/2026-06-23/`로 파생한다.

핵심 제약(반복): **루틴 정의와 완료 기록을 분리하고, 루틴은 버전으로 관리하며, 과거 기록은 그날 활성이던 버전으로 재계산한다(PRD D8).** 이 제약이 아래 모든 레이어 설계의 뿌리다.

---

## 1. 기술 스택

PRD에서 확정된 항목과 이 문서에서 새로 확정하는 권고안을 구분해 표기한다. 권고안은 React Native + Expo 생태계의 표준 선택을 따르며, 각 선택의 근거를 명시한다.

| 영역 | 선택 | 출처 | 근거 |
|------|------|------|------|
| 플랫폼 | React Native + Expo (iOS/Android) | PRD D2 (확정) | 단일 코드베이스, Expo Go로 빠른 개발, 사용자 RN 경험 보유 |
| 언어 | TypeScript (strict) | 권고 | 데이터 모델·도메인 계산의 타입 안정성이 D8 불변식 보호에 필수 |
| 네비게이션 | expo-router (file-based) | 권고 | Expo 공식 권장, 딥링크(`workouttracker://import`) 처리가 파일 라우팅에 자연 통합 |
| 상태관리 | Zustand | 권고 | 경량·보일러플레이트 최소, RN 친화적. Repository 레이어와 분리해 사용 |
| 저장소 | AsyncStorage | PRD D2·8.1 (확정) | Expo Go 즉시 동작, v1 데이터 규모에 충분. Repository 추상화 뒤에 둠 |
| 스키마 검증 | Zod | 권고 | 임포트 페이로드 검증(PRD 7.2)·저장 데이터 무결성·마이그레이션 입력 검증 |
| 날짜 처리 | date-fns | 권고 | 주(월요일 시작) 계산·로컬 타임존 날짜 키 산출(PRD D9). 트리셰이킹 양호 |
| 압축 | pako (deflate) | 권고 | 공유 페이로드 압축(PRD 7.1). 브라우저/RN 양쪽 검증된 deflate 구현 |
| 인코딩 | URL-safe Base64 | PRD 7.1 (확정) | 공유 코드·딥링크 파라미터 인코딩 |
| QR 생성 | react-native-qrcode-svg | 권고 | 딥링크 URL을 QR로 렌더링(PRD 7.1) |
| QR 스캔 | expo-camera (barcode scanning) | 권고 | Expo 관리형 환경에서 카메라·바코드 스캔 통합 지원 |
| 딥링크 | expo-linking | 권고 | 스킴 등록·파라미터 파싱. expo-router와 통합 |
| 애니메이션 | react-native-reanimated | 권고 | 칩 바운스·진행률 트윈 등 마이크로인터랙션(PRD 6.3). 네이티브 스레드 구동 |
| 아이콘 | @expo/vector-icons | 권고 | Expo 기본 포함, 별도 설정 불필요 |
| 단위·통합 테스트 | Jest + React Native Testing Library | 권고 | 도메인 순수 함수(Jest)·컴포넌트(RNTL). 커버리지 80% 목표 |
| E2E 테스트 | Maestro | 권고 | YAML 기반, Expo 친화적. 핵심 유저 플로우(칩 체크→저장→갱신) 검증 |

> **버전·환경 비고**
> - Expo Go에서 v1 전 기능이 동작하는 것을 목표로 한다. QR 스캔(expo-camera)·reanimated는 Expo Go 기본 포함 모듈 범위에서 사용한다. MMKV 등 dev build가 필요한 모듈은 v1에서 쓰지 않는다(PRD 8.1: AsyncStorage가 MMKV 승격 경로를 가지되 v1은 AsyncStorage).
> - 구체 패키지 버전은 상세 개발계획서(`docs/development/2026-06-23/`)에서 설치 시점의 Expo SDK에 맞춰 확정한다. 이 문서는 선택과 근거만 고정한다.

### 1.1 상태관리 선택 보충 (Zustand vs 대안)

- **대안**: Redux Toolkit(보일러플레이트 과다, 1인 앱에 과함), React Context only(잦은 체크 토글 시 리렌더 제어 어려움).
- **채택 이유**: 칩 체크는 옵티미스틱·고빈도 갱신(PRD 6.3)이라 선택적 구독(selector)으로 리렌더를 최소화할 store가 유리하다. Zustand는 selector 구독과 미들웨어(persist 등)를 가볍게 제공한다.
- **주의**: Zustand의 persist 미들웨어를 직접 쓰지 않고, **저장은 Repository 레이어를 경유**한다(아래 4장). 이유: PRD 8.1이 요구하는 저장소 교체 가능성(AsyncStorage→MMKV)과 마이그레이션(PRD 8.4)을 store 바깥에서 통제하기 위함.

---

## 2. 아키텍처 레이어

UI가 도메인 계산이나 저장을 직접 호출하지 않도록 4개 레이어로 분리한다. 의존 방향은 항상 위에서 아래로 흐른다(UI → 상태 → 도메인 → 저장). 도메인 레이어는 순수 함수만 두어 단독 테스트가 가능하게 한다.

```
┌─────────────────────────────────────────────┐
│  UI 레이어 (app/, components/)                │  화면·컴포넌트, expo-router
│   - 홈/라이브러리/에디터/공유/설정 화면        │
│   - 디자인 토큰을 적용한 프레젠테이션          │
└───────────────────┬─────────────────────────┘
                    │ store 구독 / 액션 호출
┌───────────────────▼─────────────────────────┐
│  상태 레이어 (store/)                          │  Zustand
│   - AppState 보유, 액션이 도메인 함수 호출      │
│   - 옵티미스틱 갱신 후 Repository로 영속화      │
└───────────────────┬─────────────────────────┘
                    │ 순수 함수 호출 / Repository 호출
┌───────────────────▼─────────────────────────┐
│  도메인 레이어 (domain/)  ── 순수 함수, 무상태  │
│   - timeline: versionOf(date), plan(date)     │
│   - progress: weekProgress()                  │
│   - streak: streak()                          │
│   - share: serialize/deserialize 페이로드      │
│   - migration: schemaVersion 변환             │
└───────────────────┬─────────────────────────┘
                    │ 영속화 (상태 레이어가 호출)
┌───────────────────▼─────────────────────────┐
│  저장 레이어 (repository/)  ── 추상화 인터페이스 │
│   - StorageRepository 인터페이스               │
│   - AsyncStorageRepository 구현                │
│   - (장래) MMKVRepository 교체 지점            │
└─────────────────────────────────────────────┘
```

- **도메인 레이어가 핵심**: PRD 4.5~4.7의 의사코드(`versionOf`, `plan`, `categoryDone`, `isRestDay`, `dayComplete`, `weekProgress`, `streak`)는 모두 **입력 → 출력의 순수 함수**로 구현한다. 외부 상태·저장·시간에 의존하지 않고, "오늘" 같은 시간 입력도 인자로 받는다. 이로써 PRD가 요구하는 (a)전환·(b)편집·(c)휴식일 변경·(d)오늘 보호 불변식을 단위 테스트로 직접 검증할 수 있다(M1 종료 조건).
- **상태 레이어의 책임**: 도메인 함수에 현재 `AppState`와 시간을 넘겨 결과를 얻고, 변경은 새 객체로 만들어(불변, 코딩 규약) store에 반영한 뒤 Repository로 영속화한다.
- **UI 레이어의 책임**: store를 selector로 구독해 표시만 한다. 계산 로직을 두지 않는다.

---

## 3. 폴더 구조

기능/도메인 중심으로 조직한다(타입별 분류 지양, 코딩 규약 "many small files"). 제안 구조이며 단계 진행 중 미세 조정 가능하다.

```
dailyroutine/
├── app/                          # expo-router 라우트 (화면)
│   ├── _layout.tsx               # 루트 레이아웃 (탭/스택, 딥링크 핸들)
│   ├── (tabs)/
│   │   ├── index.tsx             # 홈 (오늘/주간)
│   │   ├── library.tsx           # 루틴 라이브러리
│   │   └── settings.tsx          # 설정
│   ├── editor/[routineId].tsx    # 루틴 에디터 (생성/편집)
│   └── import.tsx                # 가져오기 (딥링크 진입점 포함)
├── components/                   # 재사용 프레젠테이션 컴포넌트
│   ├── chip/                     # 유산소/무산소 칩, 펼치기
│   ├── progress/                 # 진행률 바, 스트릭 표시
│   ├── sheet/                    # 바텀시트 공통
│   └── ...
├── domain/                       # 순수 함수 (무상태, 테스트 1순위)
│   ├── timeline.ts               # versionOf, plan
│   ├── progress.ts               # weekProgress
│   ├── streak.ts                 # streak
│   ├── completion.ts             # categoryDone, isRestDay, dayComplete, hasAnySlot
│   ├── share.ts                  # 공유 직렬화/역직렬화
│   ├── date.ts                   # 주 계산, 로컬 날짜 키 (date-fns 래핑)
│   └── migration.ts              # schemaVersion 마이그레이션
├── store/                        # Zustand 스토어 + 액션
│   ├── appStore.ts               # AppState 보유, 액션
│   └── selectors.ts              # 파생 선택자
├── repository/                   # 저장 추상화
│   ├── StorageRepository.ts      # 인터페이스
│   └── AsyncStorageRepository.ts # 구현
├── theme/                        # 디자인 토큰 (PRD 6.1)
│   ├── tokens.ts                 # 색·타이포·간격·라운드·그림자
│   └── ThemeProvider.tsx
├── types/                        # 공유 타입·Zod 스키마
│   └── schema.ts                 # Routine/Version/Activation/DayLog + Zod
├── docs/                         # 문서 (prd / spec / development)
└── __tests__/                    # 테스트 (도메인 단위, 컴포넌트, 통합)
```

---

## 4. 저장 레이어 (Repository 추상화)

PRD 8.1이 명시한 "저장 접근을 추상화 레이어 뒤에 두어 교체 비용을 낮춘다"를 구현한다.

```typescript
// repository/StorageRepository.ts
interface StorageRepository {
  load(): Promise<AppState | null>     // 전체 상태 로드 (앱 시작 시)
  save(state: AppState): Promise<void>  // 전체 상태 저장
  // 백업/복원은 도메인 직렬화를 재사용 (PRD 8.5)
}
```

- **v1 구현**: `AsyncStorageRepository`가 `AppState`를 단일 JSON 키로 직렬화해 저장한다. v1 데이터 규모(루틴 수십 + 일별 로그)에서는 전체 저장이 단순하고 충분하다(PRD 8.1).
- **교체 경로**: 일별 로그가 수천 건을 넘거나 동기 쓰기 병목이 측정되면 `MMKVRepository`로 교체(dev build 전환). 인터페이스가 동일하므로 store·도메인은 변경하지 않는다(PRD 8.1 승격 조건).
- **마이그레이션 위치**: 앱 시작 시 `load()` 결과의 `schemaVersion`을 현재 버전과 비교해 `domain/migration.ts`의 변환 함수를 순차 적용한다. 마이그레이션 전 자동 백업으로 실패 복구를 보장한다(PRD 8.4). 버전 불변성 덕분에 완료 로그의 `versionId` 참조는 마이그레이션 후에도 유효해야 한다.

---

## 5. 도메인 코어 (PRD 4장 매핑)

PRD 4.5~4.7의 의사코드를 그대로 순수 함수로 옮긴다. 모든 함수는 시간("오늘")과 `AppState`를 인자로 받아 외부 의존이 없다. 단계 M1의 산출물 핵심이며, 단계별 스펙 `stage-1`에서 상세화한다.

| 함수 | PRD 출처 | 요지 |
|------|----------|------|
| `versionOf(state, date)` | 4.3, 4.5 | 타임라인에서 `effectiveFrom <= date` 중 최근 엔트리의 RoutineVersion. 없으면 null |
| `plan(state, date)` | 4.5 | `versionOf(date).days[weekdayOf(date)]` (DayPlan) 또는 null |
| `isRestDay(state, date)` | 4.5 | 그날 활성 버전 `restDays` 포함 여부 (캘린더 아님) |
| `categoryDone(state, date, category)` | 4.5 | 그 카테고리 모든 슬롯이 체크됨 (빈 카테고리는 제외) |
| `dayComplete(state, date)` | 4.5 | 휴식 아님 + 슬롯 있는 모든 카테고리 완료 |
| `weekProgress(state, weekStartMonday)` | 4.6 | 주 진행률 `{done, total, pct}`. 날짜별 버전 조회, 휴식·빈 카테고리 분모 제외 |
| `streak(state, today)` | 4.7 | 60일 소급 연속 카운트. null/휴식/빈 비휴식일 통과, 오늘 미완료 보호 |

- **불변식 보호(D8.8 오늘 보호)**: 모든 변경 액션(편집·전환)은 타임라인에 `effectiveFrom = 내일`로 append하며(최초 활성화만 오늘), 이 정책을 store 액션과 도메인이 함께 지킨다. 도메인은 날짜별로 버전을 조회하므로 과거·오늘 값이 변경에 의해 흔들리지 않는다.
- **null/빈 날 일치**: 진행률 분모 제외 집합과 스트릭 통과 집합이 동일하도록(`plan==null`, 휴식일, 빈 비휴식일), 두 함수가 같은 가드를 쓴다(PRD 4.5 빈 날 처리 규칙).

---

## 6. 상태관리 설계 (Zustand)

```typescript
// store/appStore.ts (구조 개요)
interface AppStore {
  state: AppState                                   // PRD 4.2 엔티티
  // --- 조회는 selector + 도메인 함수로 ---
  // --- 액션 (모두 불변 갱신 후 Repository.save) ---
  toggleCheck(date, category, slotId): void         // 5.1/5.2 옵티미스틱
  toggleCategory(date, category, value): void       // 5.2 일괄
  createRoutine(draft): void                        // 5.3 새 Routine + v_001
  editRoutine(routineId, draft): void               // 5.3 새 버전 append + 타임라인(활성 시)
  setActiveRoutine(routineId): void                 // 5.4 전환 (effectiveFrom 내일/오늘)
  importRoutine(payload): void                      // 5.5 id/slotId 재발급
  resetWeek(weekStartMonday): void                  // 5.10 보고 있는 주 로그 제거
  hydrate(): Promise<void>                          // 앱 시작 시 load + 마이그레이션
}
```

- **옵티미스틱 저장(PRD 6.3·8.3)**: 칩 토글은 store를 즉시 갱신해 UI에 반영하고, `Repository.save`는 비동기로 수행한다. 저장 실패 시에만 토스트로 알린다.
- **불변 갱신(코딩 규약)**: 모든 액션은 기존 객체를 변형하지 않고 새 객체를 만든다. 특히 RoutineVersion은 append-only 불변(PRD 4.1)이므로 절대 in-place 수정하지 않는다.
- **selector 분리**: 홈은 "이번 주 진행률·스트릭·요일별 칩 상태"만 구독한다. 잦은 토글이 무관한 화면을 리렌더하지 않게 selector를 좁게 둔다.

---

## 7. 네비게이션 구조 (expo-router)

| 라우트 | 화면 | PRD 화면(6.2) |
|--------|------|---------------|
| `(tabs)/index` | 홈 (오늘/주간) | 홈 |
| `(tabs)/library` | 루틴 라이브러리 | 루틴 라이브러리 |
| `(tabs)/settings` | 설정 (백업·초기화) | 설정 |
| `editor/[routineId]` | 루틴 에디터 (생성/편집) | 루틴 에디터 |
| `import` | 가져오기 (코드·QR·딥링크 진입) | 가져오기 |

- **딥링크**: 스킴 `workouttracker://import?d=<인코딩문자열>`(PRD 7.1)을 expo-linking으로 등록하고, `import` 라우트로 직접 진입시킨다.
- **바텀시트(PRD 6.3)**: 활성 전환·공유·운동 추가 등은 화면 전환이 아니라 바텀시트로 띄운다(상단 라운드 20px, 드래그 핸들, 배경 딤).

---

## 8. 디자인 시스템 적용 (PRD 6.1)

PRD 6.1의 토큰을 `theme/tokens.ts`에 1:1로 옮기고, 모든 컴포넌트가 토큰만 참조하게 해 디자인 drift를 막는다.

- **색**: `--bg`, `--surface`, `--primary`(#3182F6 Toss Blue), `--primary-weak`, `--chip-idle-bg/fg`, `--fg` 계열 등. **칩 색 규칙(핵심)**: 미완료=무채색, 완료 시에만 Toss Blue 점등. 카테고리는 라벨 텍스트로 구분(색으로 구분하지 않음).
- **타이포**: 핵심 수치(스트릭·진행률·완료 개수)는 `--font-display`(32/Bold)로 크게, 숫자는 `tabular-nums`로 정렬(number-forward).
- **간격·라운드·그림자**: `--space-*`, `--radius-chip/card/sheet/full`, `--shadow-card/sheet`. 넉넉한 여백 원칙(외곽 패딩 20~24px).
- **단일 주 CTA**: 한 화면에 주 버튼 1개. 파랑 풀폭(높이 52~56px, radius 12px).
- **마이크로인터랙션(reanimated)**: 칩 체크 스케일 바운스(0.96→1.0), 완료 색 전환(150~200ms), 진행률 바 width 트윈.

---

## 9. 공유 직렬화 파이프라인 (PRD 7.1 개요)

단계 M4에서 상세화하되, 도메인 레이어(`domain/share.ts`)의 책임 경계만 여기서 고정한다.

```
내보내기: payload(템플릿만) → JSON.stringify → pako.deflate → base64url
가져오기: base64url → pako.inflate → JSON.parse → Zod 검증 → schemaVersion 확인 → id/slotId 재발급
```

- **페이로드 = 루틴 템플릿만**(완료 로그·내부 id·slotId·타임라인 제외, PRD D8.5·7.1).
- **호환성**: `payload.schemaVersion <= app.supportedSchemaVersion`이면 허용, 높으면 거부(PRD 7.2).
- **QR 폴백**: 딥링크 URL이 QR 단일 프레임 용량을 초과하면 QR 비활성화 후 코드 문자열로 폴백. 멀티 프레임 QR은 v1 제외(PRD D7·7.1).
- **보안**: 임포트 전 스키마 검증·크기 제한, 미리보기로 사용자 확인. 실행 코드 미포함(데이터만)(PRD 10.2 리스크).

---

## 10. 테스트 전략 (커버리지 80% 목표)

| 종류 | 도구 | 대상 | 단계 |
|------|------|------|------|
| 단위 | Jest | `domain/*` 순수 함수 (타임라인·진행률·스트릭·공유 직렬화·마이그레이션) | M1부터 전 단계 |
| 통합 | Jest + RNTL | store 액션 ↔ Repository, 컴포넌트 ↔ store | M2부터 |
| E2E | Maestro | 칩 체크→저장→갱신, 에디터→버전 생성, 공유 왕복 | M2·M3·M4 |

- **M1 필수 단위 테스트(PRD 9.3·10.2 리스크)**: (a)전환·(b)주중 편집·(c)휴식일 변경 후 **과거 불변**, (d)**오늘 편집·전환 후 오늘 값 불변**(D8.8), null 가드 3종에서 스트릭 통과·진행률 분모 제외 일치. 이 테스트는 버전/타임라인 로직 버그(제품 신뢰 붕괴 위험)를 막는 1차 방어선이다.
- **TDD 권고**: 도메인 코어는 PRD에 의사코드와 기대값(예: 5/8=63%)이 명시돼 있어 테스트 우선 작성이 자연스럽다.

---

## 11. 단계(Stage) 로드맵 요약

PRD 9.3 마일스톤을 단계로 매핑한다. 작업 강도는 매일 풀타임(하루 6~8시간) 기준이며, 일수는 단계별 스펙에서 day-by-day로 다시 분해한다(여기서는 개략 배정).

| 단계 | PRD 마일스톤 | 범위 | 의존 | 개략 일수 | 스펙 문서 |
|------|--------------|------|------|-----------|-----------|
| Stage 1 | M1 데이터 코어 | 데이터 모델·타임라인·진행률/스트릭·Repository·마이그레이션 골격 | 없음 | 3~4일 | `stage-1-data-core.md` |
| Stage 2 | M2 일일 체크 + 홈 | 5.1·5.2·5.6~5.10 + 6장 홈·디자인 토큰 | Stage 1 | 4~5일 | `stage-2-daily-check-home.md` |
| Stage 3 | M3 에디터 + 라이브러리 | 5.3·5.4 (버전 생성·활성 전환) | Stage 1, 2 | 4~5일 | `stage-3-editor-library.md` |
| Stage 4 | M4 공유·임포트 | 5.5·7.1~7.2 (코드·딥링크·QR 왕복) | Stage 1, 3 | 3~4일 | `stage-4-share-import.md` |
| Stage 5 | M5 다듬기 | 마이크로인터랙션·백업·마이그레이션 완성 | Stage 1~4 | 2~3일 | `stage-5-polish.md` |

> **총 개략 16~21일**(풀타임 기준). 각 단계 종료 조건은 PRD 9.3 마일스톤 종료 조건을 따르며, 단계별 스펙에서 측정 가능한 형태로 구체화한다. Stage 1은 모든 단계의 토대이므로 단위 테스트 통과를 엄격히 게이트한다.

---

## 부록. 단계별 스펙이 공통으로 지켜야 할 규칙

1. **PRD 단일 출처 준수**: 데이터 스키마·계산식·AC 번호는 PRD를 그대로 인용한다. 스키마 drift 금지(PRD 4.1).
2. **D8 불변식 보호**: 어떤 단계의 어떤 기능도 "오늘·과거의 활성 버전을 당일에 바꾸는" 동작을 만들지 않는다(D8.8).
3. **레이어 의존 방향**: UI → 상태 → 도메인 → 저장. 역방향·건너뛰기 금지.
4. **불변 갱신**: 모든 상태 변경은 새 객체 생성(코딩 규약). RoutineVersion append-only.
5. **디자인 토큰만 참조**: 색·간격을 하드코딩하지 않고 `theme/tokens.ts`를 참조.
6. **테스트 동반**: 각 단계 종료 조건은 측정 가능한 테스트로 검증한다(커버리지 80% 목표).
