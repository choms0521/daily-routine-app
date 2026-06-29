/**
 * Year heatmap (spec a1 §3, §6). A grass grid of ~1 year: week columns × weekday rows,
 * drawn with react-native-svg Rect (already a dependency) because the cell count (~365) is
 * too high for one View per cell. Display-only: input is a DayStatusEntry[] starting on a
 * Monday; status maps to a token fill, 'none' is skipped (no rect). No domain calls here.
 */
import Svg, { Rect } from 'react-native-svg';

import type { DayStatus, DayStatusEntry } from '@/domain/insights';
import { useTheme } from '@/theme/ThemeProvider';
import type { Tokens } from '@/theme/tokens';

export interface YearHeatmapProps {
  entries: DayStatusEntry[]; // ascending, starting on a Monday
  cell?: number;
  gap?: number;
}

/** status -> fill token, or null for 'none' (cell omitted). Mirrors DayCell (spec a1 §4). */
function fillFor(status: DayStatus, color: Tokens['color']): string | null {
  switch (status) {
    case 'complete':
      return color.primary;
    case 'partial':
      return color.primaryWeak;
    case 'empty':
      return color.chipIdleBg;
    case 'rest':
      return color.surface;
    case 'none':
      return null;
  }
}

export function YearHeatmap({ entries, cell = 10, gap = 2 }: YearHeatmapProps) {
  const { color, radius } = useTheme();
  const step = cell + gap;
  const weeks = Math.ceil(entries.length / 7);
  const width = weeks * step - gap;
  const height = 7 * step - gap;
  return (
    <Svg width={width} height={height} testID="year-heatmap">
      {entries.map((entry, i) => {
        const fill = fillFor(entry.status, color);
        if (fill === null) return null; // 'none' day: omit the rect
        const week = Math.floor(i / 7);
        const weekday = i % 7;
        return (
          <Rect
            key={entry.date}
            x={week * step}
            y={weekday * step}
            width={cell}
            height={cell}
            rx={radius.chip / 4}
            fill={fill}
          />
        );
      })}
    </Svg>
  );
}
