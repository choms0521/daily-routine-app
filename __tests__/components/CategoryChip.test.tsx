/**
 * CategoryChip (Day 3): color encodes completion (achromatic idle, Toss Blue done) with
 * no category color difference; label distinguishes category; chip vs chevron callbacks.
 */
import { render, fireEvent } from '@testing-library/react-native';
import { CategoryChip } from '@/components/chip/CategoryChip';

const noop = () => {};

describe('CategoryChip', () => {
  it('is achromatic when idle (#F2F4F6)', async () => {
    const view = await render(
      <CategoryChip category="aerobic" isDone={false} expanded={false} onToggle={noop} onExpand={noop} />,
    );
    expect(view.getByTestId('chip-aerobic')).toHaveStyle({ backgroundColor: '#F2F4F6' });
  });

  it('lights up Toss Blue when done (#E8F1FF)', async () => {
    const view = await render(
      <CategoryChip category="aerobic" isDone expanded={false} onToggle={noop} onExpand={noop} />,
    );
    expect(view.getByTestId('chip-aerobic')).toHaveStyle({ backgroundColor: '#E8F1FF' });
  });

  it('uses the same done color for anaerobic (no category color difference)', async () => {
    const view = await render(
      <CategoryChip category="anaerobic" isDone expanded={false} onToggle={noop} onExpand={noop} />,
    );
    expect(view.getByTestId('chip-anaerobic')).toHaveStyle({ backgroundColor: '#E8F1FF' });
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
  });
});
