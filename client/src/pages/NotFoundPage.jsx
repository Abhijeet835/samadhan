import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Compass } from 'lucide-react';

import { Button } from '@/components/ui/button';

export default function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center">
      <Compass className="h-12 w-12 text-slate-300" aria-hidden="true" />
      <h1 className="mt-4 text-2xl font-bold text-slate-900">{t('notFound.title')}</h1>
      <p className="mt-2 text-slate-600">{t('notFound.body')}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Link to="/"><Button>{t('notFound.home')}</Button></Link>
        <Link to="/report"><Button variant="outline">{t('notFound.report')}</Button></Link>
        <Link to="/local"><Button variant="outline">{t('notFound.local')}</Button></Link>
      </div>
    </div>
  );
}
