/**
 * Line icons drawn with react-native-svg (already a dependency — no @expo/vector-icons /
 * expo-font needed). Stroke-based, 24px grid, currentColor via the `color` prop so the tab
 * bar's active/inactive tint flows straight through. Replaces the placeholder dot/square
 * tab glyphs.
 */
import Svg, { Path } from 'react-native-svg';

export type IconProps = { color: string; size?: number };

export function HomeIcon({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 10.6 12 3.5l9 7.1"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M5.5 9.4V19a1.5 1.5 0 0 0 1.5 1.5h10a1.5 1.5 0 0 0 1.5-1.5V9.4"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function DumbbellIcon({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6.5 8v8M3.5 10v4M17.5 8v8M20.5 10v4M6.5 12h11"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function FlameIcon({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3c.6 3-1.8 4.2-3 6-1 1.5-1.5 3-1.5 4.3A4.5 4.5 0 0 0 12 18a4.5 4.5 0 0 0 4.5-4.7c0-1-.3-1.9-.8-2.6-.4.7-1 1.1-1.7 1.1.9-2.4-.2-5.4-2-8.8Z"
        fill={color}
      />
    </Svg>
  );
}
