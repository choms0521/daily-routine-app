# A1 — 히스토리 히트맵·캘린더 설계서

> 문서 종류: 큰 그림 설계서 (docs/spec)
> 작성일: 2026-06-26
> 상위 출처: `docs/prd/2026-06-26/feature-discovery-idea-pool.md` (A1), `docs/spec/2026-06-26/00-overview.md` (공유 계약)

---

## 0. 개요

| 항목 | 내용 |
|------|------|
| 목표 | 이미 쌓인 `completionLogs`를 월간 캘린더와 연간 잔디 히트맵으로 시각화하여 장기 수행 추이를 한눈에 보여준다 |
| 범위(in) | 월간 캘린더(요일 그리드, 칸 색으로 수행 상태 표시), 월 이동, 연간 히트맵(요약 한 줄), 칸 탭 시 그날 요약 표시 |
| 범위(out) | 과거 소급 체크·편집(아이디어 풀 C3, 본 범위 밖), 수치 통계(C2), 주간 회고 카드(B3), 데이터 내보내기 |
| 의존 | `domain/insights.ts`(`dayStatus`/`historyRange`, 개요 §2), `domain/date.ts`(`weekDays`/`weekStartOf`/`addDays`/`weekdayOf`), `theme/tokens.ts` |
| 산출물 | 신규 컴포넌트(캘린더·히트맵), 기록 탭의 A1 섹션. 신규 도메인 함수는 없음(공유 `insights.ts` 재사용) |

홈은 변경하지 않는다(개요 §3). A1은 기록 탭의 두 번째 섹션이다.

---

## 1. 데이터·도메인 설계

- **신규 도메인 함수 없음.** 개요 §2에서 고정한 `dayStatus(state, date)`와 `historyRange(state, fromDate, toDate)`만 사용한다.
- `dayStatus`의 5분류(`complete`/`partial`/`empty`/`rest`/`none`)가 칸 색의 단일 입력이다. 화면은 분류를 색으로 매핑만 한다(계산 없음).
- 월간 뷰는 그 달의 1일이 속한 주의 월요일부터 말일이 속한 주의 일요일까지를 `historyRange`로 받아 7열 그리드에 배치한다.
- 연간 히트맵은 최근 약 1년 구간을 `historyRange`로 받아 주 단위 열 × 요일 행으로 배치한다.
- **스키마 변경 없음** — read-only 파생.

> 분모·분류 경계의 구체 기대 수치와 fixture는 `docs/development/`로 보낸다(spec/development 경계).

---

## 2. 상태·셀렉터

- store 변경 없음. 기록 탭 화면이 `useAppStore((s) => s.state)`와 `todayKey()`를 읽어 `historyRange`에 넘긴다.
- 얇은 셀렉터를 둘 수 있다: `selectMonthGrid(state, monthAnchor)`, `selectYearHeatmap(state, today)` — 둘 다 `insights.ts` 결과를 화면 모델로 다듬는 수준(재계산 금지).
- 성능: 연간(약 365개) `historyRange`는 화면에서 `useMemo`로 감싸 월/연 전환 시에만 재계산한다.

---

## 3. 화면·컴포넌트 구조

```
app/(tabs)/insights.tsx          # 기록 탭 (개요 §3) — A1 섹션을 두 번째로 배치
└─ components/insights/
   ├─ HistorySection.tsx         # A1 섹션 컨테이너 (월/연 토글, 월 이동)
   ├─ MonthCalendar.tsx          # 7열 × 주 그리드. 칸 = DayCell
   ├─ DayCell.tsx                # dayStatus → 토큰 색 매핑된 한 칸 (탭 시 그날 요약)
   └─ YearHeatmap.tsx            # 주 열 × 요일 행 잔디 (요약 보기)
```

- `MonthCalendar`/`YearHeatmap`은 표시 전용. 입력은 `DayStatusEntry[]`와 콜백뿐이며 도메인을 직접 호출하지 않는다.
- 렌더 방식: 월간은 `View` 7열 그리드(접근성·탭 처리 단순), 연간 히트맵은 칸 수가 많으므로 `react-native-svg`의 `Rect` 그리드 권고(이미 의존성 보유).

---

## 4. 디자인 토큰 적용

칸 색은 `dayStatus` → 토큰 매핑으로만 정한다(하드코딩 금지):

| status | 색 토큰 | 의미 |
|--------|---------|------|
| `complete` | `color.primary` | 그날 완료 |
| `partial` | `color.primaryWeak` | 일부 수행 |
| `empty` | `color.chipIdleBg` | 활동일이나 미수행 |
| `rest` | `color.surface` + `color.border` 점 | 휴식일(중립) |
| `none` | 투명/미표시 | 루틴 없던 날 |

- "오늘" 칸은 `color.primary` 외곽선으로 표시. 라운드는 `radius.chip`.
- 칩 색 규칙(완료=점등, 미완료=무채색, PRD 6.1)과 동일 언어를 따른다.

---

## 5. 테스트 방향

- 도메인: `dayStatus` 5분류 경계(완료/부분/빈/휴식/없음), `historyRange` 구간·정렬·경계일.
- 컴포넌트: 상태별 칸 색 매핑, 오늘 강조, 빈 데이터(초기 사용자) 표시.

> 구체 fixture·기대 색·실행 명령은 `docs/development/`로 파생.

---

## 6. 미해결·리스크

- **성능**: 연간 히트맵 약 365칸 렌더. svg `Rect` 그리드 + `useMemo`로 완화. 큰 로그에서 프레임 점검은 development의 측정 항목.
- **빈 상태**: 기록이 거의 없는 초기 사용자에게 빈 그리드만 보이지 않도록 안내 문구 필요.
- **A1·C2 표면 공유**: 둘 다 기록 탭에 있으므로 스크롤 길이·섹션 구분 디자인을 B3/A3와 함께 조율(개요 §3 순서 고정).
