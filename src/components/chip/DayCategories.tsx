/**
 * The chips for one day: a CategoryChip per category that has at least one slot (AC-5.1.3),
 * with a locally-expandable ExerciseList. Tapping a chip toggles the whole category to the
 * opposite of its current done state; the chevron expands the per-exercise checks. Wiring
 * to the store actions is passed in by the home so this stays presentational.
 */
import { useState } from 'react';
import { View } from 'react-native';

import { CategoryChip } from '@/components/chip/CategoryChip';
import { ExerciseList } from '@/components/chip/ExerciseList';
import type { DayViewModel } from '@/store/selectors';
import { useTheme } from '@/theme/ThemeProvider';
import type { Category } from '@/types/schema';

const ORDER: readonly Category[] = ['aerobic', 'anaerobic'];

export type DayCategoriesProps = {
  vm: DayViewModel;
  onToggleCategory: (category: Category, value: boolean) => void;
  onCheck: (category: Category, slotId: string) => void;
};

export function DayCategories({ vm, onToggleCategory, onCheck }: DayCategoriesProps) {
  const { space } = useTheme();
  const [expanded, setExpanded] = useState<Record<Category, boolean>>({
    aerobic: false,
    anaerobic: false,
  });
  const plan = vm.plan;
  if (plan === null) return null;

  return (
    <View style={{ gap: space.s2 }}>
      {ORDER.map((category) => {
        const slots = plan[category];
        if (slots.length === 0) return null; // no chip when the category has no slots
        const isDone = category === 'aerobic' ? vm.aerobicDone : vm.anaerobicDone;
        return (
          <View key={category} style={{ gap: space.s1 }}>
            <CategoryChip
              category={category}
              isDone={isDone}
              expanded={expanded[category]}
              onToggle={() => onToggleCategory(category, !isDone)}
              onExpand={() => setExpanded((e) => ({ ...e, [category]: !e[category] }))}
            />
            {expanded[category] ? (
              <ExerciseList
                slots={slots}
                checks={vm.checks[category]}
                onCheck={(slotId) => onCheck(category, slotId)}
              />
            ) : null}
          </View>
        );
      })}
    </View>
  );
}
