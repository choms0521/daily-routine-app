/**
 * Home "applies tomorrow" banner (spec stage-3 §5.2). Shown when a switch or an active-routine
 * edit created a future-dated activation (effectiveFrom > today). Today still shows the
 * currently-applied plan (D8.8); this banner tells the user what changes tomorrow.
 */
import { Text, View } from 'react-native';

import { subjectParticle } from '@/domain/korean';
import { useTheme } from '@/theme/ThemeProvider';

export interface HomeBannerProps {
  routineName: string;
}

export function HomeBanner({ routineName }: HomeBannerProps) {
  const { color, font, space, radius } = useTheme();
  return (
    <View
      testID="home-banner"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.s2,
        backgroundColor: color.primaryWeak,
        borderRadius: radius.card,
        paddingHorizontal: space.s4,
        paddingVertical: space.s3,
      }}>
      <View style={{ width: 6, height: 6, borderRadius: 999, backgroundColor: color.primary }} />
      <Text style={{ color: color.primary, fontSize: font.body.size, flexShrink: 1 }}>
        {`내일부터 '${routineName}'${subjectParticle(routineName)} 적용됩니다.`}
      </Text>
    </View>
  );
}
