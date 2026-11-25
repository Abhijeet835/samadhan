import { useTranslation } from 'react-i18next';
import { ISSUE_PINS, HELPER_PINS } from './pins';

export default function MapLegend({ kind = 'issue' }) {
  const { t } = useTranslation();
  const pins = kind === 'helper' ? HELPER_PINS : ISSUE_PINS;
  const ns = kind === 'helper' ? 'local.categories' : 'issues.categories';
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 rounded-lg bg-white/90 p-2 text-[10px] shadow ring-1 ring-slate-200">
      {Object.entries(pins).map(([key, { color, glyph }]) => (
        <span key={key} className="inline-flex items-center gap-1 text-slate-600">
          <span className="inline-flex h-4 w-4 items-center justify-center rounded-full text-[9px]" style={{ background: color }}>{glyph}</span>
          {t(`${ns}.${key}`)}
        </span>
      ))}
    </div>
  );
}
