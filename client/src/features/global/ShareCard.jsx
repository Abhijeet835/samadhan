import { forwardRef } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * 1080×1080 share card rendered off-screen and rasterised with html-to-image.
 * No money anywhere. Hindi renders with the loaded Noto Sans Devanagari.
 */
export const ShareCardRender = forwardRef(function ShareCardRender({ issue, lang = 'en' }, ref) {
  const { i18n } = useTranslation();
  const t = i18n.getFixedT(lang);
  const title = issue.title ?? '';
  const city = issue.location?.city ?? '';
  const photo = issue.photos?.[0];

  return (
    <div
      ref={ref}
      aria-hidden="true"
      style={{
        position: 'fixed',
        left: '-12000px',
        top: 0,
        width: 1080,
        height: 1080,
        fontFamily: "'Inter', 'Noto Sans Devanagari', system-ui, sans-serif",
        background: 'linear-gradient(150deg, #0f172a 0%, #1e3a5f 45%, #0f766e 100%)',
        color: '#f8fafc',
        display: 'flex',
        flexDirection: 'column',
        padding: 72,
        boxSizing: 'border-box',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div
          style={{
            width: 56, height: 56, borderRadius: 16,
            background: 'linear-gradient(135deg, #38bdf8, #2dd4bf)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 30, fontWeight: 800, color: '#0f172a',
          }}
        >
          स
        </div>
        <div>
          <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.01em' }}>Samadhan</div>
          <div style={{ fontSize: 18, color: '#94a3b8' }}>{t('share.cardBrand')}</div>
        </div>
        <div
          style={{
            marginLeft: 'auto', fontSize: 20, fontWeight: 700, padding: '10px 22px',
            borderRadius: 999, background: issue.tier >= 2 ? 'rgba(167,139,250,.2)' : 'rgba(251,191,36,.18)',
            color: issue.tier >= 2 ? '#c4b5fd' : '#fcd34d',
            border: `2px solid ${issue.tier >= 2 ? 'rgba(167,139,250,.4)' : 'rgba(251,191,36,.4)'}`,
          }}
        >
          {issue.tier >= 2 ? t('tier.escalated') : t('tier.spotlight')}
        </div>
      </div>

      {photo && (
        <img
          src={photo}
          crossOrigin="anonymous"
          alt=""
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
          style={{ width: '100%', height: 300, objectFit: 'cover', borderRadius: 24, marginTop: 40 }}
        />
      )}

      <div style={{ marginTop: photo ? 36 : 80, fontSize: 22, fontWeight: 700, color: '#5eead4', textTransform: 'uppercase', letterSpacing: '.08em' }}>
        {t(`issues.categories.${issue.category}`)}{city ? ` · ${city}` : ''}
      </div>
      <div
        style={{
          marginTop: 20, fontSize: title.length > 90 ? 46 : 58, fontWeight: 800, lineHeight: 1.22,
          display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}
      >
        {title}
      </div>

      <div style={{ marginTop: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 28, fontWeight: 700, color: '#e2e8f0' }}>
          <span style={{ width: 14, height: 14, borderRadius: 999, background: '#2dd4bf' }} />
          {t('share.cardSupporters', { count: issue.supporterCount ?? 0 })}
        </div>
        <div style={{ marginTop: 26, paddingTop: 26, borderTop: '2px solid rgba(148,163,184,.25)', fontSize: 19, color: '#94a3b8', lineHeight: 1.5 }}>
          {t('share.cardDisclaimer')}
        </div>
      </div>
    </div>
  );
});

export async function shareCardPng(node) {
  await document.fonts.ready;
  const { toPng } = await import('html-to-image');
  return toPng(node, { width: 1080, height: 1080, pixelRatio: 1, cacheBust: true });
}
