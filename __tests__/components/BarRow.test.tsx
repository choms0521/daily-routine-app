/**
 * BarRow (Stage 2 C2, dev doc §EC4): the "{done} / {total} · {pct}%" readout and the fill
 * width. Display-only, so the fill width is the literal pct token. Uses the RNTL v14
 * async-render convention (await render).
 */
import { render } from '@testing-library/react-native';

import { BarRow } from '@/components/insights/BarRow';

describe('BarRow', () => {
  it('renders the label and the "done / total · pct%" readout exactly', async () => {
    const view = await render(<BarRow label="러닝 가볍게" done={1} total={2} pct={50} testID="bar" />);
    expect(view.getByText('러닝 가볍게')).toBeTruthy();
    expect(view.getByText('1 / 2 · 50%')).toBeTruthy();
  });

  it('sets the fill width to pct%', async () => {
    const view = await render(<BarRow label="월" done={1} total={2} pct={50} testID="bar" />);
    expect(view.getByTestId('bar-fill')).toHaveStyle({ width: '50%' });
  });

  it('renders a 0% empty bar without crashing', async () => {
    const view = await render(<BarRow label="덤벨 로우" done={0} total={1} pct={0} testID="bar" />);
    expect(view.getByText('0 / 1 · 0%')).toBeTruthy();
    expect(view.getByTestId('bar-fill')).toHaveStyle({ width: '0%' });
  });

  it('renders a full 100% bar', async () => {
    const view = await render(<BarRow label="푸시업" done={1} total={1} pct={100} testID="bar" />);
    expect(view.getByText('1 / 1 · 100%')).toBeTruthy();
    expect(view.getByTestId('bar-fill')).toHaveStyle({ width: '100%' });
  });
});
