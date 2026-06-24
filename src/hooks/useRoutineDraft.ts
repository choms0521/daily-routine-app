/**
 * Editor draft state (spec stage-3 §3.3). Wraps the pure draft ops in component state; the
 * store is never touched until save. All updates go through the immutable ops so the editor
 * cannot mutate the draft in place.
 */
import { useMemo, useState } from 'react';
import {
  addSlot as addSlotOp,
  isSaveable,
  moveSlot as moveSlotOp,
  removeSlot as removeSlotOp,
  setName as setNameOp,
  toggleRestDay as toggleRestDayOp,
  type RoutineDraft,
  type SlotDraft,
} from '@/domain/routineDraft';
import type { Category, Weekday } from '@/types/schema';

export function useRoutineDraft(initial: RoutineDraft) {
  const [draft, setDraft] = useState<RoutineDraft>(initial);

  const api = useMemo(
    () => ({
      setName: (name: string) => setDraft((d) => setNameOp(d, name)),
      toggleRestDay: (weekday: Weekday) => setDraft((d) => toggleRestDayOp(d, weekday)),
      addSlot: (weekday: Weekday, category: Category, slot: SlotDraft) =>
        setDraft((d) => addSlotOp(d, weekday, category, slot)),
      removeSlot: (weekday: Weekday, category: Category, index: number) =>
        setDraft((d) => removeSlotOp(d, weekday, category, index)),
      moveSlot: (weekday: Weekday, category: Category, index: number, dir: -1 | 1) =>
        setDraft((d) => moveSlotOp(d, weekday, category, index, dir)),
    }),
    [],
  );

  return { draft, ...api, isSaveable: isSaveable(draft) };
}
