import { randomInt } from 'node:crypto';

/**
 * Kod alifbosi: chalkash belgilar (0/O, 1/I/L) chiqarib tashlangan — kodni
 * og'zaki/qog'ozda uzatishda xato kamayadi.
 */
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 8;

/**
 * Bitta tasodifiy kirish kodi generatsiya qiladi (kriptografik RNG bilan).
 * Yakkalik DB UNIQUE(code) bilan kafolatlanadi; chaqiruvchi to'qnashuvda qayta uradi.
 * `rng` test uchun injektsiya qilinadi (default `crypto.randomInt`).
 */
export function generateAccessCode(rng: (max: number) => number = randomInt): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i += 1) {
    code += ALPHABET[rng(ALPHABET.length)];
  }
  return code;
}
