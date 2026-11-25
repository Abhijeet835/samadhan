// Bilingual API error mapping. NEVER render the server's English message to
// users — map the machine code to an i18n key; console.debug the raw message.
export function getErrorMessage(error, t) {
  if (!error) return t('errors.UNKNOWN');
  const code = error.response?.data?.error?.code;
  if (code) {
    if (error.response?.data?.error?.message) console.debug('[api]', code, error.response.data.error.message);
    const key = `errors.${code}`;
    const translated = t(key);
    return translated === key ? t('errors.UNKNOWN') : translated;
  }
  if (error.code === 'ECONNABORTED' || /timeout/i.test(error.message ?? '')) return t('errors.TIMEOUT');
  if (error.request || error.code === 'ERR_NETWORK' || /network/i.test(error.message ?? '')) return t('errors.NETWORK_ERROR');
  return t('errors.UNKNOWN');
}
