export const MAX_SECONDS = 2147483647;

export function pageKey(value) {
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password ||
        url.hostname === 'chromewebstore.google.com' ||
        (url.hostname === 'chrome.google.com' && url.pathname.startsWith('/webstore'))) return null;
    url.hash = '';
    return url.href;
  } catch { return null; }
}

export function validSeconds(value) {
  return Number.isSafeInteger(value) && value >= 1 && value <= MAX_SECONDS;
}

export function parseInterval(minutes, seconds) {
  if (![minutes, seconds].every(value => typeof value === 'string' && /^\d+$/.test(value))) {
    throw new Error('Enter whole, non-negative numbers in both fields.');
  }
  const total = Number(minutes) * 60 + Number(seconds);
  if (!validSeconds(total)) throw new Error('Choose 1 to 2,147,483,647 seconds in total.');
  return total;
}

export function cleanRules(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter(([url,seconds]) => pageKey(url) === url && validSeconds(seconds)));
}

export function sitePattern(value) {
  const url = new URL(value);
  // Chrome host match patterns ignore ports; page rules still include them.
  return `${url.protocol}//${url.hostname}/*`;
}

export function duration(seconds) {
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}
