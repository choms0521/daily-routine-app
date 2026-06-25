/**
 * Backup serialization (PRD 8.5, M5): export→import round-trip equivalence (completion logs
 * included), and the reject paths — non-JSON, newer version, structurally invalid. Pure
 * functions, so file I/O is not exercised here (that's the platform shell, verified live).
 */
import { backupFilename, parseBackup, serializeBackup } from '@/domain/backup';
import { baseState, clone } from '../fixtures/baseState';

describe('serializeBackup / parseBackup', () => {
  it('round-trips the full AppState including completion logs (T5/T6)', () => {
    const json = serializeBackup(baseState);
    expect(json).toContain('completionLogs');
    const result = parseBackup(json);
    expect(result.success).toBe(true);
    if (result.success) expect(result.state).toEqual(baseState);
  });

  it('rejects non-JSON input (T7)', () => {
    expect(parseBackup('{not json')).toEqual({ success: false, reason: 'invalid-json' });
  });

  it('rejects a newer schemaVersion (T8)', () => {
    const future = clone(baseState) as Record<string, unknown>;
    future.schemaVersion = 99;
    expect(parseBackup(JSON.stringify(future))).toEqual({
      success: false,
      reason: 'incompatible-version',
    });
  });

  it('rejects structurally invalid data', () => {
    const broken = clone(baseState) as Record<string, unknown> & {
      routines: { versions: { days: Record<string, unknown> }[] }[];
    };
    delete broken.routines[0].versions[0].days.sun;
    expect(parseBackup(JSON.stringify(broken))).toEqual({
      success: false,
      reason: 'invalid-schema',
    });
  });

  it('migrates an older backup forward on import', () => {
    const v0 = clone(baseState) as Record<string, unknown>;
    v0.schemaVersion = 0;
    const result = parseBackup(JSON.stringify(v0));
    expect(result.success).toBe(true);
    if (result.success) expect(result.state.schemaVersion).toBe(1);
  });

  it('names the file with date and schemaVersion', () => {
    expect(backupFilename(baseState, '2026-06-25')).toBe('dailyroutine-backup-2026-06-25-v1.json');
  });
});
