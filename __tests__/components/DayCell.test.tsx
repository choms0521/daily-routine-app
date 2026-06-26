/**
 * DayCell (Stage 1, dev doc §EC3): status -> token color mapping. DayCell is static (no
 * reanimated), so the background is the literal token hex. Covers all five buckets plus
 * the today outline and the rest dot.
 */
import { render } from '@testing-library/react-native';

import { DayCell } from '@/components/insights/DayCell';
import { color } from '@/theme/tokens';

describe('DayCell color mapping', () => {
  it('uses color.primary when complete', async () => {
    const view = await render(<DayCell status="complete" testID="cell" />);
    expect(view.getByTestId('cell')).toHaveStyle({ backgroundColor: color.primary });
  });

  it('uses color.primaryWeak when partial', async () => {
    const view = await render(<DayCell status="partial" testID="cell" />);
    expect(view.getByTestId('cell')).toHaveStyle({ backgroundColor: color.primaryWeak });
  });

  it('uses color.chipIdleBg when empty', async () => {
    const view = await render(<DayCell status="empty" testID="cell" />);
    expect(view.getByTestId('cell')).toHaveStyle({ backgroundColor: color.chipIdleBg });
  });

  it('uses color.surface with a border dot when rest', async () => {
    const view = await render(<DayCell status="rest" testID="cell" />);
    expect(view.getByTestId('cell')).toHaveStyle({ backgroundColor: color.surface });
    expect(view.getByTestId('cell-rest-dot')).toBeTruthy();
  });

  it('is transparent (not shown) when none', async () => {
    const view = await render(<DayCell status="none" testID="cell" />);
    expect(view.getByTestId('cell')).toHaveStyle({ backgroundColor: 'transparent' });
  });

  it('draws a primary outline on the today cell', async () => {
    const view = await render(<DayCell status="empty" isToday testID="cell" />);
    expect(view.getByTestId('cell')).toHaveStyle({ borderWidth: 2, borderColor: color.primary });
  });
});
