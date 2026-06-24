/**
 * ShareSheet integration (spec stage-4 §Day2). Proves the three delivery forms render, the QR
 * falls back to the code string past the single-frame budget, and the copy buttons write the
 * code / deep link to the clipboard. QR rendering and clipboard are mocked; the real QR is
 * verified on the simulator (the native svg renderer needs no exercise here).
 */
import { render, fireEvent, act } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

jest.mock('react-native-qrcode-svg', () => {
  const React = require('react');
  const { View } = require('react-native');
  return { __esModule: true, default: () => React.createElement(View, { testID: 'qr-code-svg' }) };
});

const mockSetStringAsync = jest.fn((_text: string) => Promise.resolve());
jest.mock('expo-clipboard', () => ({ setStringAsync: (s: string) => mockSetStringAsync(s) }));

import { ShareSheet } from '@/components/sheet/ShareSheet';
import { QR_MAX_URL_LEN, buildDeepLink, buildShareCode, serializeRoutine } from '@/domain/share';
import { baseState } from '../fixtures/baseState';

const version = baseState.routines[0].versions[0];
const routineName = baseState.routines[0].name;
const encoded = serializeRoutine(version, routineName);

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const renderSheet = (encodedValue: string = encoded) =>
  render(
    <SafeAreaProvider initialMetrics={metrics}>
      <ShareSheet visible onClose={() => {}} routineName={routineName} encoded={encodedValue} />
    </SafeAreaProvider>,
  );

beforeEach(() => mockSetStringAsync.mockClear());

describe('ShareSheet', () => {
  it('renders the QR, code preview, and both copy buttons for a normal routine', async () => {
    const view = await renderSheet();
    expect(view.getByTestId('qr-view')).toBeTruthy();
    expect(view.getByTestId('qr-code-svg')).toBeTruthy();
    expect(view.getByTestId('share-copy-code')).toBeTruthy();
    expect(view.getByTestId('share-copy-link')).toBeTruthy();
    expect(view.queryByTestId('qr-fallback')).toBeNull();
  });

  it('hides the QR and shows the code fallback past the QR budget', async () => {
    const view = await renderSheet('x'.repeat(QR_MAX_URL_LEN));
    expect(view.queryByTestId('qr-view')).toBeNull();
    expect(view.getByTestId('qr-fallback')).toBeTruthy();
    expect(view.getByTestId('share-copy-code')).toBeTruthy(); // code is still shareable
  });

  it('copies the raw code to the clipboard', async () => {
    const view = await renderSheet();
    await act(async () => {
      fireEvent.press(view.getByTestId('share-copy-code'));
    });
    expect(mockSetStringAsync).toHaveBeenCalledWith(buildShareCode(encoded));
    expect(view.getByTestId('share-copied-msg')).toHaveTextContent('코드를 복사했습니다');
  });

  it('copies the deep link to the clipboard', async () => {
    const view = await renderSheet();
    await act(async () => {
      fireEvent.press(view.getByTestId('share-copy-link'));
    });
    expect(mockSetStringAsync).toHaveBeenCalledWith(buildDeepLink(encoded));
    expect(view.getByTestId('share-copied-msg')).toHaveTextContent('링크를 복사했습니다');
  });

  it('shows a failure note (not an unhandled rejection) when the clipboard write rejects', async () => {
    mockSetStringAsync.mockImplementationOnce(() => Promise.reject(new Error('denied')));
    const view = await renderSheet();
    await act(async () => {
      fireEvent.press(view.getByTestId('share-copy-code'));
    });
    expect(view.getByTestId('share-copied-msg')).toHaveTextContent('복사에 실패했습니다');
  });
});
