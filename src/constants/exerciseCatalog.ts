/**
 * Default exercise catalog (spec stage-3 §3.2). Static input-assist data for the
 * exercise-add sheet: selecting an item pre-fills the name and a suggested set string.
 * It is NOT part of AppState and leaves no reference in the saved version — a catalog pick
 * and a custom entry both commit to the same ExerciseSlot{ name, sets }.
 */
import type { Category } from '@/types/schema';

export interface CatalogItem {
  name: string;
  category: Category;
  defaultSets: string;
}

export const EXERCISE_CATALOG: readonly CatalogItem[] = [
  // 유산소
  { name: '러닝', category: 'aerobic', defaultSets: '30분' },
  { name: '걷기', category: 'aerobic', defaultSets: '30분' },
  { name: '사이클', category: 'aerobic', defaultSets: '40분' },
  { name: '수영', category: 'aerobic', defaultSets: '30분' },
  { name: '줄넘기', category: 'aerobic', defaultSets: '10분' },
  { name: '인터벌 러닝', category: 'aerobic', defaultSets: '20분' },
  { name: '등산', category: 'aerobic', defaultSets: '60분' },
  { name: '요가', category: 'aerobic', defaultSets: '30분' },
  // 무산소
  { name: '푸시업', category: 'anaerobic', defaultSets: '4 × 12' },
  { name: '스쿼트', category: 'anaerobic', defaultSets: '4 × 12' },
  { name: '런지', category: 'anaerobic', defaultSets: '3 × 12' },
  { name: '플랭크', category: 'anaerobic', defaultSets: '3 × 40초' },
  { name: '턱걸이', category: 'anaerobic', defaultSets: '4세트' },
  { name: '데드리프트', category: 'anaerobic', defaultSets: '5 × 5' },
  { name: '벤치프레스', category: 'anaerobic', defaultSets: '5 × 5' },
  { name: '덤벨 로우', category: 'anaerobic', defaultSets: '3세트' },
];

/** Catalog items of one category (editor sections request by the active category). */
export function catalogFor(category: Category): readonly CatalogItem[] {
  return EXERCISE_CATALOG.filter((item) => item.category === category);
}
