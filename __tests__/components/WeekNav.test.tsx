/**
 * WeekNav (Day 2): the next-week button is disabled on the current week (AC-5.8.1) and
 * enabled on past weeks; taps fire the right callbacks.
 */
import { render, fireEvent } from '@testing-library/react-native';
import { WeekNav } from '@/components/home/WeekNav';

const noop = () => {};

describe('WeekNav', () => {
  it('disables the next-week button on the current week', async () => {
    const view = await render(
      <WeekNav isCurrentWeek weekLabel="6.22 – 6.28 · 이번 주" onPrev={noop} onNext={noop} />,
    );
    expect(view.getByTestId('next-week-btn')).toBeDisabled();
  });

  it('enables the next-week button on a past week', async () => {
    const view = await render(
      <WeekNav isCurrentWeek={false} weekLabel="6.15 – 6.21 · 지난 주" onPrev={noop} onNext={noop} />,
    );
    expect(view.getByTestId('next-week-btn')).toBeEnabled();
  });

  it('fires onPrev / onNext on tap', async () => {
    const onPrev = jest.fn();
    const onNext = jest.fn();
    const view = await render(
      <WeekNav isCurrentWeek={false} weekLabel="x" onPrev={onPrev} onNext={onNext} />,
    );
    await fireEvent.press(view.getByTestId('prev-week-btn'));
    await fireEvent.press(view.getByTestId('next-week-btn'));
    expect(onPrev).toHaveBeenCalledTimes(1);
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('does not fire onNext when disabled (current week)', async () => {
    const onNext = jest.fn();
    const view = await render(
      <WeekNav isCurrentWeek weekLabel="x" onPrev={noop} onNext={onNext} />,
    );
    fireEvent.press(view.getByTestId('next-week-btn'));
    expect(onNext).not.toHaveBeenCalled();
  });
});
