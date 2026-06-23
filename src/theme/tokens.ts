/**
 * Design tokens — a 1:1 port of PRD 6.1. The PRD is the single source of truth for
 * these values; do not change them here (architecture appendix rules 1, 5). Components
 * reference tokens only and never hardcode colors/spacing.
 *
 * Chip color rule (PRD 5.1/6.1, the most-misread part): color encodes completion, not
 * category. Idle chips are achromatic (chipIdleBg/chipIdleFg) for both aerobic and
 * anaerobic; only a completed chip lights up Toss Blue (primaryWeak bg + primary fg).
 * Category is distinguished by the label text, never by color.
 */
import type { TextStyle, ViewStyle } from 'react-native';

export const color = {
  bg: '#FFFFFF',
  surface: '#F9FAFB',
  surfaceElevated: '#FFFFFF',
  primary: '#3182F6', // Toss Blue — CTA / emphasis / completed-chip light-up
  primaryWeak: '#E8F1FF', // selected state / completed-chip background
  primaryPressed: '#1B64DA',
  chipIdleBg: '#F2F4F6', // idle chip background (achromatic, both categories)
  chipIdleFg: '#4E5968', // idle chip text (achromatic)
  fg: '#191F28',
  fgMuted: '#8B95A1',
  fgSubtle: '#B0B8C1',
  border: '#E5E8EB',
  success: '#08A05C', // success toasts only — never a category color
  warn: '#FF9500',
  danger: '#F04452',
} as const;

type FontToken = { size: number; weight: TextStyle['fontWeight'] };

export const font: {
  display: FontToken;
  title: FontToken;
  subtitle: FontToken;
  body: FontToken;
  caption: FontToken;
  numeric: { fontVariant: NonNullable<TextStyle['fontVariant']> };
} = {
  display: { size: 32, weight: '700' }, // streak number / progress % — the protagonist
  title: { size: 22, weight: '700' },
  subtitle: { size: 18, weight: '600' },
  body: { size: 15, weight: '400' },
  caption: { size: 13, weight: '400' }, // set info / secondary labels
  numeric: { fontVariant: ['tabular-nums'] }, // fixed-width digits (number-forward)
};

export const space = { s1: 4, s2: 8, s3: 12, s4: 16, s5: 24, s6: 32 } as const;
export const radius = { chip: 10, card: 16, sheet: 20, full: 999 } as const;

// PRD 6.1: card = 0 1px 3px rgba(0,0,0,0.06); sheet = 0 -4px 24px rgba(0,0,0,0.12).
// Mapped to RN iOS shadow props + an Android elevation approximation.
export const shadow: { card: ViewStyle; sheet: ViewStyle } = {
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  sheet: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 12,
  },
};

export const tokens = { color, font, space, radius, shadow } as const;
export type Tokens = typeof tokens;
