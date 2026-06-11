/**
 * Token saqlash strategiyasi:
 *  - access token — faqat xotirada (modul o'zgaruvchisi). Sahifa yangilanganda
 *    yo'qoladi; XSS yuzasini kichraytiradi.
 *  - refresh token — localStorage'da, sahifa yangilangach sessiyani tiklash uchun.
 *    Bootstrap'da uning yordamida yangi access token olinadi.
 */
const REFRESH_KEY = 'etest.refreshToken';

let accessToken: string | null = null;

export const tokenStorage = {
  getAccessToken(): string | null {
    return accessToken;
  },
  setAccessToken(token: string | null): void {
    accessToken = token;
  },
  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_KEY);
  },
  setRefreshToken(token: string | null): void {
    if (token) {
      localStorage.setItem(REFRESH_KEY, token);
    } else {
      localStorage.removeItem(REFRESH_KEY);
    }
  },
  setTokens(access: string, refresh: string): void {
    accessToken = access;
    this.setRefreshToken(refresh);
  },
  clear(): void {
    accessToken = null;
    this.setRefreshToken(null);
  },
};
