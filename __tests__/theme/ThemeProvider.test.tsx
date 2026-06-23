/**
 * ThemeProvider / useTheme (Day 1 end condition): a component wrapped in ThemeProvider
 * can read tokens via useTheme(); the hook also has a token default without a provider.
 * Uses the RNTL v14 async-render convention (await render).
 */
import { render } from '@testing-library/react-native';
import { Text } from 'react-native';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';

function PrimaryProbe() {
  const t = useTheme();
  return <Text>{t.color.primary}</Text>;
}

describe('ThemeProvider / useTheme', () => {
  it('exposes PRD tokens through useTheme inside the provider', async () => {
    const view = await render(
      <ThemeProvider>
        <PrimaryProbe />
      </ThemeProvider>,
    );
    expect(view.getByText('#3182F6')).toBeTruthy();
  });

  it('falls back to the token default when no provider wraps the tree', async () => {
    const view = await render(<PrimaryProbe />);
    expect(view.getByText('#3182F6')).toBeTruthy();
  });
});
