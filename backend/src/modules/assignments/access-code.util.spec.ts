import { generateAccessCode } from './access-code.util';

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/** Deterministik indeks generatori: berilgan ketma-ketlik, tugasa 0. */
function seededIndex(values: number[]): (max: number) => number {
  let i = 0;
  return () => (i < values.length ? values[i++] : 0);
}

describe('generateAccessCode', () => {
  it('8 ta belgidan iborat va faqat ruxsat etilgan alifbodan', () => {
    for (let i = 0; i < 200; i += 1) {
      const code = generateAccessCode();
      expect(code).toHaveLength(8);
      expect([...code].every((c) => ALPHABET.includes(c))).toBe(true);
    }
  });

  it('chalkash belgilarni (0, 1, O, I, L) ishlatmaydi', () => {
    const ambiguous = ['0', '1', 'O', 'I', 'L'];
    for (const ch of ambiguous) {
      expect(ALPHABET.includes(ch)).toBe(false);
    }
    const code = generateAccessCode();
    expect(ambiguous.some((ch) => code.includes(ch))).toBe(false);
  });

  it('injektsiya qilingan RNG bilan deterministik', () => {
    expect(generateAccessCode(seededIndex([0, 1, 2, 3, 4, 5, 6, 7]))).toBe('ABCDEFGH');
    expect(generateAccessCode(() => 0)).toBe('AAAAAAAA');
  });
});
