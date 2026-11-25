// Single source of truth for display formatting. Storage/API stay UTC + paise.
// Latin digits everywhere (numberingSystem 'latn') so Hindi UI keeps 0-9.
import { formatPaise, formatSignedPaise, formatTxnDate } from '@/features/wallet/money';

const localeFor = (lang) => (lang?.startsWith('hi') ? 'hi-IN' : 'en-IN');

export { formatPaise, formatSignedPaise, formatTxnDate };
export const formatRupees = formatPaise;

export function formatDate(date, lang = 'en') {
  return new Intl.DateTimeFormat(localeFor(lang), { dateStyle: 'medium', numberingSystem: 'latn' }).format(new Date(date));
}

export function formatDateTime(date, lang = 'en') {
  return new Intl.DateTimeFormat(localeFor(lang), { dateStyle: 'medium', timeStyle: 'short', numberingSystem: 'latn' }).format(new Date(date));
}

export function formatRelative(date, lang = 'en') {
  const diffMs = new Date(date).getTime() - Date.now();
  const abs = Math.abs(diffMs);
  const rtf = new Intl.RelativeTimeFormat(localeFor(lang), { numeric: 'auto', numberingSystem: 'latn' });
  const min = 60_000, hr = 3_600_000, day = 86_400_000;
  if (abs < hr) return rtf.format(Math.round(diffMs / min), 'minute');
  if (abs < day) return rtf.format(Math.round(diffMs / hr), 'hour');
  if (abs < 30 * day) return rtf.format(Math.round(diffMs / day), 'day');
  return formatDate(date, lang);
}
