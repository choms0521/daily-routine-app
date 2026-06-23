/**
 * Shared data model: TypeScript types + Zod schemas (PRD 4.2 / 4.4, spec stage-1 §4).
 *
 * The Zod schema is the single source of truth; the exported types are derived via
 * `z.infer` so the runtime validator and the compile-time types can never drift.
 * Field names map 1:1 to the PRD; drift is prohibited (PRD 4.1).
 *
 * Core invariant (PRD D8): routine definition and completion logs are separated, and
 * a routine version is immutable (append-only). `DayLog.versionId`/`routineId` are a
 * denormalized cache, never the resolution path for plan(date).
 */
import { z } from 'zod';

/**
 * 'YYYY-MM-DD' local date key. The standard date argument/key across all modules.
 * Validated at the boundary because the domain orders date keys lexicographically
 * (compareDateKey), which only equals chronological order for zero-padded ISO dates;
 * a malformed key (e.g. "2026-6-1") would sort wrong and silently break resolution.
 */
export const DateKeySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected a YYYY-MM-DD date key');
export type DateKey = z.infer<typeof DateKeySchema>;
/** ISO 8601 timestamp (e.g. createdAt). */
export type ISOTimestamp = string;

export const WeekdaySchema = z.enum(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']);
export type Weekday = z.infer<typeof WeekdaySchema>;

export const CategorySchema = z.enum(['aerobic', 'anaerobic']);
export type Category = z.infer<typeof CategorySchema>;

export const ExerciseSlotSchema = z.object({
  // Stable position id within a (version, weekday, category) scope (PRD 4.4).
  slotId: z.string(),
  name: z.string(),
  // Set info is a free-form string in v1 (PRD D4), e.g. "4 × 12", "30분".
  sets: z.string(),
});
export type ExerciseSlot = z.infer<typeof ExerciseSlotSchema>;

export const DayPlanSchema = z.object({
  aerobic: z.array(ExerciseSlotSchema),
  anaerobic: z.array(ExerciseSlotSchema),
});
export type DayPlan = z.infer<typeof DayPlanSchema>;

/**
 * `days` must contain all 7 weekday keys (completeness is an invariant the domain
 * relies on: versionOf == null <=> plan == null). `z.record(enum, ...)` does not
 * reliably enforce key completeness, so the 7 weekdays are spelled out as a z.object.
 */
export const DaysSchema = z.object({
  mon: DayPlanSchema,
  tue: DayPlanSchema,
  wed: DayPlanSchema,
  thu: DayPlanSchema,
  fri: DayPlanSchema,
  sat: DayPlanSchema,
  sun: DayPlanSchema,
});
export type Days = z.infer<typeof DaysSchema>;

/** Immutable, append-only (PRD 4.1). */
export const RoutineVersionSchema = z.object({
  versionId: z.string(),
  createdAt: z.string(),
  restDays: z.array(WeekdaySchema), // rest day is version data, not a calendar fact (PRD D8.6)
  days: DaysSchema,
});
export type RoutineVersion = z.infer<typeof RoutineVersionSchema>;

export const RoutineSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.string(),
  versions: z.array(RoutineVersionSchema).min(1),
  // Display-only flag for the Stage 3 library hide feature (AC-5.4.3). Registered in
  // the schema so it survives hydrate; unrelated to version/timeline/computations.
  hidden: z.boolean().optional(),
});
export type Routine = z.infer<typeof RoutineSchema>;

/** Append-only activation event (PRD 4.3). */
export const ActivationSchema = z.object({
  effectiveFrom: DateKeySchema, // applies from this date onward (lexicographically ordered)
  routineId: z.string(),
  versionId: z.string(),
});
export type Activation = z.infer<typeof ActivationSchema>;

export const DayLogSchema = z.object({
  date: DateKeySchema,
  routineId: z.string(), // active routine that day (cache/verification, PRD 4.4)
  versionId: z.string(), // active version that day (denormalized cache, not the resolution path)
  checks: z.object({
    aerobic: z.record(z.string(), z.boolean()), // slotId -> checked
    anaerobic: z.record(z.string(), z.boolean()),
  }),
});
export type DayLog = z.infer<typeof DayLogSchema>;

export const SettingsSchema = z.object({
  // Selected active routine; on switch day this can differ from today's resolved plan (PRD 5.4).
  activeRoutineId: z.string().nullable(),
});
export type Settings = z.infer<typeof SettingsSchema>;

export const AppStateSchema = z.object({
  schemaVersion: z.number(),
  routines: z.array(RoutineSchema),
  activationTimeline: z.array(ActivationSchema), // append-only, ordered activation events
  completionLogs: z.record(DateKeySchema, DayLogSchema),
  settings: SettingsSchema,
});
export type AppState = z.infer<typeof AppStateSchema>;
