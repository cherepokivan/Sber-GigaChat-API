/**
 * GigaChat Open Client - Cookie Management Module
 * 
 * Manages the Access Token in browser cookies:
 * - Cookie name: gigachat_access_token
 * - Document.cookie with Path=/, SameSite=Lax, Max-Age
 * 
 * Warning: Cookies accessed via JavaScript are NOT HttpOnly.
 * Do not enter credentials on shared or untrusted computers.
 */

export const ACCESS_TOKEN_COOKIE_NAME = 'gigachat_access_token';

// Default expiration: 30 days max-age in seconds (token itself expires ~30 mins on GigaChat server)
const DEFAULT_MAX_AGE = 60 * 60 * 24 * 30;

/**
 * Retrieves the value of a cookie by name
 * @param {string} name - Cookie name
 * @returns {string} The cookie value, or empty string if not found
 */
export function getCookie(name: string): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/([.$?*|{}()[\]\\/+^])/g, '\\$1') + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : '';
}

/**
 * Sets a cookie with Path=/, SameSite=Lax, and specified maxAge in seconds
 * @param {string} name - Cookie name
 * @param {string} value - Cookie value
 * @param {number} [maxAge] - Max age in seconds
 */
export function setCookie(name: string, value: string, maxAge: number = DEFAULT_MAX_AGE): void {
  if (typeof document === 'undefined') return;
  const encodedValue = encodeURIComponent(value);
  document.cookie = `${name}=${encodedValue}; Path=/; SameSite=Lax; Max-Age=${maxAge}`;
}

/**
 * Deletes a cookie by name
 * @param {string} name - Cookie name
 */
export function deleteCookie(name: string): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; Path=/; SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}
