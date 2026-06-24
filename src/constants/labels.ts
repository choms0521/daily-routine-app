/** Display labels for weekdays and categories (single source for UI text). */
import type { Category, Weekday } from '@/types/schema';

export const WEEKDAY_LABELS: Record<Weekday, string> = {
  mon: '월',
  tue: '화',
  wed: '수',
  thu: '목',
  fri: '금',
  sat: '토',
  sun: '일',
};

export const CATEGORY_LABELS: Record<Category, string> = {
  aerobic: '유산소',
  anaerobic: '무산소',
};
