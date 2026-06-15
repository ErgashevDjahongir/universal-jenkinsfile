import DOMPurify from 'dompurify';

const ALLOWED_TAGS = ['b', 'i', 'strong', 'em', 'p', 'br', 'span'];
const ALLOWED_ATTR = ['style'];
const TEXT_ALIGN_RE = /^text-align:\s*(left|center|right|justify)\s*$/;

DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  const el = node as Element;
  if (typeof el.hasAttribute === 'function' && el.hasAttribute('style')) {
    const raw = el.getAttribute('style') ?? '';
    const safe = raw
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s && TEXT_ALIGN_RE.test(s))
      .join('; ');
    if (safe) el.setAttribute('style', safe);
    else el.removeAttribute('style');
  }
});

export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, { ALLOWED_TAGS, ALLOWED_ATTR });
}

export function isHtmlEmpty(html: string): boolean {
  return html.replace(/<[^>]*>/g, '').trim().length === 0;
}
