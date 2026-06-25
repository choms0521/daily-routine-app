# dailyroutine

개인용 운동 트래커 앱. 사용자가 만든 주간 운동 루틴을 매일 체크하고, 주간 진행률과 연속 달성(스트릭)을 추적하며, 루틴을 코드·링크·QR로 공유한다.

React Native + Expo 기반이며, Toss 라이트 톤의 디자인을 따른다.

## 기술 스택

- React Native / Expo (expo-router 기반 파일 라우팅)
- 상태관리: Zustand
- 로컬 저장: AsyncStorage
- 검증: Zod
- 애니메이션: react-native-reanimated
- 테스트: Jest + @testing-library/react-native

## 시작하기

1. 의존성 설치

   ```bash
   npm install
   ```

2. 개발 서버 실행

   ```bash
   npm start
   ```

   플랫폼별 실행:

   ```bash
   npm run ios       # iOS 시뮬레이터
   npm run android   # Android 에뮬레이터
   npm run web       # 웹
   ```

## 검증

```bash
npm test              # 단위·통합 테스트
npm run test:coverage # 커버리지 포함
npm run typecheck     # 타입 검사 (tsc --noEmit)
npm run lint          # ESLint
```

## 문서

설계·기획 문서는 `docs/` 아래에 역할별로 나누어 둔다.

- `docs/prd/` — 기획서(PRD): 무엇을·왜 만드는가
- `docs/spec/` — 설계서: 아키텍처·데이터 모델·화면 구조
- `docs/development/` — 개발계획서: day-by-day 실행 계획과 테스트

각 문서는 역할 폴더 아래에 작성일 날짜 폴더(`YYYY-MM-DD`)를 만들고 그 안에 둔다: `docs/<역할>/<YYYY-MM-DD>/<문서>.md` (예: `docs/prd/2026-06-23/workout-tracker-prd.md`). 자세한 규약은 `CLAUDE.md`를 참고한다.
