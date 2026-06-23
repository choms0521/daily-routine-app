/**
 * ExerciseList (Day 3): renders name + read-only set caption + a boolean checkbox per
 * slot, fires onCheck(slotId), reflects checked state, and has no numeric input fields.
 */
import { render, fireEvent } from '@testing-library/react-native';
import { ExerciseList } from '@/components/chip/ExerciseList';
import type { ExerciseSlot } from '@/types/schema';

const slots: ExerciseSlot[] = [
  { slotId: 'x1', name: '푸시업', sets: '4 × 한계-2' },
  { slotId: 'x2', name: '턱걸이', sets: '4세트' },
  { slotId: 'x3', name: '덤벨 로우', sets: '3세트' },
];

describe('ExerciseList', () => {
  it('renders a name + checkbox per slot', async () => {
    const view = await render(<ExerciseList slots={slots} checks={{}} onCheck={() => {}} />);
    expect(view.getByText('푸시업')).toBeTruthy();
    expect(view.getByText('턱걸이')).toBeTruthy();
    expect(view.getByText('덤벨 로우')).toBeTruthy();
    expect(view.getAllByTestId(/^check-/)).toHaveLength(3);
  });

  it('shows the read-only set caption', async () => {
    const view = await render(<ExerciseList slots={slots} checks={{}} onCheck={() => {}} />);
    expect(view.getByText('4 × 한계-2')).toBeTruthy();
  });

  it('fires onCheck(slotId) when a checkbox is pressed', async () => {
    const onCheck = jest.fn();
    const view = await render(<ExerciseList slots={slots} checks={{}} onCheck={onCheck} />);
    await fireEvent.press(view.getByTestId('check-x1'));
    expect(onCheck).toHaveBeenCalledWith('x1');
  });

  it('reflects the checked state', async () => {
    const view = await render(
      <ExerciseList slots={slots} checks={{ x1: true, x2: false }} onCheck={() => {}} />,
    );
    expect(view.getByTestId('check-x1')).toBeChecked();
    expect(view.getByTestId('check-x2')).not.toBeChecked();
  });

  it('has no per-set numeric input fields (v1 non-goal)', async () => {
    const view = await render(<ExerciseList slots={slots} checks={{}} onCheck={() => {}} />);
    expect(view.queryByTestId('rep-input')).toBeNull();
    expect(view.queryByTestId('duration-input')).toBeNull();
  });
});
