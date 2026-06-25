/**
 * Backup file I/O (PRD 8.5) — the platform shell around the pure domain/backup functions.
 * This is the one layer jest can't meaningfully exercise (native file write / share sheet /
 * document picker), so it stays thin: all decode/validate logic lives in domain/backup, which
 * is fully tested. Verified live on the simulator.
 *
 * expo SDK 56 file API: the `File`/`Paths` classes (the top-level readAsStringAsync etc. are
 * deprecated and throw at runtime — see the SDK 56 filesystem docs).
 */
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { backupFilename, parseBackup, serializeBackup, type BackupParseResult } from '@/domain/backup';
import type { AppState } from '@/types/schema';

/** Write the whole AppState to a JSON file and open the share sheet (PRD 8.5 export). */
export async function exportBackup(state: AppState, dateKey: string): Promise<void> {
  const json = serializeBackup(state);
  const file = new File(Paths.document, backupFilename(state, dateKey));
  if (!file.exists) file.create();
  file.write(json); // overwrites (append defaults to false)

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('이 기기에서는 공유를 사용할 수 없습니다.');
  }
  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/json',
    UTI: 'public.json',
    dialogTitle: '루틴 백업 내보내기',
  });
}

/**
 * Let the user pick a JSON file and decode it to an AppState (PRD 8.5 import). Returns null
 * if the user cancelled; otherwise a BackupParseResult the caller validates before replacing.
 */
export async function pickBackup(): Promise<BackupParseResult | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/json',
    copyToCacheDirectory: true,
  });
  if (result.canceled) return null;
  const file = new File(result.assets[0].uri);
  return parseBackup(file.textSync());
}
