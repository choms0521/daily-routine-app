/**
 * Korean particle selection by batchim (받침). Routine names are user-entered, so a
 * vowel-final name must take 가/로 and a consonant-final name 이/으로 (ㄹ-final → 로).
 */
import { instrumentalParticle, subjectParticle } from '@/domain/korean';

describe('subjectParticle (이/가)', () => {
  it('uses 가 after a vowel-final syllable', () => {
    expect(subjectParticle('요가')).toBe('가');
    expect(subjectParticle('수비')).toBe('가');
  });

  it('uses 이 after a consonant-final syllable', () => {
    expect(subjectParticle('여름')).toBe('이');
    expect(subjectParticle('여름 컨디셔닝')).toBe('이'); // 닝 -> ㅇ batchim
  });

  it('defaults to 이 for a non-Hangul final character', () => {
    expect(subjectParticle('Gym')).toBe('이');
    expect(subjectParticle('')).toBe('이');
  });
});

describe('instrumentalParticle (으로/로)', () => {
  it('uses 로 after a vowel-final or ㄹ-final syllable', () => {
    expect(instrumentalParticle('요가')).toBe('로'); // vowel
    expect(instrumentalParticle('서울')).toBe('로'); // ㄹ batchim
  });

  it('uses 으로 after other consonant-final syllables', () => {
    expect(instrumentalParticle('여름')).toBe('으로'); // ㅁ batchim
    expect(instrumentalParticle('아침 운동')).toBe('으로'); // ㅇ batchim
  });

  it('defaults to 으로 for a non-Hangul final character', () => {
    expect(instrumentalParticle('Gym')).toBe('으로');
  });
});
