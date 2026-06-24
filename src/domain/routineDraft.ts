/**
 * Editor draft model (spec stage-3 §3.3). The editor edits a local, immutable draft and
 * only commits to the store on save, so in-progress edits never touch a RoutineVersion or
 * the timeline (D8.8 protection). All ops return new objects (coding rule: never mutate).
 *
 * A draft has no slotId: ids are assigned deterministically at commit time (routineBuild),
 * so the draft layer stays free of identity concerns and is trivially unit-testable.
 */
import type { Category, Routine, RoutineVersion, Weekday } from '@/types/schema';
import { WEEKDAYS } from '@/types/schema';

export interface SlotDraft {
  name: string;
  sets: string;
}

export type DayPlanDraft = { aerobic: SlotDraft[]; anaerobic: SlotDraft[] };
export type DaysDraft = Record<Weekday, DayPlanDraft>;

export interface RoutineDraft {
  name: string;
  restDays: Weekday[];
  days: DaysDraft;
}

/** A fresh draft: empty name, no rest days, all 7 weekdays present with empty categories. */
export function emptyDraft(): RoutineDraft {
  const days = {} as DaysDraft;
  for (const weekday of WEEKDAYS) {
    days[weekday] = { aerobic: [], anaerobic: [] };
  }
  return { name: '', restDays: [], days };
}

/**
 * Seed a draft from a routine's latest version (edit mode and duplicate). Strips slotIds
 * down to SlotDraft; new ids are minted on the next commit. The original is never mutated.
 */
export function draftFromRoutine(routine: Routine): RoutineDraft {
  const version: RoutineVersion = routine.versions[routine.versions.length - 1];
  const days = {} as DaysDraft;
  for (const weekday of WEEKDAYS) {
    const plan = version.days[weekday];
    days[weekday] = {
      aerobic: plan.aerobic.map((s) => ({ name: s.name, sets: s.sets })),
      anaerobic: plan.anaerobic.map((s) => ({ name: s.name, sets: s.sets })),
    };
  }
  return { name: routine.name, restDays: [...version.restDays], days };
}

/** Whether the draft can be saved: a non-blank name (spec §3.1 — blank name disables save). */
export function isSaveable(draft: RoutineDraft): boolean {
  return draft.name.trim().length > 0;
}

export function setName(draft: RoutineDraft, name: string): RoutineDraft {
  return { ...draft, name };
}

/** Toggle a weekday's rest-day membership. Rest days are version data, not a calendar. */
export function toggleRestDay(draft: RoutineDraft, weekday: Weekday): RoutineDraft {
  const restDays = draft.restDays.includes(weekday)
    ? draft.restDays.filter((d) => d !== weekday)
    : [...draft.restDays, weekday];
  return { ...draft, restDays };
}

/** Replace one weekday's day plan immutably (internal helper for the slot ops). */
function withDay(draft: RoutineDraft, weekday: Weekday, next: DayPlanDraft): RoutineDraft {
  return { ...draft, days: { ...draft.days, [weekday]: next } };
}

export function addSlot(
  draft: RoutineDraft,
  weekday: Weekday,
  category: Category,
  slot: SlotDraft,
): RoutineDraft {
  const day = draft.days[weekday];
  return withDay(draft, weekday, { ...day, [category]: [...day[category], slot] });
}

export function removeSlot(
  draft: RoutineDraft,
  weekday: Weekday,
  category: Category,
  index: number,
): RoutineDraft {
  const day = draft.days[weekday];
  return withDay(draft, weekday, {
    ...day,
    [category]: day[category].filter((_, i) => i !== index),
  });
}

/**
 * Move a slot one step within its category (dir -1 = up, +1 = down). Out-of-range moves
 * (top item up, bottom item down, or a bad index) are a no-op returning the same draft.
 */
export function moveSlot(
  draft: RoutineDraft,
  weekday: Weekday,
  category: Category,
  index: number,
  dir: -1 | 1,
): RoutineDraft {
  const list = draft.days[weekday][category];
  const target = index + dir;
  if (index < 0 || index >= list.length || target < 0 || target >= list.length) return draft;
  const next = [...list];
  [next[index], next[target]] = [next[target], next[index]];
  return withDay(draft, weekday, { ...draft.days[weekday], [category]: next });
}
