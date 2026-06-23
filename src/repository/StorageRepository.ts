/**
 * Storage abstraction (PRD 8.1). The store and domain depend only on this interface,
 * so a future MMKV swap leaves them unchanged. Backup/restore reuse the domain
 * serialization (PRD 8.5).
 */
import type { AppState } from '@/types/schema';

export interface StorageRepository {
  /** Load the full state at app start; null when nothing is stored. */
  load(): Promise<AppState | null>;
  /** Persist the full state. */
  save(state: AppState): Promise<void>;
}
