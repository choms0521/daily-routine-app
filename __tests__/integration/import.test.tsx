/**
 * Import screen integration (spec stage-4 §5, dev-plan Day 3). Proves the three entry points
 * reach one decode pipeline: pasted code -> preview -> add (routines +1), a deep-link `d` param
 * auto-previews on open, an invalid code surfaces an error, and the QR tab renders the camera.
 * Router, camera, clock, and store are mocked.
 */
import { render, fireEvent, act } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

let mockParams: { d?: string } = {};
const mockReplace = jest.fn();
const mockBack = jest.fn();

jest.mock('expo-router', () => ({
  router: { replace: (p: string) => mockReplace(p), back: () => mockBack(), push: () => {} },
  useLocalSearchParams: () => mockParams,
}));

jest.mock('expo-camera', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    CameraView: () => React.createElement(View, { testID: 'import-camera' }),
    useCameraPermissions: () => [{ granted: true }, jest.fn()],
  };
});

jest.mock('@/store/useAppStore', () => {
  const { createAppStore } = require('@/store/appStore');
  return {
    useAppStore: createAppStore(
      { load: async () => null, save: async () => {} },
      { now: () => '2026-06-24T00:00:00Z', newRoutineId: () => 'rt_imported' },
    ),
  };
});

import { useAppStore } from '@/store/useAppStore';
import ImportScreen from '@/app/import';
import { serializeRoutine } from '@/domain/share';
import { baseState, clone } from '../fixtures/baseState';

const version = baseState.routines[0].versions[0];
const routineName = baseState.routines[0].name;
const validCode = serializeRoutine(version, routineName);

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const renderImport = () =>
  render(
    <SafeAreaProvider initialMetrics={metrics}>
      <ImportScreen />
    </SafeAreaProvider>,
  );

beforeEach(() => {
  mockParams = {};
  mockReplace.mockClear();
  mockBack.mockClear();
  useAppStore.setState({ state: clone(baseState), hydrated: true });
});

describe('import screen', () => {
  it('pastes a valid code, previews it, and adds it to the library (+1 routine)', async () => {
    const view = await renderImport();
    // Flush the controlled-input state before pressing so the button is enabled (React 19 does
    // not apply the changeText update synchronously; the async act form flushes it — RNTL v14).
    await act(async () => {
      fireEvent.changeText(view.getByTestId('import-code-input'), validCode);
    });
    fireEvent.press(view.getByTestId('import-preview-btn'));

    const preview = await view.findByTestId('import-preview');
    expect(preview).toBeTruthy();
    expect(view.getByText(routineName)).toBeTruthy();

    expect(useAppStore.getState().state.routines).toHaveLength(1);
    fireEvent.press(view.getByTestId('import-add'));

    expect(await view.findByTestId('import-added')).toBeTruthy();
    expect(useAppStore.getState().state.routines).toHaveLength(2);
    expect(useAppStore.getState().state.routines[1].id).toBe('rt_imported');

    fireEvent.press(view.getByTestId('import-go-library'));
    expect(mockReplace).toHaveBeenCalledWith('/library');
  });

  it('auto-previews when opened from a deep link `d` param', async () => {
    mockParams = { d: validCode };
    const view = await renderImport();
    expect(await view.findByTestId('import-preview')).toBeTruthy();
    expect(view.getByText(routineName)).toBeTruthy();
  });

  it('shows an error for an invalid code and does not add a routine', async () => {
    const view = await renderImport();
    await act(async () => {
      fireEvent.changeText(view.getByTestId('import-code-input'), 'not-a-valid-code!!');
    });
    fireEvent.press(view.getByTestId('import-preview-btn'));

    const error = await view.findByTestId('import-error');
    expect(error).toHaveTextContent('올바른 공유 코드가 아닙니다.');
    expect(useAppStore.getState().state.routines).toHaveLength(1); // unchanged
  });

  it('renders the camera on the QR tab when permission is granted', async () => {
    const view = await renderImport();
    await act(async () => {
      fireEvent.press(view.getByTestId('import-tab-qr'));
    });
    expect(view.getByTestId('import-camera')).toBeTruthy();
  });
});
