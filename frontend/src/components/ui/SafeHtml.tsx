import { sanitizeHtml } from '@/lib/sanitize';

interface Props {
  html: string;
  className?: string;
}

export function SafeHtml({ html, className }: Props) {
  return <div className={className} dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }} />;
}
