import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, Store, User } from 'lucide-react';

import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Logo from '@/components/Logo';
import { cn } from '@/lib/utils';

export default function RegisterPage() {
  const { t, i18n } = useTranslation();
  const { register } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'CONSUMER',
    language: i18n.language === 'hi' ? 'hi' : 'en',
  });

  function handleChange(e) {
    setFormError('');
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!/^[6-9]\d{9}$/.test(formData.phone.trim())) {
      setFormError(t('auth.phoneHint'));
      return;
    }
    setLoading(true);
    const res = await register({ ...formData, name: formData.name.trim(), email: formData.email.trim() });
    if (!res.success && res.error) setFormError(res.error);
    setLoading(false);
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-gradient-to-br from-slate-50 via-blue-50/40 to-teal-50/30 px-4 py-10">
      <Card className="mx-auto w-full max-w-lg shadow-lift">
        <CardHeader className="space-y-3">
          <div className="flex justify-center">
            <Logo size="lg" />
          </div>
          <CardTitle className="text-center text-2xl">{t('auth.register.title')}</CardTitle>
          <p className="text-center text-sm text-slate-600">{t('auth.register.subtitle')}</p>
        </CardHeader>
        <CardContent>
          {formError && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700" role="alert">
              {formError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <p className="mb-2 block text-sm font-medium text-slate-700">{t('auth.role.label')}</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {[
                  { value: 'CONSUMER', icon: User, title: t('auth.role.consumer'), desc: t('auth.role.consumerDesc'), active: 'border-blue-600 bg-blue-50/70 text-blue-900 ring-1 ring-blue-600' },
                  { value: 'PROVIDER', icon: Store, title: t('auth.role.provider'), desc: t('auth.role.providerDesc'), active: 'border-teal-700 bg-teal-50/70 text-teal-900 ring-1 ring-teal-700' },
                ].map((opt) => {
                  const Icon = opt.icon;
                  const selected = formData.role === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, role: opt.value }))}
                      aria-pressed={selected}
                      className={cn(
                        'flex items-start gap-3 rounded-xl border p-3.5 text-left transition',
                        selected ? opt.active : 'border-slate-200 bg-white hover:bg-slate-50',
                      )}
                    >
                      <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                      <div>
                        <p className="text-sm font-bold">{opt.title}</p>
                        <p className="mt-0.5 text-xs text-slate-600">{opt.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label htmlFor="name" className="mb-1 block text-sm font-medium text-slate-700">
                {t('auth.name')}
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                minLength={2}
                value={formData.name}
                onChange={handleChange}
                className="field-input"
                placeholder={t('auth.namePlaceholder')}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
                  {t('auth.email')}
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="field-input"
                  placeholder={t('auth.emailPlaceholder')}
                />
              </div>
              <div>
                <label htmlFor="phone" className="mb-1 block text-sm font-medium text-slate-700">
                  {t('auth.phone')}
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  required
                  pattern="[6-9][0-9]{9}"
                  value={formData.phone}
                  onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                  className="field-input"
                  placeholder={t('auth.phonePlaceholder')}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">
                {t('auth.password')}
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
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
              <p className="mt-1 text-xs text-slate-500">{t('auth.passwordHint')}</p>
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? t('common.loading') : t('auth.register.button')}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-slate-600">{t('auth.register.hasAccount')} </span>
            <Link to="/login" className="font-semibold text-primary hover:underline">
              {t('auth.register.loginLink')}
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
