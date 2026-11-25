import { Component } from 'react';
import i18n from '@/i18n';

/** Top-level friendly bilingual error screen. No external reporting. */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    console.debug('[ErrorBoundary]', error);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    const t = i18n.t.bind(i18n);
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
        <h1 className="text-2xl font-bold text-slate-900">{t('errorBoundary.title')}</h1>
        <p className="mt-2 max-w-sm text-slate-600">{t('errorBoundary.body')}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-6 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white"
        >
          {t('errorBoundary.reload')}
        </button>
      </div>
    );
  }
}
