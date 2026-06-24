/**
 * PRD 6.1 design-token fidelity (Day 1 end condition #9): every color/typography/space/
 * radius/shadow value matches the PRD 1:1, with zero mismatch. This locks the tokens
 * against drift since the PRD is the single source of truth.
 */
import { color, font, radius, shadow, space } from '@/theme/tokens';

describe('PRD 6.1 color tokens', () => {
  it('maps every color value 1:1', () => {
    expect(color).toEqual({
      bg: '#FFFFFF',
      surface: '#F9FAFB',
      surfaceElevated: '#FFFFFF',
      primary: '#3182F6',
      primaryWeak: '#E8F1FF',
      primaryPressed: '#1B64DA',
      chipIdleBg: '#F2F4F6',
      chipIdleFg: '#4E5968',
      fg: '#191F28',
      fgMuted: '#8B95A1',
      fgSubtle: '#B0B8C1',
      border: '#E5E8EB',
      success: '#08A05C',
      warn: '#FF9500',
      danger: '#F04452',
    });
  });

  it('encodes the chip color rule: achromatic idle, Toss Blue when complete', () => {
    expect(color.chipIdleBg).toBe('#F2F4F6');
    expect(color.chipIdleFg).toBe('#4E5968');
    expect(color.primaryWeak).toBe('#E8F1FF');
    expect(color.primary).toBe('#3182F6');
  });
});

describe('PRD 6.1 typography / spacing / radius / shadow tokens', () => {
  it('maps typography sizes and weights', () => {
    expect(font.display).toEqual({ size: 32, weight: '700' });
    expect(font.title).toEqual({ size: 22, weight: '700' });
    expect(font.subtitle).toEqual({ size: 18, weight: '600' });
    expect(font.body).toEqual({ size: 15, weight: '400' });
    expect(font.caption).toEqual({ size: 13, weight: '400' });
    expect(font.numeric.fontVariant).toEqual(['tabular-nums']);
  });

  it('maps the space and radius scales', () => {
    expect(space).toEqual({ s1: 4, s2: 8, s3: 12, s4: 16, s5: 24, s6: 32 });
    expect(radius).toEqual({ chip: 10, card: 16, sheet: 20, full: 999 });
  });

  it('maps the card and sheet shadows', () => {
    expect(shadow.card.shadowOffset).toEqual({ width: 0, height: 1 });
    expect(shadow.card.shadowOpacity).toBe(0.06);
    expect(shadow.card.shadowRadius).toBe(3);
    expect(shadow.sheet.shadowOffset).toEqual({ width: 0, height: -4 });
    expect(shadow.sheet.shadowOpacity).toBe(0.12);
    expect(shadow.sheet.shadowRadius).toBe(24);
  });
});
