/**
 * ResetWeekButton (Day 5): confirms before resetting (AC-5.10.2), with this/past-week
 * wording, and only runs onConfirm when the destructive action is chosen.
 */
import { render, fireEvent } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { ResetWeekButton, resetConfirmMessage } from '@/components/home/ResetWeekButton';

type AlertButton = { text?: string; style?: string; onPress?: () => void };

describe('resetConfirmMessage', () => {
  it('names this week vs a past week', () => {
    expect(resetConfirmMessage(true)).toMatch(/이번 주를 초기화/);
    expect(resetConfirmMessage(false)).toMatch(/과거 주를 초기화/);
  });
});

describe('ResetWeekButton', () => {
  it('confirms first; the destructive action runs onConfirm (current week)', async () => {
    const spy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const onConfirm = jest.fn();
    const view = await render(<ResetWeekButton isCurrentWeek onConfirm={onConfirm} />);
    await fireEvent.press(view.getByTestId('reset-week-btn'));
    expect(spy).toHaveBeenCalledTimes(1);
    const message = spy.mock.calls[0][1] as string;
    const buttons = spy.mock.calls[0][2] as AlertButton[];
    expect(message).toMatch(/이번 주를 초기화/);
    expect(onConfirm).not.toHaveBeenCalled(); // not until confirmed
    buttons.find((b) => b.style === 'destructive')?.onPress?.();
    expect(onConfirm).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  it('uses past-week wording when not the current week (AC-5.10.2)', async () => {
    const spy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const view = await render(<ResetWeekButton isCurrentWeek={false} onConfirm={() => {}} />);
    await fireEvent.press(view.getByTestId('reset-week-btn'));
    expect(spy.mock.calls[0][1] as string).toMatch(/과거 주를 초기화/);
    spy.mockRestore();
  });
});
