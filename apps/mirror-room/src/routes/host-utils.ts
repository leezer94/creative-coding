/**
 * `randomUUID()` is missing in non-secure HTTP (e.g. http://192.168.x.x on some browsers).
 */
export function newSessionId(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === 'function') {
    return c.randomUUID().replace(/-/g, '').slice(0, 10);
  }
  if (c && typeof c.getRandomValues === 'function') {
    const buf = new Uint8Array(8);
    c.getRandomValues(buf);
    let hex = '';
    for (let i = 0; i < buf.length; i++) {
      hex += buf[i].toString(16).padStart(2, '0');
    }
    return hex.slice(0, 10);
  }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`.slice(
    0,
    10
  );
}

/**
 * Clipboard API is absent on insecure HTTP in some browsers (e.g. Safari over LAN).
 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* use fallback */
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.append(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}
