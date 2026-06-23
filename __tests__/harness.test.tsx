/**
 * RNTL harness smoke test. Proves the component-test environment works on this stack
 * (React 19 + RN 0.85 + jest-expo ~56 + @testing-library/react-native v14) before any
 * Stage 2 component is built against it.
 *
 * CONVENTION (RNTL v14): `render` is ASYNC and returns a Promise. Every component test
 * MUST `await render(...)`; without the await, the queries object / `screen` is unbound
 * and `getByText` is undefined. All Stage 2 component tests follow this.
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
