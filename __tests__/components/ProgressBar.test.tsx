/**
 * ProgressBar (Day 2): label fidelity to the PRD "{done} / {total} · {pct}%" format and
 * the fill width. Uses the RNTL v14 async-render convention (await render).
 */
import { render } from '@testing-library/react-native';
import { ProgressBar } from '@/components/progress/ProgressBar';

describe('ProgressBar', () => {
  it('renders the PRD 5/8·63% label exactly', async () => {
    const view = await render(<ProgressBar done={5} total={8} pct={63} />);
    expect(view.getByText('5 / 8 · 63%')).toBeTruthy();
  });

  it('renders the empty-week 0/0·0% label', async () => {
    const view = await render(<ProgressBar done={0} total={0} pct={0} />);
    expect(view.getByText('0 / 0 · 0%')).toBeTruthy();
  });

  it('sets the fill width to pct%', async () => {
    const view = await render(<ProgressBar done={5} total={8} pct={63} />);
    expect(view.getByTestId('progress-fill')).toHaveStyle({ width: '63%' });
  });
});
