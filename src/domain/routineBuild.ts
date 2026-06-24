/**
 * Draft -> version/routine commit (spec stage-3 §3.4, §6). Pure: ids and the createdAt
 * timestamp are passed in so the store owns the non-deterministic seam and this layer
 * stays fully testable. Old versions are never touched here (append-only, PRD 4.1).
 *
 * slotId is positional within a (version, weekday, category) scope (PRD 4.4): aerobic ->
 * a1, a2…; anaerobic -> x1, x2… — matching the canonical fixture. Because a new version
 * is a fresh object, past versions keep their (weekday, category, slotId) mapping, so old
 * DayLog.checks stay resolvable.
 */
import type {
  Category,
  Days,
  DayPlan,
  ExerciseSlot,
  Routine,
  RoutineVersion,
} from '@/types/schema';
import { CATEGORIES, WEEKDAYS } from '@/types/schema';
import type { RoutineDraft, SlotDraft } from '@/domain/routineDraft';

/** slotId prefix per category (PRD 4.4 fixture: aerobic 'a', anaerobic 'x'). */
const SLOT_PREFIX: Record<Category, string> = { aerobic: 'a', anaerobic: 'x' };

/** Next sequential version id for a routine: v_001, v_002, … (1-based, zero-padded). */
export function nextVersionId(routine: Routine): string {
  return formatVersionId(routine.versions.length + 1);
}

/** The first version id for a brand-new routine. */
export function firstVersionId(): string {
  return formatVersionId(1);
}

function formatVersionId(n: number): string {
  return `v_${String(n).padStart(3, '0')}`;
}

function buildSlots(slots: SlotDraft[], category: Category): ExerciseSlot[] {
  return slots.map((slot, i) => ({
    slotId: `${SLOT_PREFIX[category]}${i + 1}`,
    name: slot.name,
    sets: slot.sets,
  }));
}

function buildDays(draft: RoutineDraft): Days {
  const days = {} as Days;
  for (const weekday of WEEKDAYS) {
    const day = draft.days[weekday];
    const plan = {} as DayPlan;
    for (const category of CATEGORIES) {
      plan[category] = buildSlots(day[category], category);
    }
    days[weekday] = plan;
  }
  return days;
}

export interface VersionIds {
  versionId: string;
  createdAt: string;
}

/** Build an immutable RoutineVersion from a draft and a caller-supplied version id/time. */
export function buildVersion(draft: RoutineDraft, ids: VersionIds): RoutineVersion {
  return {
    versionId: ids.versionId,
    createdAt: ids.createdAt,
    // restDays is semantically a set: canonicalize to Mon..Sun order (and dedupe) so a
    // toggle off/on doesn't reorder the array and create a false version diff (PRD D8.6).
    restDays: WEEKDAYS.filter((weekday) => draft.restDays.includes(weekday)),
    days: buildDays(draft),
  };
}

export interface RoutineIds {
  routineId: string;
  versionId: string;
  createdAt: string;
}

/** Build a brand-new Routine (single v_001 version) from a draft. */
export function buildRoutine(draft: RoutineDraft, ids: RoutineIds): Routine {
  return {
    id: ids.routineId,
    name: draft.name.trim(),
    createdAt: ids.createdAt,
    versions: [buildVersion(draft, { versionId: ids.versionId, createdAt: ids.createdAt })],
  };
}
