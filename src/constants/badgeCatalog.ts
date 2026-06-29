/**
 * Milestone badge catalog (spec a3 §1, dev doc §2.1). Data-only: each entry pairs a behavior
 * metric ('total' = total completed days, 'streak' = longest streak) with a target threshold and
 * the display copy. domain/badges.ts applies the live metric value to each entry to derive
 * earned/progress, so thresholds live here (catalog data) and judgment lives there (pure derivation).
 *
 * Initial thresholds are intentionally conservative (spec a3 §6 카탈로그 균형); they can be tuned
 * by editing this table alone — no code change in domain/badges.ts.
 */

/** Which behavior metric a badge is measured against. */
export type BadgeMetric = 'total' | 'streak';

export interface BadgeCatalogEntry {
  id: string; // catalog key, stable
  metric: BadgeMetric; // 'total' = total completed days, 'streak' = longest streak
  target: number; // threshold the metric must reach to earn the badge
  label: string; // display name (표시명)
  description: string; // earn-condition copy
}

export const BADGE_CATALOG: readonly BadgeCatalogEntry[] = [
  { id: 'first-complete', metric: 'total', target: 1, label: '첫 완료', description: '하루를 완전히 완료했습니다' },
  { id: 'total-10', metric: 'total', target: 10, label: '완료 10일', description: '완료한 날이 10일에 도달했습니다' },
  { id: 'total-50', metric: 'total', target: 50, label: '완료 50일', description: '완료한 날이 50일에 도달했습니다' },
  { id: 'total-100', metric: 'total', target: 100, label: '완료 100일', description: '완료한 날이 100일에 도달했습니다' },
  { id: 'streak-7', metric: 'streak', target: 7, label: '7일 연속', description: '7일 연속으로 완료했습니다' },
  { id: 'streak-30', metric: 'streak', target: 30, label: '30일 연속', description: '30일 연속으로 완료했습니다' },
];
