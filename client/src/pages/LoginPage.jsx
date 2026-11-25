import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, KeyRound, ShieldCheck, Store, User } from 'lucide-react';

import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Logo from '@/components/Logo';

const DEMO_ACCOUNTS = [
  { key: 'consumer', email: 'consumer@samadhan.local', pass: 'Demo@12345', icon: User, tone: 'border-blue-200 bg-blue-50/70 text-blue-800 hover:bg-blue-100/70' },
  { key: 'provider', email: 'provider@samadhan.local', pass: 'Demo@12345', icon: Store, tone: 'border-teal-200 bg-teal-50/70 text-teal-800 hover:bg-teal-100/70' },
  { key: 'admin', email: 'admin@samadhan.local', pass: 'Admin@12345', icon: ShieldCheck, tone: 'border-violet-200 bg-violet-50/70 text-violet-800 hover:bg-violet-100/70' },
];

export default function LoginPage() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState('');
  const [formData, setFormData] = useState({ email: '', password: '' });

  function handleChange(e) {
    setFormError('');
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!formData.email.trim() || !formData.password) {
      setFormError(t('auth.validation.requiredFields'));
      return;
    }
    setLoading(true);
    const res = await login({ email: formData.email.trim(), password: formData.password });
    if (!res.success && res.error) setFormError(res.error);
    setLoading(false);
  }

  async function quickLogin(account) {
    setFormData({ email: account.email, password: account.pass });
    setFormError('');
    setLoading(true);
    const res = await login({ email: account.email, password: account.pass });
    if (!res.success && res.error) setFormError(res.error);
    setLoading(false);
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-gradient-to-br from-slate-50 via-blue-50/40 to-teal-50/30 px-4 py-10">
      <div className="mx-auto grid max-w-4xl gap-6 lg:grid-cols-5 lg:items-start">
        <Card className="shadow-lift lg:col-span-3">
          <CardHeader className="space-y-3">
            <div className="flex justify-center">
              <Logo size="lg" />
            </div>
            <CardTitle className="text-center text-2xl">{t('auth.login.title')}</CardTitle>
            <p className="text-center text-sm text-slate-600">{t('auth.login.subtitle')}</p>
          </CardHeader>
          <CardContent>
            {formError && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700" role="alert">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700">
                  {t('auth.email')}
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="field-input"
                  placeholder={t('auth.emailPlaceholder')}
                />
              </div>

              <div>
                <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-700">
                  {t('auth.password')}
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={formData.password}
                    onChange={handleChange}
                    className="field-input pr-11"
                    placeholder={t('auth.passwordPlaceholder')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? t('common.loading') : t('auth.login.button')}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm">
              <span className="text-slate-600">{t('auth.login.noAccount')} </span>
              <Link to="/register" className="font-semibold text-primary hover:underline">
                {t('auth.login.registerLink')}
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/90 shadow-soft lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <KeyRound className="h-4 w-4 text-primary" aria-hidden="true" />
              {t('auth.demo.title')}
            </CardTitle>
            <p className="text-xs leading-relaxed text-slate-500">{t('auth.demo.subtitle')}</p>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {DEMO_ACCOUNTS.map((acc) => {
              const Icon = acc.icon;
              return (
                <button
                  key={acc.key}
                  type="button"
                  disabled={loading}
                  onClick={() => quickLogin(acc)}
                  className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition ${acc.tone}`}
                >
                  <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold">{t(`auth.demo.${acc.key}Title`)}</p>
                    <p className="text-[11px] opacity-80">{t(`auth.demo.${acc.key}Desc`)}</p>
                    <p className="mt-1 truncate font-mono text-[10px] opacity-75">{acc.email}</p>
                  </div>
                </button>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
