/**
 * BadgeItem (spec a3 §3/§4): one milestone badge. Display-only — it renders the BadgeStatus the
 * selector produced and never recomputes earned/progress. Earned badges light up Toss Blue
 * (color.primary emphasis on a primaryWeak surface); unearned badges are achromatic
 * (color.chipIdleBg surface, color.chipIdleFg text) and carry a progress gauge that reuses
 * BarRow's bar language (chipIdleBg track, primary fill, radius.full). Tokens only — no hardcoded
 * colors. The gauge fill width clamps the raw current/target ratio to 0..100%.
 */
import { Text, View } from 'react-native';

import type { BadgeStatus } from '@/domain/badges';
import { MedalIcon } from '@/components/ui/icons';
import { useTheme } from '@/theme/ThemeProvider';

export interface BadgeItemProps {
  badge: BadgeStatus;
}

/** current/target as a 0..100 whole-percent, clamped so an over-target value never exceeds 100. */
function gaugePct(current: number, target: number): number {
  if (target <= 0) return 100;
  return Math.min(100, Math.round((current / target) * 100));
}

export function BadgeItem({ badge }: BadgeItemProps) {
  const { color, font, space, radius } = useTheme();
  const { earned, label, description, progress } = badge;

  const surface = earned ? color.primaryWeak : color.chipIdleBg;
  const iconColor = earned ? color.primary : color.chipIdleFg;
  const labelColor = earned ? color.primary : color.fg;

  return (
    <View
      testID={`badge-item-${badge.id}`}
      accessibilityState={{ selected: earned }}
      style={{
        flex: 1,
        gap: space.s2,
        padding: space.s3,
        borderRadius: radius.card,
        backgroundColor: surface,
      }}>
      <MedalIcon color={iconColor} size={28} />
      <Text style={{ color: labelColor, fontSize: font.body.size, fontWeight: '600' }} numberOfLines={1}>
        {label}
      </Text>
      <Text style={{ color: color.fgMuted, fontSize: font.caption.size }} numberOfLines={2}>
        {description}
      </Text>

      {earned ? (
        <Text
          testID={`badge-earned-${badge.id}`}
          style={{ color: color.primary, fontSize: font.caption.size, fontWeight: '600' }}>
          획득 완료
        </Text>
      ) : (
        <View style={{ gap: space.s1 }}>
          <Text
            testID={`badge-progress-${badge.id}`}
            style={{
              color: color.chipIdleFg,
              fontSize: font.caption.size,
              fontVariant: font.numeric.fontVariant,
            }}>
            {`${progress.current} / ${progress.target}`}
          </Text>
          <View
            style={{
              height: 6,
              backgroundColor: color.border,
              borderRadius: radius.full,
              overflow: 'hidden',
            }}>
            <View
              testID={`badge-gauge-fill-${badge.id}`}
              style={{
                height: '100%',
                width: `${gaugePct(progress.current, progress.target)}%`,
                backgroundColor: color.primary,
                borderRadius: radius.full,
              }}
            />
          </View>
        </View>
      )}
    </View>
  );
}
