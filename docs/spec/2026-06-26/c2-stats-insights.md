# C2 — 통계 인사이트 설계서

> 문서 종류: 큰 그림 설계서 (docs/spec)
> 작성일: 2026-06-26
> 상위 출처: `docs/prd/2026-06-26/feature-discovery-idea-pool.md` (C2), `docs/spec/2026-06-26/00-overview.md` (공유 계약)

---

## 0. 개요

| 항목 | 내용 |
|------|------|
| 목표 | `completionLogs`를 집계해 요일별 수행률·운동별 준수율·주간 추세를 수치로 보여준다 |
| 범위(in) | 요일별 수행률 막대, 운동별(이름 기준) 준수율 정렬 목록, 주간 완료율 추세, 집계 구간 선택(예: 최근 N주) |
| 범위(out) | 캘린더 시각화(A1), 주간 회고 카드(B3), 무게·볼륨 통계(세트가 자유 문자열이라 v1 불가), 목표 설정 |
| 의존 | `domain/insights.ts`(`weekdayRate`/`exerciseRate`/`weeklyTrend`, 개요 §2), `domain/date.ts` |
| 산출물 | 신규 컴포넌트(통계 섹션·막대), 기록 탭의 C2 섹션. 신규 도메인 함수 없음(공유 `insights.ts` 재사용) |

C2는 기록 탭의 세 번째 섹션이다(개요 §3).

---

## 1. 데이터·도메인 설계

- **신규 도메인 함수 없음.** 개요 §2의 `weekdayRate`/`exerciseRate`/`weeklyTrend`를 사용한다.
- 분모 원칙은 `weekProgress`와 정합한다 — 활동일 × 슬롯 보유 카테고리만 분모로 센다(rest·빈·미활성 제외).
- **운동 이름 join 규칙(설계 결정)**: `exerciseRate`는 슬롯 단위 체크(`DayLog.checks`)를 운동 이름으로 묶어 합산한다. 버전이 달라도 동일 이름은 같은 운동으로 본다(표시 목적의 느슨한 join). 이름 변경·동명 이운동의 정밀 식별은 v1 범위 밖.
- **스키마 변경 없음** — read-only 파생.

> 집계 구체 수치·정렬 타이브레이크·fixture는 `docs/development/`로 보낸다.

---

## 2. 상태·셀렉터

- store 변경 없음. 화면이 `state`와 구간(`fromDate`/`toDate` 또는 주 수)을 `insights.ts`에 넘긴다.
- 구간 선택 상태(예: 최근 4주 / 12주)는 화면 로컬 `useState`로 충분하다(저장 불필요).
- 큰 구간 집계는 `useMemo`로 구간·상태 변경 시에만 재계산한다.

---

## 3. 화면·컴포넌트 구조

```
app/(tabs)/insights.tsx          # 기록 탭 — C2 섹션을 세 번째로 배치
└─ components/insights/
   ├─ StatsSection.tsx           # C2 섹션 컨테이너 (구간 토글)
   ├─ BarRow.tsx                 # 라벨 + 비율 막대 + "done/total · pct%" (요일·운동 공용)
   └─ TrendBars.tsx              # 주간 추세 막대 (또는 스파크라인)
```

- `BarRow`는 요일별·운동별 목록 양쪽에서 재사용한다(입력: 라벨, `{done,total,pct}`).
- 막대는 `View` width 퍼센트로 그린다. 추세는 막대 다수면 `react-native-svg` 권고.

---

## 4. 디자인 토큰 적용

- 막대 채움 `color.primary`, 트랙 `color.chipIdleBg`, 라운드 `radius.full`(ProgressBar와 동일 언어).
- 수치는 `font.numeric.fontVariant`(tabular-nums)로 정렬. 보조 라벨 `color.fgMuted`.
- 섹션 제목 `font.subtitle`. 카드 컨테이너는 `Card` 프리미티브 재사용.

---

## 5. 테스트 방향

- 도메인: `weekdayRate`/`exerciseRate`/`weeklyTrend` 집계 정확성, 정렬, 빈 구간, 이름 join 합산.
- 컴포넌트: 막대 비율 표시, 빈 데이터 안내, 구간 토글 전환.

> 구체 fixture·기대 수치·실행 명령은 `docs/development/`로 파생.

---

## 6. 미해결·리스크

- **이름 join 모호성**: 동명 운동 합산이 사용자 기대와 다를 수 있음. v1은 느슨한 이름 join으로 고정하고 한계를 UI 카피로 보완.
- **성능**: 긴 구간 + 많은 운동 집계 시 `useMemo` 필수. 측정은 development.
- **A1과 표면 공유**: 같은 `completionLogs`를 읽으므로 `insights.ts`를 단일 출처로 두어 중복 집계 금지(개요 §2).
