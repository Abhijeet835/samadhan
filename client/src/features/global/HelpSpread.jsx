import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Copy, Download, ExternalLink, Loader2, Megaphone } from 'lucide-react';

import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { PLATFORM_STYLES } from './OfficialCampaigns';
import { ShareCardRender, shareCardPng } from './ShareCard';
import { useIssueSocial } from './useIssueSocial';

const PLATFORMS = ['X', 'INSTAGRAM', 'FACEBOOK', 'REDDIT', 'WHATSAPP', 'TELEGRAM'];

const shareUrlFrom = (caption) => (caption.match(/https?:\/\/[^\s]+/g) ?? []).pop() ?? '';

function intentUrl(platform, { caption, shareUrl, title }) {
  const enc = encodeURIComponent;
  switch (platform) {
    case 'X': return `https://x.com/intent/post?text=${enc(caption)}`;
    case 'FACEBOOK': return `https://www.facebook.com/sharer/sharer.php?u=${enc(shareUrl)}`;
    case 'REDDIT': return `https://www.reddit.com/submit?url=${enc(shareUrl)}&title=${enc(title)}`;
    case 'WHATSAPP': return `https://wa.me/?text=${enc(caption)}`;
    case 'TELEGRAM': return `https://t.me/share/url?url=${enc(shareUrl)}&text=${enc(caption)}`;
    default: return null;
  }
}

/** SECONDARY citizen sharing — the official campaigns above are the proof. */
export default function HelpSpread({ issue }) {
  const { t, i18n } = useTranslation();
  const { data } = useIssueSocial(issue._id, issue.tier);
  const posts = data?.posts ?? [];
  const [platform, setPlatform] = useState('X');
  const [lang, setLang] = useState(i18n.language?.startsWith('hi') ? 'hi' : 'en');
  const [downloading, setDownloading] = useState(false);
  const cardRef = useRef(null);

  const post = posts.find((p) => p.platform === platform);
  const caption = post ? (lang === 'hi' ? post.captionHi : post.captionEn) : '';
  const shareUrl = shareUrlFrom(caption);
  const charCount = [...caption].length;

  const fireClick = () => {
    if (post) api.post(`/social/${post._id}/click`).catch(() => {});
  };

  async function copyCaption() {
    try {
      await navigator.clipboard.writeText(caption);
      toast.success(t('share.copied'));
      fireClick();
    } catch {
      toast.error(t('share.copyFailed'));
    }
  }

  async function downloadCard() {
    if (downloading || !cardRef.current) return;
    setDownloading(true);
    try {
      const dataUrl = await shareCardPng(cardRef.current);
      const file = await (await fetch(dataUrl)).blob();
      const name = `samadhan-${issue._id}.png`;
      if (navigator.canShare?.({ files: [new File([file], name, { type: 'image/png' })] })) {
        await navigator.share({ files: [new File([file], name, { type: 'image/png' })] });
      } else {
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = name;
        link.click();
      }
      fireClick();
    } catch (error) {
      if (error?.name !== 'AbortError') toast.error(t('share.downloadFailed'));
    } finally {
      setDownloading(false);
    }
  }

  if (!posts.length) return null;

  const intent = intentUrl(platform, { caption, shareUrl, title: post?.titleEn || issue.title });

  return (
    <Card>
      <CardContent className="pt-5">
        <p className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <Megaphone className="h-4 w-4 text-blue-600" aria-hidden="true" />
          {t('share.title')}
        </p>
        <p className="mt-0.5 text-xs text-slate-500">{t('share.subtitle')}</p>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {PLATFORMS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPlatform(p)}
              className={cn(
                'rounded-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide transition-opacity',
                PLATFORM_STYLES[p],
                platform === p ? 'opacity-100 ring-2 ring-blue-400 ring-offset-1' : 'opacity-50 hover:opacity-80',
              )}
            >
              {p}
            </button>
          ))}
        </div>

        <div className="mt-3 flex items-center justify-between">
          <div className="flex gap-1 rounded-lg bg-slate-100 p-0.5">
            {['en', 'hi'].map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLang(l)}
                className={cn(
                  'rounded-md px-2.5 py-1 text-xs font-semibold',
                  lang === l ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500',
                )}
              >
                {l === 'en' ? t('share.langEn') : t('share.langHi')}
              </button>
            ))}
          </div>
          {platform === 'X' && (
            <span className={cn('text-xs font-semibold tabular-nums', charCount > 280 ? 'text-red-600' : 'text-slate-400')}>
              {t('share.chars', { count: charCount })}
            </span>
          )}
        </div>

        <pre className="mt-2 max-h-40 overflow-y-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-xs leading-relaxed text-slate-700">
          {caption || t('common.loading')}
        </pre>

        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={copyCaption} disabled={!caption}>
            <Copy className="h-3.5 w-3.5" aria-hidden="true" />
            {t('share.copy')}
          </Button>
          {platform === 'INSTAGRAM' ? (
            <Button size="sm" className="gap-1.5" onClick={downloadCard} disabled={downloading}>
              {downloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" aria-hidden="true" />}
              {t('share.downloadCard')}
            </Button>
          ) : (
            <>
              {intent && (
                <a href={intent} target="_blank" rel="noopener noreferrer" onClick={fireClick}>
                  <Button size="sm" className="gap-1.5">
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                    {t('share.openShare', { platform })}
                  </Button>
                </a>
              )}
              <Button variant="outline" size="sm" className="gap-1.5" onClick={downloadCard} disabled={downloading}>
                {downloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" aria-hidden="true" />}
                {t('share.downloadCard')}
              </Button>
            </>
          )}
        </div>
        {platform === 'INSTAGRAM' && (
          <p className="mt-2 text-[11px] text-slate-400">{t('share.igHint')}</p>
        )}
      </CardContent>

      <ShareCardRender ref={cardRef} issue={issue} lang={lang} />
    </Card>
  );
}
