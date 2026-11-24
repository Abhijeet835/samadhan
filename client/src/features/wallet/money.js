// Display-only conversion: the API and storage always use integer paise.
export function formatPaise(paise, lang = 'en') {
  const locale = lang?.startsWith('hi') ? 'hi-IN' : 'en-IN';
  const rupees = paise / 100;
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: Number.isInteger(rupees) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(rupees);
}

export function formatSignedPaise(paise, lang = 'en') {
  return paise > 0 ? `+${formatPaise(paise, lang)}` : formatPaise(paise, lang);
}

export function formatTxnDate(date, lang = 'en') {
  const locale = lang?.startsWith('hi') ? 'hi-IN' : 'en-IN';
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(date));
}