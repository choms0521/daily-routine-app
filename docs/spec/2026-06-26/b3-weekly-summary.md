# B3 — 주간 요약 카드 설계서

> 문서 종류: 큰 그림 설계서 (docs/spec)
> 작성일: 2026-06-26
> 상위 출처: `docs/prd/2026-06-26/feature-discovery-idea-pool.md` (B3), `docs/spec/2026-06-26/00-overview.md` (공유 계약)

---

## 0. 개요

| 항목 | 내용 |
|------|------|
| 목표 | 한 주의 수행을 회고하는 요약 카드. 홈 헤더가 이미 보여주는 라이브 진행률·스트릭과 **구별되는** 회고 정보만 다룬다 |
| 범위(in) | 완료일 수, 활동일 수, 가장 잘/못 지킨 요일, 직전 주 대비 변화(델타), 한 줄 자연어 요약 |
| 범위(out) | 홈의 라이브 진행률 바·스트릭 중복(이미 존재), 그래프 차트(C2), 일별 캘린더(A1), 목표 설정 |
| 의존 | `domain/insights.ts`(`weekReview`, 개요 §2), `domain/progress`·`domain/streak`(weekReview 내부), `domain/korean`(조사 처리) |
| 산출물 | 신규 컴포넌트 `WeekReviewCard`, 얇은 셀렉터, 기록 탭의 B3 카드(최상단). 신규 도메인 함수 없음(공유 `insights.ts`의 `weekReview` 사용) |

**중복 금지(핵심)**: 홈은 이미 `ProgressBar`("5 / 8 · 63%")와 `StreakBadge`를 그린다. B3은 그 수치를 다시 그리지 않고, 홈에 없는 회고 정보(완료일 수·최다/최소 요일·전주 대비 변화·자연어 한 줄)만 표시한다. 배치는 기록 탭 최상단이다(개요 §3).

---

## 1. 데이터·도메인 설계

- **신규 도메인 함수 없음.** 개요 §2에서 `weekReview(state, weekStartMonday, today)`를 `insights.ts`에 고정했다. B3은 그 결과만 표시한다.
- `weekReview`는 내부에서 `weekProgress`·`streak`과 `insights`의 요일 집계를 조합한다(개요 §2 계약).
- 자연어 한 줄은 `weekReview` 결과를 받아 화면(또는 셀렉터)에서 포맷한다. 한국어 조사는 `domain/korean`의 `subjectParticle`/`instrumentalParticle`을 재사용한다.
- **스키마 변경 없음** — read-only 파생.

> "이번 주 5일 완료, 가장 잘 지킨 요일은 월요일, 지난주보다 12%p 높습니다" 같은 문장의 구체 템플릿·경계 수치는 `docs/development/`로 보낸다.

---

## 2. 상태·셀렉터

- store 변경 없음.
- 얇은 셀렉터 `selectWeekReview(state, weekStartMonday, today)`를 두어 `weekReview` 호출과 자연어 포맷을 한곳에 모은다(화면은 표시만).
- 기본 표시 대상 주는 "이번 주"(또는 직전 완료 주). 주 이동은 선택 기능.

---

## 3. 화면·컴포넌트 구조

```
app/(tabs)/insights.tsx          # 기록 탭 — B3 카드를 최상단으로 배치
└─ components/insights/
   └─ WeekReviewCard.tsx         # WeekReview + 자연어 한 줄을 표시하는 카드
```

- `WeekReviewCard`는 표시 전용. 입력은 셀렉터가 만든 화면 모델(`WeekReview` + 포맷 문자열)뿐.
- 컨테이너는 `Card` 프리미티브 재사용.

---

## 4. 디자인 토큰 적용

- 완료일 수 등 핵심 수치는 `font.display` + tabular-nums(number-forward, PRD 6.1).
- 델타(+/−)는 양수면 `color.success`, 음수면 `color.fgMuted`(색은 토큰만). 0/없음은 중립.
- 자연어 한 줄은 `font.body`, 보조 라벨 `color.fgMuted`.

---

## 5. 테스트 방향

- 도메인: `weekReview`의 `completedDays`/`activeDays`/`topWeekday`/`missedWeekday`/`deltaPct` 경계(빈 주, 직전 주 없음, 동률 요일).
- 표시: 자연어 포맷(조사 처리 포함), 델타 부호 색, 빈 주 안내.

> 구체 fixture·기대 문자열·실행 명령은 `docs/development/`로 파생.

---

## 6. 미해결·리스크

- **직전 주 데이터 없음**: `deltaPct === null` 처리(델타 미표시). 빈 주(`activeDays === 0`)도 별도 카피.
- **동률 요일**: `topWeekday`/`missedWeekday` 타이브레이크 규칙을 development에서 확정(예: 요일 순서 우선).
- **홈 중복 회귀 방지**: 향후 B3 항목을 홈으로 옮기자는 요구가 와도, 라이브 진행률·스트릭과 겹치는 항목은 추가하지 않는다(개요 §3).
