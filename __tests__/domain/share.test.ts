/**
 * domain/share unit tests (spec stage-4 §8, dev-plan Day 1/Day 4).
 *
 * Covers the encode/decode pipeline: roundtrip equivalence, template-only payload (no logs /
 * no internal ids), schemaVersion gating, weekday completeness, every malformed-input reason,
 * size limits, and the delivery-form helpers. Malformed/oversized cases are crafted with the
 * test runtime's Buffer + pako so we can build raw bytes the production encoder never emits.
 */
import pako from 'pako';

import {
  MAX_INFLATED_BYTES,
  MAX_INPUT_CHARS,
  QR_MAX_URL_LEN,
  buildDeepLink,
  buildShareCode,
  deserializeRoutine,
  encodePayload,
  extractEncoded,
  isQrAvailable,
  serializeRoutine,
  type SharePayload,
} from '@/domain/share';
import { WEEKDAYS } from '@/types/schema';
import type { RoutineVersion } from '@/types/schema';
import { baseState } from '../fixtures/baseState';

// Buffer is provided by the Jest (Node) runtime; declare a minimal shape so tsc (which has no
// @types/node) accepts these test-only raw encoders without pulling Node globals project-wide.
declare const Buffer: {
  from(
    input: Uint8Array | string,
    encoding?: string,
  ): Uint8Array & { toString(encoding: string): string };
};

const version: RoutineVersion = baseState.routines[0].versions[0];
const routineName = baseState.routines[0].name; // '여름 컨디셔닝'

/** Template (no slotId) expected after a roundtrip — only name + sets survive per slot. */
function expectedTemplate() {
  const days: Record<string, unknown> = {};
  for (const weekday of WEEKDAYS) {
    const plan = version.days[weekday];
    days[weekday] = {
      aerobic: plan.aerobic.map((s) => ({ name: s.name, sets: s.sets })),
      anaerobic: plan.anaerobic.map((s) => ({ name: s.name, sets: s.sets })),
    };
  }
  return { name: routineName, version: { restDays: version.restDays, days } };
}

/** A canonical valid payload object, obtained through the real encode/decode path. */
function validPayload(): SharePayload {
  const result = deserializeRoutine(serializeRoutine(version, routineName), 1);
  if (!result.success) throw new Error('fixture payload failed to decode');
  return result.payload;
}

/** Test-only raw encoder: deflate arbitrary text and base64url it via the runtime's Buffer. */
function rawEncode(text: string): string {
  return Buffer.from(pako.deflate(text)).toString('base64url');
}

/** Test-only raw byte encoder: deflate arbitrary bytes (e.g. invalid UTF-8) and base64url them. */
function rawEncodeBytes(bytes: Uint8Array): string {
  return Buffer.from(pako.deflate(bytes)).toString('base64url');
}

/** Test-only raw decoder: independent (Buffer-based) inverse used to inspect serialized bytes. */
function rawInflateToString(encoded: string): string {
  const std = encoded.replace(/-/g, '+').replace(/_/g, '/');
  return pako.inflate(Buffer.from(std, 'base64'), { to: 'string' });
}

describe('share roundtrip', () => {
  it('serialize -> deserialize preserves the routine template', () => {
    const encoded = serializeRoutine(version, routineName);
    const result = deserializeRoutine(encoded, 1);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.payload.schemaVersion).toBe(1);
    expect(result.payload.type).toBe('routine-share');
    expect(result.payload.routine).toEqual(expectedTemplate());
  });

  it('roundtrips Korean text and a 4-byte emoji exactly (UTF-8 codec)', () => {
    const v: RoutineVersion = {
      versionId: 'v_001',
      createdAt: '2026-06-01T00:00:00Z',
      restDays: ['sun'],
      days: {
        mon: { aerobic: [{ slotId: 'a1', name: '러닝 🏃 가볍게', sets: '30분' }], anaerobic: [] },
        tue: { aerobic: [], anaerobic: [] },
        wed: { aerobic: [], anaerobic: [] },
        thu: { aerobic: [], anaerobic: [] },
        fri: { aerobic: [], anaerobic: [] },
        sat: { aerobic: [], anaerobic: [] },
        sun: { aerobic: [], anaerobic: [] },
      },
    };
    const result = deserializeRoutine(serializeRoutine(v, '여름 🌞 루틴'), 1);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.payload.routine.name).toBe('여름 🌞 루틴');
    expect(result.payload.routine.version.days.mon.aerobic[0].name).toBe('러닝 🏃 가볍게');
  });
});

describe('share payload carries the template only (AC-5.5.1)', () => {
  it('omits completion logs, the timeline, and every internal id', () => {
    const rawJson = rawInflateToString(serializeRoutine(version, routineName));

    expect(rawJson).not.toContain('slotId');
    expect(rawJson).not.toContain('versionId');
    expect(rawJson).not.toContain('completionLogs');
    expect(rawJson).not.toContain('activationTimeline');
    expect(rawJson).not.toContain('createdAt');
    expect(rawJson).not.toContain('"id"');
  });

  it('has no forbidden key anywhere in the decoded object (structural, fixture-independent)', () => {
    // Substring checks above would false-pass/fail if a name/sets ever contained "slotId" etc.;
    // this walks the actual decoded object and asserts the forbidden keys are absent as real keys.
    const raw: unknown = JSON.parse(rawInflateToString(serializeRoutine(version, routineName)));
    const keys = new Set<string>();
    const walk = (value: unknown) => {
      if (Array.isArray(value)) {
        value.forEach(walk);
      } else if (value !== null && typeof value === 'object') {
        for (const [k, v] of Object.entries(value)) {
          keys.add(k);
          walk(v);
        }
      }
    };
    walk(raw);
    for (const forbidden of [
      'slotId',
      'versionId',
      'createdAt',
      'id',
      'completionLogs',
      'activationTimeline',
    ]) {
      expect(keys.has(forbidden)).toBe(false);
    }
  });
});

describe('schemaVersion gating (AC-5.5.3)', () => {
  it('rejects a payload newer than the app supports', () => {
    const encoded = encodePayload({ ...validPayload(), schemaVersion: 999 });
    expect(deserializeRoutine(encoded, 1)).toEqual({
      success: false,
      reason: 'incompatible-schema',
    });
  });

  it('accepts a payload at the supported version', () => {
    expect(deserializeRoutine(serializeRoutine(version, routineName), 1).success).toBe(true);
  });

  it('migrates an older-version payload through migrateSharePayload (v1 pass-through)', () => {
    // Pretend the app supports schemaVersion 2: a v1 payload is below it, so the < branch runs
    // migrateSharePayload (a no-op in v1) and the payload still validates. Wires the path future
    // share-payload migrations will fill.
    const result = deserializeRoutine(serializeRoutine(version, routineName), 2);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.payload.routine.name).toBe(routineName);
  });
});

describe('weekday completeness (sharedDaysSchema)', () => {
  it('rejects a payload missing a weekday key', () => {
    const payload = validPayload();
    const { mon, ...daysWithoutMon } = payload.routine.version.days;
    void mon;
    const broken = {
      ...payload,
      routine: {
        ...payload.routine,
        version: { ...payload.routine.version, days: daysWithoutMon },
      },
    };
    expect(deserializeRoutine(encodePayload(broken), 1)).toEqual({
      success: false,
      reason: 'zod-validation',
    });
  });
});

describe('name/sets trimming at the trust boundary', () => {
  it('trims surrounding whitespace from the routine name and exercise fields', () => {
    const payload = validPayload();
    const padded = {
      ...payload,
      routine: {
        ...payload.routine,
        name: '  여름 컨디셔닝  ',
        version: {
          ...payload.routine.version,
          days: {
            ...payload.routine.version.days,
            mon: { aerobic: [{ name: '  러닝  ', sets: '  30분  ' }], anaerobic: [] },
          },
        },
      },
    };
    const result = deserializeRoutine(encodePayload(padded), 1);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.payload.routine.name).toBe('여름 컨디셔닝');
    expect(result.payload.routine.version.days.mon.aerobic[0].name).toBe('러닝');
    expect(result.payload.routine.version.days.mon.aerobic[0].sets).toBe('30분');
  });

  it('rejects a whitespace-only routine name (empty after trim -> zod-validation)', () => {
    const payload = validPayload();
    const blank = { ...payload, routine: { ...payload.routine, name: '   ' } };
    expect(deserializeRoutine(encodePayload(blank), 1)).toEqual({
      success: false,
      reason: 'zod-validation',
    });
  });

  it('rejects a whitespace-only exercise name (empty after trim -> zod-validation)', () => {
    const payload = validPayload();
    const blank = {
      ...payload,
      routine: {
        ...payload.routine,
        version: {
          ...payload.routine.version,
          days: {
            ...payload.routine.version.days,
            mon: { aerobic: [{ name: '   ', sets: '30분' }], anaerobic: [] },
          },
        },
      },
    };
    expect(deserializeRoutine(encodePayload(blank), 1)).toEqual({
      success: false,
      reason: 'zod-validation',
    });
  });
});

describe('malformed / hostile input', () => {
  it('rejects a non-base64url string (decode-error)', () => {
    expect(deserializeRoutine('not base64url!! 한글', 1)).toEqual({
      success: false,
      reason: 'decode-error',
    });
  });

  it('rejects an impossible base64 length of 1 mod 4 (decode-error)', () => {
    // "aaaaa" is 5 valid base64 chars; 5 % 4 === 1 is not a producible base64 length.
    expect(deserializeRoutine('aaaaa', 1)).toEqual({ success: false, reason: 'decode-error' });
  });

  it('rejects valid base64url that is not a deflate stream (inflate-error)', () => {
    // "abcd" decodes to 3 bytes that are not a zlib header -> pako.inflate throws.
    expect(deserializeRoutine('abcd', 1)).toEqual({ success: false, reason: 'inflate-error' });
  });

  it('rejects inflate output that is not JSON (parse-error)', () => {
    expect(deserializeRoutine(rawEncode('{ not valid json'), 1)).toEqual({
      success: false,
      reason: 'parse-error',
    });
  });

  it('rejects invalid UTF-8 in the inflated bytes (parse-error)', () => {
    // 0xff is never a valid UTF-8 lead byte; the strict decoder throws deterministically rather
    // than reading out of bounds, and the throw surfaces as parse-error.
    expect(deserializeRoutine(rawEncodeBytes(new Uint8Array([0xff, 0xfe])), 1)).toEqual({
      success: false,
      reason: 'parse-error',
    });
  });

  it('rejects a truncated multi-byte UTF-8 sequence (parse-error)', () => {
    // 0xed starts a 3-byte sequence but only one byte follows -> truncated -> throw -> parse-error.
    expect(deserializeRoutine(rawEncodeBytes(new Uint8Array([0xed, 0x9c])), 1)).toEqual({
      success: false,
      reason: 'parse-error',
    });
  });

  it('rejects valid JSON that is not a share payload (zod-validation)', () => {
    expect(deserializeRoutine(rawEncode('{"hello":"world"}'), 1)).toEqual({
      success: false,
      reason: 'zod-validation',
    });
  });

  it('rejects an over-long input string before any work (input-too-large)', () => {
    const tooLong = 'a'.repeat(MAX_INPUT_CHARS + 1);
    expect(deserializeRoutine(tooLong, 1)).toEqual({
      success: false,
      reason: 'input-too-large',
    });
  });

  it('rejects a decompression bomb (payload-too-large)', () => {
    // A tiny code that inflates past the byte cap; the size guard fires before JSON.parse.
    const bomb = rawEncode('a'.repeat(MAX_INFLATED_BYTES + 1));
    expect(bomb.length).toBeLessThanOrEqual(MAX_INPUT_CHARS);
    expect(deserializeRoutine(bomb, 1)).toEqual({ success: false, reason: 'payload-too-large' });
  });
});

describe('delivery forms (PRD 7.1)', () => {
  it('buildDeepLink prefixes the scheme and import path', () => {
    expect(buildDeepLink('abc123')).toBe('workouttracker://import?d=abc123');
  });

  it('extractEncoded pulls d from a deep link and passes a bare code through', () => {
    expect(extractEncoded('workouttracker://import?d=abc123')).toBe('abc123');
    expect(extractEncoded('  abc123  ')).toBe('abc123');
  });

  it('deep link roundtrips through extractEncoded -> deserializeRoutine', () => {
    const link = buildDeepLink(serializeRoutine(version, routineName));
    const result = deserializeRoutine(link, 1);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.payload.routine.name).toBe(routineName);
  });

  it('buildShareCode returns the raw encoded string (paste-safe)', () => {
    const encoded = serializeRoutine(version, routineName);
    expect(buildShareCode(encoded)).toBe(encoded);
  });

  it('isQrAvailable is true for a normal routine and false past the QR budget', () => {
    expect(isQrAvailable(serializeRoutine(version, routineName))).toBe(true);
    expect(isQrAvailable('x'.repeat(QR_MAX_URL_LEN))).toBe(false);
  });

  it('caps isQrAvailable at the ECC-M byte budget the renderer actually uses', () => {
    // react-native-qrcode-svg defaults to error-correction level M (version-40 byte capacity
    // 2331). The whole deep link is byte-encoded, so the cap is on the full URL length. Using the
    // ECC-L figure (2953) would hand a 2332–2953-char link to the renderer, which throws.
    expect(QR_MAX_URL_LEN).toBe(2331);
    const budget = QR_MAX_URL_LEN - buildDeepLink('').length; // encoded headroom under the cap
    expect(buildDeepLink('x'.repeat(budget)).length).toBe(QR_MAX_URL_LEN);
    expect(isQrAvailable('x'.repeat(budget))).toBe(true); // exactly at the cap
    expect(isQrAvailable('x'.repeat(budget + 1))).toBe(false); // one byte over -> code fallback
  });
});
