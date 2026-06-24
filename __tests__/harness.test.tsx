/**
 * RNTL harness smoke test. Proves the component-test environment works on this stack
 * (React 19 + RN 0.85 + jest-expo ~56 + @testing-library/react-native v14) before any
 * Stage 2 component is built against it.
 *
 * CONVENTIONS (RNTL v14 + React 19):
 *  1. `render` is ASYNC — every component test MUST `await render(...)`; without the
 *     await the queries object / `screen` is unbound and `getByText` is undefined.
 *  2. `fireEvent.*` wraps an async act — `await fireEvent.press(...)`. Without the await,
 *     its act overlaps the next test's render ("overlapping act() calls") and that test
 *     fails to find elements. All Stage 2 component tests follow both.
 */
import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

describe('RNTL harness', () => {
  it('finds text via the awaited render() return value', async () => {
    const view = await render(<Text>hello</Text>);
    expect(view.getByText('hello')).toBeTruthy();
  });

  it('finds text via the screen singleton after await', async () => {
    await render(<Text>world</Text>);
    expect(screen.getByText('world')).toBeTruthy();
  });
});
