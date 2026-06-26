/**
 * BadgeGrid (spec a3 §3, the A3 surface at the bottom of the 기록 tab). Display-only: it lays out
 * the sorted BadgeStatus[] the selector produced (earned → in-progress → unearned) and never
 * recomputes a badge. A Card wrapper + "배지" title matches the other 기록 sections; the items
 * flow in a two-per-row grid via flexWrap with a fixed two-column basis. Tokens only.
 */
import { Text, View } from 'react-native';

import { BadgeItem } from '@/components/badges/BadgeItem';
import { Card } from '@/components/ui/Card';
import type { BadgeStatus } from '@/domain/badges';
import { useTheme } from '@/theme/ThemeProvider';

export interface BadgeGridProps {
  badges: BadgeStatus[];
}

export function BadgeGrid({ badges }: BadgeGridProps) {
  const { color, font, space } = useTheme();

  return (
    <Card style={{ gap: space.s4 }}>
      <Text
        testID="badge-grid"
        style={{ color: color.fg, fontSize: font.subtitle.size, fontWeight: font.subtitle.weight }}>
        배지
      </Text>

      {/* earnedBadges always returns the full catalog, so the grid is never empty (no empty state). */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.s3 }}>
        {badges.map((badge) => (
          // basis just under 50% so two items fit per row once the row gap is subtracted.
          <View key={badge.id} style={{ flexBasis: '47%', flexGrow: 1 }}>
            <BadgeItem badge={badge} />
          </View>
        ))}
      </View>
    </Card>
  );
}
