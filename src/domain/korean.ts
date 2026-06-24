/**
 * Korean particle selection by the final character's batchim (받침). User-visible sentences
 * that attach a particle to a routine name must pick the right form, since names are
 * user-entered and can end in a vowel or a consonant ("요가" vs "여름").
 *
 * Returns null for a non-Hangul final character (e.g. an English name or a digit); callers
 * fall back to the consonant form, which is the conventional default.
 */
const HANGUL_BASE = 0xac00;
const HANGUL_LAST = 0xd7a3;
const JONGSEONG_COUNT = 28; // 0 = no batchim
const JONGSEONG_RIEUL = 8; // ㄹ

function batchimOf(word: string): number | null {
  if (word.length === 0) return null;
  const code = word.charCodeAt(word.length - 1);
  if (code < HANGUL_BASE || code > HANGUL_LAST) return null; // not a Hangul syllable
  return (code - HANGUL_BASE) % JONGSEONG_COUNT;
}

/** Subject particle 이/가 ("…이 적용됩니다"). Vowel-final → 가, else 이. */
export function subjectParticle(word: string): string {
  return batchimOf(word) === 0 ? '가' : '이';
}

/** Instrumental particle 으로/로 ("…으로 전환"). Vowel-final or ㄹ-final → 로, else 으로. */
export function instrumentalParticle(word: string): string {
  const batchim = batchimOf(word);
  if (batchim === 0 || batchim === JONGSEONG_RIEUL) return '로';
  return '으로';
}
