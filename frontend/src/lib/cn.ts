/**
 * Tailwind klass nomlarini shartli birlashtirish uchun yengil yordamchi.
 * `false | null | undefined` qiymatlar tashlab yuboriladi.
 */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}
