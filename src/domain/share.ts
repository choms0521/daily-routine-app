/**
 * Routine share serialization (spec stage-4 §3/§4, PRD 7.1). Pure functions only — no
 * store/UI/storage dependency — so the whole encode/decode pipeline is unit-testable.
 *
 * The share payload carries the routine TEMPLATE only: name + a single version's restDays
 * and per-weekday exercises (name + sets). It NEVER carries completion logs, the activation
 * timeline, or internal ids (id / slotId / versionId / createdAt) — the receiving app
 * reissues those (PRD D8.5 / 4.8). The Zod schema is the import-side trust boundary.
 *
 * Pipeline:
 *   export: payload -> JSON.stringify -> pako.deflate -> base64url
 *   import: base64url -> pako.inflate -> JSON.parse -> schemaVersion check -> Zod validate
 *
 * RN/Hermes guarantees neither atob/btoa nor Buffer, so the base64url and UTF-8 codecs are
 * spelled out here over Uint8Array rather than relying on a platform global.
 */
import { deflate, inflate } from 'pako';
import { z } from 'zod';

import { CURRENT_SCHEMA_VERSION, migrateSharePayload } from '@/domain/migration';
import type { DaysDraft, RoutineDraft } from '@/domain/routineDraft';
import type { RoutineVersion, Weekday } from '@/types/schema';
import { WEEKDAYS } from '@/types/schema';

// --- Limits (spec §3, §6.2) -------------------------------------------------

/** Per-field caps enforced by the schema so a malicious payload cannot smuggle huge strings. */
export const MAX_NAME_LEN = 100;
export const MAX_SETS_LEN = 60;
export const MAX_SLOTS_PER_DAY = 30;
/** Reject an oversized input string before doing any decode work (cheap first gate). */
export const MAX_INPUT_CHARS = 50_000;
/** Reject a decompression bomb: cap the inflated byte size (spec §6.2). */
export const MAX_INFLATED_BYTES = 500_000;

// --- Payload schema (single source of truth; types are inferred) ------------

const sharedExerciseSchema = z.object({
  name: z.string().min(1).max(MAX_NAME_LEN),
  sets: z.string().max(MAX_SETS_LEN),
});

const sharedDayPlanSchema = z.object({
  aerobic: z.array(sharedExerciseSchema).max(MAX_SLOTS_PER_DAY),
  anaerobic: z.array(sharedExerciseSchema).max(MAX_SLOTS_PER_DAY),
});

const weekdaySchema = z.enum(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']);

/**
 * All 7 weekday keys are required: a record over the enum cannot reliably enforce key
 * completeness, so the days are spelled out as an object (same pattern as Stage 1's
 * DaysSchema). A payload missing a weekday is rejected here, so importRoutine downstream
 * can trust 7-day completeness without a separate fill step (spec §5.3, single defense line).
 */
const sharedDaysSchema = z.object({
  mon: sharedDayPlanSchema,
  tue: sharedDayPlanSchema,
  wed: sharedDayPlanSchema,
  thu: sharedDayPlanSchema,
  fri: sharedDayPlanSchema,
  sat: sharedDayPlanSchema,
  sun: sharedDayPlanSchema,
});

export const sharePayloadSchema = z.object({
  schemaVersion: z.number().int().positive(),
  type: z.literal('routine-share'),
  routine: z.object({
    name: z.string().min(1).max(MAX_NAME_LEN),
    version: z.object({
      // At most 7 (one per weekday); buildVersion canonicalizes/dedupes downstream, but capping
      // here rejects an obviously-malformed payload earlier at the trust boundary.
      restDays: z.array(weekdaySchema).max(7),
      days: sharedDaysSchema,
    }),
  }),
});

export type SharedExercise = z.infer<typeof sharedExerciseSchema>;
export type SharedDayPlan = z.infer<typeof sharedDayPlanSchema>;
export type SharePayload = z.infer<typeof sharePayloadSchema>;

// --- base64url + UTF-8 codecs (platform-independent) ------------------------

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

const B64_LOOKUP = (() => {
  const table = new Int16Array(128).fill(-1);
  for (let i = 0; i < B64.length; i += 1) table[B64.charCodeAt(i)] = i;
  return table;
})();

/** Encode bytes as unpadded URL-safe base64 (`+`->`-`, `/`->`_`, no `=`). */
function bytesToBase64url(bytes: Uint8Array): string {
  let out = '';
  const len = bytes.length;
  for (let i = 0; i < len; i += 3) {
    const b0 = bytes[i];
    const b1 = i + 1 < len ? bytes[i + 1] : 0;
    const b2 = i + 2 < len ? bytes[i + 2] : 0;
    const n = (b0 << 16) | (b1 << 8) | b2;
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63];
    if (i + 1 < len) out += B64[(n >> 6) & 63];
    if (i + 2 < len) out += B64[n & 63];
  }
  return out.replace(/\+/g, '-').replace(/\//g, '_');
}

/** Decode URL-safe base64 back to bytes. Throws on any non-alphabet character. */
function base64urlToBytes(input: string): Uint8Array {
  const std = input.replace(/-/g, '+').replace(/_/g, '/').replace(/=+$/, '');
  const len = std.length;
  // A base64 length of 1 (mod 4) is impossible — 3 bytes encode to 4 chars, so valid lengths are
  // 0/2/3 (mod 4). Reject it up front so malformed input fails deterministically at the decode
  // gate instead of silently dropping the orphan 6 bits and decoding to garbage.
  if (len % 4 === 1) throw new Error('invalid base64url length');
  const out = new Uint8Array((len * 6) >> 3);
  let buffer = 0;
  let bits = 0;
  let oi = 0;
  for (let i = 0; i < len; i += 1) {
    const code = std.charCodeAt(i);
    const value = code < 128 ? B64_LOOKUP[code] : -1;
    if (value < 0) throw new Error('invalid base64url character');
    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out[oi] = (buffer >> bits) & 0xff;
      oi += 1;
    }
  }
  return out;
}

/**
 * Decode UTF-8 bytes to a string (1–4 byte sequences incl. surrogate pairs). STRICT at the trust
 * boundary: an invalid lead byte, a truncated sequence (not enough bytes remain), or a malformed
 * continuation byte (not 0b10xxxxxx) THROWS rather than reading out of bounds and silently
 * substituting 0. The caller runs this inside the JSON.parse try, so a throw surfaces as a
 * deterministic `parse-error` instead of a non-deterministic "maybe parses to garbage".
 */
function utf8BytesToString(bytes: Uint8Array): string {
  let out = '';
  let i = 0;
  const len = bytes.length;
  // Read the continuation byte at `index`, asserting it exists and is 0b10xxxxxx.
  const cont = (index: number): number => {
    const b = bytes[index];
    if (index >= len || (b & 0xc0) !== 0x80) throw new Error('invalid UTF-8 continuation byte');
    return b & 0x3f;
  };
  while (i < len) {
    const b0 = bytes[i];
    i += 1;
    if (b0 < 0x80) {
      out += String.fromCharCode(b0);
    } else if (b0 >= 0xc2 && b0 < 0xe0) {
      const b1 = cont(i);
      i += 1;
      out += String.fromCharCode(((b0 & 0x1f) << 6) | b1);
    } else if (b0 >= 0xe0 && b0 < 0xf0) {
      const b1 = cont(i);
      const b2 = cont(i + 1);
      i += 2;
      out += String.fromCharCode(((b0 & 0x0f) << 12) | (b1 << 6) | b2);
    } else if (b0 >= 0xf0 && b0 < 0xf5) {
      const b1 = cont(i);
      const b2 = cont(i + 1);
      const b3 = cont(i + 2);
      i += 3;
      const cp = (((b0 & 0x07) << 18) | (b1 << 12) | (b2 << 6) | b3) - 0x10000;
      out += String.fromCharCode(0xd800 + (cp >> 10), 0xdc00 + (cp & 0x3ff));
    } else {
      // Lone continuation byte (0x80–0xC1), overlong lead (0xC0/0xC1), or out-of-range (>=0xF5).
      throw new Error('invalid UTF-8 lead byte');
    }
  }
  return out;
}

// --- Encode (export) --------------------------------------------------------

/** Strip a stored RoutineVersion down to the share template (drops every internal id). */
function payloadFromVersion(version: RoutineVersion, name: string): SharePayload {
  const days = {} as Record<Weekday, SharedDayPlan>;
  for (const weekday of WEEKDAYS) {
    const plan = version.days[weekday];
    days[weekday] = {
      aerobic: plan.aerobic.map((s) => ({ name: s.name, sets: s.sets })),
      anaerobic: plan.anaerobic.map((s) => ({ name: s.name, sets: s.sets })),
    };
  }
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    type: 'routine-share',
    routine: { name, version: { restDays: [...version.restDays], days } },
  };
}

/** JSON -> deflate -> base64url. Exposed so callers/tests can encode a crafted payload. */
export function encodePayload(payload: unknown): string {
  const compressed = deflate(JSON.stringify(payload));
  return bytesToBase64url(compressed);
}

/** Serialize a routine version (template only) to a shareable base64url code. */
export function serializeRoutine(version: RoutineVersion, name: string): string {
  return encodePayload(payloadFromVersion(version, name));
}

// --- Decode (import) --------------------------------------------------------

export type DeserializeError =
  | 'input-too-large'
  | 'decode-error'
  | 'inflate-error'
  | 'payload-too-large'
  | 'parse-error'
  | 'incompatible-schema'
  | 'zod-validation';

export type DeserializeResult =
  | { success: true; payload: SharePayload }
  | { success: false; reason: DeserializeError };

/** Pull the encoded `d` parameter out of a deep link / URL; a bare code is returned as-is. */
export function extractEncoded(input: string): string {
  const trimmed = input.trim();
  const match = trimmed.match(/[?&]d=([^&\s]+)/);
  return match ? match[1] : trimmed;
}

/**
 * Decode a share code or deep link back to a validated payload. Every failure mode returns a
 * discriminated `{ success: false, reason }` (never throws) so the UI can map a precise
 * message. A schemaVersion newer than this app supports is rejected (PRD 7.2 / AC-5.5.3); an
 * older one is run through the share-payload migration (v1 pass-through).
 */
export function deserializeRoutine(
  input: string,
  supportedSchemaVersion: number,
): DeserializeResult {
  if (input.length > MAX_INPUT_CHARS) return { success: false, reason: 'input-too-large' };

  let bytes: Uint8Array;
  try {
    bytes = base64urlToBytes(extractEncoded(input));
  } catch {
    return { success: false, reason: 'decode-error' };
  }

  let inflated: Uint8Array;
  try {
    inflated = inflate(bytes);
  } catch {
    return { success: false, reason: 'inflate-error' };
  }
  // Bomb guard. NOTE: pako.inflate fully materializes the output BEFORE this check runs, so a
  // crafted stream (bounded only by MAX_INPUT_CHARS) can transiently allocate up to DEFLATE's
  // ~1032:1 max ratio before being rejected here. This caps what is *kept*, not what is
  // *allocated* — it does not by itself prevent a large transient allocation. A streaming inflate
  // that aborts once the running total crosses the threshold is the real fix (future hardening).
  if (inflated.length > MAX_INFLATED_BYTES) return { success: false, reason: 'payload-too-large' };

  let obj: unknown;
  try {
    obj = JSON.parse(utf8BytesToString(inflated));
  } catch {
    return { success: false, reason: 'parse-error' };
  }

  // schemaVersion gate runs before Zod: a future-version payload may add/rename fields, so we
  // must report "incompatible" rather than letting current-shape Zod fail it as a bad payload.
  const rawVersion = (obj as { schemaVersion?: unknown } | null)?.schemaVersion;
  if (typeof rawVersion === 'number' && rawVersion > supportedSchemaVersion) {
    return { success: false, reason: 'incompatible-schema' };
  }
  const candidate =
    typeof rawVersion === 'number' && rawVersion < supportedSchemaVersion
      ? migrateSharePayload(obj, supportedSchemaVersion)
      : obj;

  const parsed = sharePayloadSchema.safeParse(candidate);
  if (!parsed.success) return { success: false, reason: 'zod-validation' };
  return { success: true, payload: parsed.data };
}

// --- Import -> editor draft -------------------------------------------------

/**
 * Convert a validated share payload into an editor draft. The draft carries no ids, so the
 * store's buildRoutine mints a fresh routine id and reissues slot ids positionally (PRD 4.8) —
 * the imported routine becomes structurally identical to a hand-made one, with no special path.
 * The payload already passed sharedDaysSchema, so all 7 weekdays are present (spec §5.3).
 */
export function draftFromSharePayload(payload: SharePayload): RoutineDraft {
  const { version } = payload.routine;
  const days = {} as DaysDraft;
  for (const weekday of WEEKDAYS) {
    const plan = version.days[weekday];
    days[weekday] = {
      aerobic: plan.aerobic.map((s) => ({ name: s.name, sets: s.sets })),
      anaerobic: plan.anaerobic.map((s) => ({ name: s.name, sets: s.sets })),
    };
  }
  return { name: payload.routine.name, restDays: [...version.restDays], days };
}

// --- Delivery forms (PRD 7.1) -----------------------------------------------

/** Deep link scheme (app.json `scheme`). The receiver routes `import?d=...` to the import screen. */
export const DEEP_LINK_SCHEME = 'workouttracker';
/** Route segment the deep link targets. */
export const IMPORT_PATH = 'import';

/**
 * QR single-frame budget. react-native-qrcode-svg renders at its default error-correction level
 * M (ShareSheet passes no `ecl` prop), whose version-40 byte-mode capacity is 2331 bytes — NOT
 * the 2953 of level L. The whole deep link URL (ASCII, scheme prefix included) is byte-encoded,
 * so its length must fit under this cap; past it the share sheet hides the QR and falls back to
 * the code string (PRD D7 / 7.1). Using the L figure (2953) here would let a 2332–2953-char link
 * reach the renderer, which throws "amount of data is too big" at ECC-M and crashes the sheet.
 */
export const QR_MAX_URL_LEN = 2331;

/** Build the import deep link for an encoded payload. */
export function buildDeepLink(encoded: string): string {
  return `${DEEP_LINK_SCHEME}://${IMPORT_PATH}?d=${encoded}`;
}

/** The human-shareable code form. v1 returns the raw base64url (no block split — paste-safe). */
export function buildShareCode(encoded: string): string {
  return encoded;
}

/** Whether the encoded payload's deep link fits in a single-frame QR (else: code fallback). */
export function isQrAvailable(encoded: string): boolean {
  return buildDeepLink(encoded).length <= QR_MAX_URL_LEN;
}
