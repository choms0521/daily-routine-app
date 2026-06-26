# A3 — 행동 마일스톤 배지 설계서

> 문서 종류: 큰 그림 설계서 (docs/spec)
> 작성일: 2026-06-26
> 상위 출처: `docs/prd/2026-06-26/feature-discovery-idea-pool.md` (A3), `docs/spec/2026-06-26/00-overview.md` (공유 계약)

---

## 0. 개요

| 항목 | 내용 |
|------|------|
| 목표 | 행동 지표(최장 스트릭·총 완료일·주간 목표 연속 등) 기반 마일스톤 배지를 부여·표시해 보상 피드백을 보강한다 |
| 범위(in) | 배지 카탈로그 정의, 획득/미획득 판정, 진행 중 배지의 진행도, 배지 그리드 표시 |
| 범위(out) | 무게 PR 배지(세트가 자유 문자열이라 v1 불가), 소셜 비교·랭킹(백엔드 필요, v2), 알림(B1) |
| 의존 | `domain/badges.ts`(신규), `domain/streak`·`domain/insights`(재사용), `constants/badgeCatalog.ts`(신규) |
| 산출물 | 신규 도메인 모듈·카탈로그, 신규 컴포넌트(배지 그리드), 기록 탭의 A3 섹션 |

A3은 기록 탭의 네 번째 섹션이다(개요 §3).

---

## 1. 데이터·도메인 설계

- **신규 도메인 모듈 `domain/badges.ts`** (순수). 배지 카탈로그를 입력 상태에 적용해 획득 여부·진행도를 산출한다.

```ts
// domain/badges.ts — 순수 파생 (기본: 스키마 변경 없음)
import type { AppState, DateKey } from '@/types/schema';

export interface BadgeStatus {
  id: string;            // 카탈로그 키
  label: string;         // 표시명
  description: string;   // 획득 조건 설명
  earned: boolean;
  progress: { current: number; target: number }; // 진행 중 배지의 게이지
}
export function earnedBadges(state: AppState, today: DateKey): BadgeStatus[];
```

- `domain/badges.ts`는 `streak`과 `insights`의 행동 지표(총 완료일 등)를 재사용해 판정한다(중복 집계 금지).
- **배지 카탈로그** `constants/badgeCatalog.ts`: 각 배지의 id·표시명·조건(임계값)·지표 종류를 데이터로 둔다. 예: 최장 스트릭 7/14/30일, 총 완료 10/50/100일, 주간 목표 연속 N주. 구체 임계 수치는 카탈로그 데이터로 두고, 경계 fixture는 development로.
- **스키마 변경 없음(기본)**: 배지는 매번 상태에서 파생한다. 저장하지 않는다.

### 선택적 확장 (플래그 — 기본 설계 미포함)

최초 획득 시 1회 축하 연출을 하려면 "이미 확인한 배지 id" 보존이 필요하다. 이 경우에만 스키마를 확장한다(예: `Settings` 또는 신규 필드에 `acknowledgedBadgeIds: string[]` + 마이그레이션). **기본 설계는 무저장**이며, 축하 연출은 이 확장을 채택할 때만 가능하다.

---

## 2. 상태·셀렉터

- 기본(무저장) 설계에서는 store 변경 없음. 화면이 `state`·`todayKey()`를 `earnedBadges`에 넘긴다.
- 얇은 셀렉터 `selectBadges(state, today)`로 정렬(획득 → 진행 중 → 미획득)만 다듬는다.

---

## 3. 화면·컴포넌트 구조

```
app/(tabs)/insights.tsx          # 기록 탭 — A3 섹션을 네 번째로 배치
└─ components/badges/
   ├─ BadgeGrid.tsx              # BadgeStatus[] 그리드
   └─ BadgeItem.tsx              # 한 배지: 아이콘 + 표시명 + (미획득 시 진행 게이지)
```

- 표시 전용. 입력은 `BadgeStatus[]`뿐.
- 축하 연출(선택 확장 채택 시)은 `react-native-reanimated`로 스케일 바운스(칩 인터랙션 언어 재사용).

---

## 4. 디자인 토큰 적용

- 획득 배지: `color.primary` 강조. 미획득: `color.chipIdleBg`/`color.chipIdleFg`(무채색).
- 진행 게이지는 `BarRow`/`ProgressBar`와 동일한 막대 언어(`color.primary` 채움, `radius.full`).
- 배지 아이콘은 `icons.tsx` 규약(`ColorValue`)을 따르는 svg.

---

## 5. 테스트 방향

- 도메인: 각 배지 임계 경계(획득/미획득 직전·직후), 진행도 계산, 카탈로그 전 항목 판정.
- 표시: 정렬, 진행 게이지, 빈/초기 상태.

> 구체 임계 fixture·기대 진행값·실행 명령은 `docs/development/`로 파생.

---

## 6. 미해결·리스크

- **무저장의 한계**: 기본 설계는 "새로 획득" 순간을 감지하지 못해 1회성 축하 연출이 어렵다. 축하가 필요하면 §1의 선택적 확장(스키마 + 마이그레이션)을 채택해야 한다 — 이는 "큰 모델 변화 없음" 전제에서 추가 결정 사항.
- **카탈로그 균형**: 임계값이 너무 쉬우면 보상감이 약하고 너무 어려우면 동기가 안 생긴다. 초기 카탈로그는 보수적으로 잡고 development에서 조정.
