/**
 * Safe local draft persistence to ensure user input is preserved
 * across sessions, network disconnects, and unexpected timeouts.
 */

const DRAFT_PREFIX = 'presnt_draft_';

export interface StoredDraft<T> {
  data: T;
  updatedAt: number;
}

export const draftStorage = {
  /**
   * Persist form fields into local storage
   */
  save<T>(key: string, data: T): void {
    try {
      const payload: StoredDraft<T> = {
        data,
        updatedAt: Date.now(),
      };
      localStorage.setItem(`${DRAFT_PREFIX}${key}`, JSON.stringify(payload));
    } catch {
      // Suppress private browsing or quota errors
    }
  },

  /**
   * Retrieve saved draft data if present
   */
  get<T>(key: string): T | null {
    try {
      const raw = localStorage.getItem(`${DRAFT_PREFIX}${key}`);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as StoredDraft<T>;
      return parsed?.data ?? null;
    } catch {
      return null;
    }
  },

  /**
   * Check if a valid draft exists
   */
  has(key: string): boolean {
    try {
      return Boolean(localStorage.getItem(`${DRAFT_PREFIX}${key}`));
    } catch {
      return false;
    }
  },

  /**
   * Discard draft upon successful submission or user dismissal
   */
  clear(key: string): void {
    try {
      localStorage.removeItem(`${DRAFT_PREFIX}${key}`);
    } catch {
      // Suppress
    }
  },
};
