/**
 * CategoryChip (Day 3): color encodes completion (achromatic idle, Toss Blue done) with
 * no category color difference; label distinguishes category; chip vs chevron callbacks.
 *
 * Stage 5 (PRD 6.3): the idle↔done background now tweens via reanimated interpolateColor,
 * which emits a token's hex as its rgba equivalent (#F2F4F6 → rgba(242, 244, 246, 1),
 * #E8F1FF → rgba(232, 241, 255, 1)). The asserted rgba values are exact equivalents of the
 * chipIdleBg/primaryWeak tokens (still verified as hex in theme/tokens.test).
 */
import { render, fireEvent } from '@testing-library/react-native';
import { CategoryChip } from '@/components/chip/CategoryChip';

const noop = () => {};

describe('CategoryChip', () => {
  it('is achromatic when idle (#F2F4F6)', async () => {
    const view = await render(
      <CategoryChip category="aerobic" isDone={false} expanded={false} onToggle={noop} onExpand={noop} />,
    );
    expect(view.getByTestId('chip-aerobic')).toHaveStyle({ backgroundColor: 'rgba(242, 244, 246, 1)' });
  });

  it('lights up Toss Blue when done (#E8F1FF)', async () => {
    const view = await render(
      <CategoryChip category="aerobic" isDone expanded={false} onToggle={noop} onExpand={noop} />,
    );
    expect(view.getByTestId('chip-aerobic')).toHaveStyle({ backgroundColor: 'rgba(232, 241, 255, 1)' });
  });

  it('uses the same done color for anaerobic (no category color difference)', async () => {
    const view = await render(
      <CategoryChip category="anaerobic" isDone expanded={false} onToggle={noop} onExpand={noop} />,
    );
    expect(view.getByTestId('chip-anaerobic')).toHaveStyle({ backgroundColor: 'rgba(232, 241, 255, 1)' });
  });

  it('labels the category by text regardless of completion', async () => {
    const idle = await render(
      <CategoryChip category="aerobic" isDone={false} expanded={false} onToggle={noop} onExpand={noop} />,
    );
    expect(idle.getByText('유산소')).toBeTruthy();
    const done = await render(
      <CategoryChip category="anaerobic" isDone expanded={false} onToggle={noop} onExpand={noop} />,
    );
    expect(done.getByText('무산소')).toBeTruthy();
  });

  it('fires onToggle when the chip body is pressed', async () => {
    const onToggle = jest.fn();
    const view = await render(
      <CategoryChip category="aerobic" isDone={false} expanded={false} onToggle={onToggle} onExpand={noop} />,
    );
    await fireEvent.press(view.getByTestId('chip-aerobic'));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('fires onExpand (not onToggle) when the chevron is pressed', async () => {
    const onToggle = jest.fn();
    const onExpand = jest.fn();
    const view = await render(
      <CategoryChip category="aerobic" isDone={false} expanded={false} onToggle={onToggle} onExpand={onExpand} />,
    );
    await fireEvent.press(view.getByTestId('chip-aerobic-expand'));
    expect(onExpand).toHaveBeenCalledTimes(1);
    expect(onToggle).not.toHaveBeenCalled(); // chevron must not bubble to the chip toggle
  });
});
