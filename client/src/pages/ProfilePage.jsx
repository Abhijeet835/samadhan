import { useEffect, useState, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Eye, EyeOff } from 'lucide-react';

import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const LocationPicker = lazy(() => import('@/features/maps/LocationPicker'));

export default function ProfilePage() {
  const { t, i18n } = useTranslation();
  const { user, updateProfile, changePassword, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [showPwd, setShowPwd] = useState(false);

  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    language: user?.language || 'en',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const homeCoords = user?.homeLocation?.coordinates;
  const [home, setHome] = useState({
    lat: homeCoords?.[1], lng: homeCoords?.[0],
    address: user?.homeLocation?.address ?? '', city: user?.homeLocation?.city ?? '',
    state: user?.homeLocation?.state ?? '', pincode: user?.homeLocation?.pincode ?? '',
  });

  useEffect(() => {
    if (!user) return;
    setProfileData({
      name: user.name || '',
      phone: user.phone || '',
      language: user.language || 'en',
    });
    if (user.homeLocation?.coordinates) {
      setHome({
        lat: user.homeLocation.coordinates[1],
        lng: user.homeLocation.coordinates[0],
        address: user.homeLocation.address ?? '',
        city: user.homeLocation.city ?? '',
        state: user.homeLocation.state ?? '',
        pincode: user.homeLocation.pincode ?? '',
      });
    }
  }, [user]);

  async function saveHome() {
    if (!Number.isFinite(home.lat) || !Number.isFinite(home.lng)) {
      toast.error(t('maps.pickLocationFirst'));
      return;
    }
    const result = await updateProfile({
      homeLocation: { coordinates: [home.lng, home.lat], address: home.address, city: home.city, state: home.state, pincode: home.pincode },
    });
    if (result?.success !== false) toast.success(t('maps.homeSaved'));
  }

  function handleProfileChange(e) {
    setProfileData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handlePasswordChange(e) {
    setPasswordData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleProfileSubmit(e) {
    e.preventDefault();
    setLoading(true);
    const res = await updateProfile(profileData);
    if (res?.success && profileData.language !== i18n.language) {
      i18n.changeLanguage(profileData.language);
      localStorage.setItem('i18nextLng', profileData.language);
    }
    setLoading(false);
  }

  async function handlePasswordSubmit(e) {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error(t('profile.password.mismatch'));
      return;
    }
    setLoading(true);
    const result = await changePassword(passwordData.currentPassword, passwordData.newPassword);
    if (result.success) {
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    }
    setLoading(false);
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-slate-600">{t('common.loading')}</p>
      </div>
    );
  }

  const roleKey = (user.role || 'CONSUMER').toLowerCase();

  return (
    <div className="min-h-screen bg-slate-50/70 py-8">
      <div className="mx-auto max-w-4xl px-4">
        <div className="mb-6">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">{t('profile.title')}</h1>
          <p className="mt-1.5 text-slate-600">{t('profile.subtitle')}</p>
        </div>

        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-teal-600 text-2xl font-bold text-white">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-xl font-bold text-slate-900">{user.name}</h2>
                <p className="truncate text-sm text-slate-600">{user.email}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge variant="outline">{t(`auth.role.${roleKey}`)}</Badge>
                  <Badge variant="outline">{user.activeMode === 'LOCAL' ? t('nav.local') : t('nav.global')}</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="tab-bar mb-6 max-w-sm" role="tablist">
          {['profile', 'password'].map((tabKey) => (
            <button
              key={tabKey}
              type="button"
              role="tab"
              aria-selected={activeTab === tabKey}
              onClick={() => setActiveTab(tabKey)}
              className={cn('tab-pill', activeTab === tabKey ? 'tab-pill-active' : 'tab-pill-idle')}
            >
              {t(`profile.tabs.${tabKey}`)}
            </button>
          ))}
        </div>

        {activeTab === 'profile' && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>{t('profile.edit.title')}</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleProfileSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="name" className="mb-1 block text-sm font-medium text-slate-700">{t('auth.name')}</label>
                    <input id="name" name="name" type="text" value={profileData.name} onChange={handleProfileChange} className="field-input" />
                  </div>
                  <div>
                    <label htmlFor="phone" className="mb-1 block text-sm font-medium text-slate-700">{t('auth.phone')}</label>
                    <input id="phone" name="phone" type="tel" pattern="[6-9][0-9]{9}" value={profileData.phone} onChange={handleProfileChange} className="field-input" />
                  </div>
                  <div>
                    <label htmlFor="language" className="mb-1 block text-sm font-medium text-slate-700">{t('profile.language')}</label>
                    <select id="language" name="language" value={profileData.language} onChange={handleProfileChange} className="field-input">
                      <option value="en">{t('nav.english')}</option>
                      <option value="hi">{t('nav.hindi')}</option>
                    </select>
                  </div>
                  <Button type="submit" disabled={loading}>{loading ? t('common.loading') : t('profile.save')}</Button>
                </form>
              </CardContent>
            </Card>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle>{t('maps.homeLocation')}</CardTitle>
              </CardHeader>
              <CardContent>
                <Suspense fallback={<div className="h-[300px] animate-pulse rounded-xl bg-slate-100" />}>
                  <LocationPicker value={home} onChange={(p) => setHome((prev) => ({ ...prev, ...p }))} />
                </Suspense>
                <Button type="button" className="mt-3" onClick={saveHome}>{t('maps.saveHome')}</Button>
              </CardContent>
            </Card>
          </>
        )}

        {activeTab === 'password' && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{t('profile.password.title')}</CardTitle>
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary"
              >
                {showPwd ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                {showPwd ? t('auth.hidePassword') : t('auth.showPassword')}
              </button>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div>
                  <label htmlFor="currentPassword" className="mb-1 block text-sm font-medium text-slate-700">{t('profile.password.current')}</label>
                  <input id="currentPassword" name="currentPassword" type={showPwd ? 'text' : 'password'} required value={passwordData.currentPassword} onChange={handlePasswordChange} className="field-input" />
                </div>
                <div>
                  <label htmlFor="newPassword" className="mb-1 block text-sm font-medium text-slate-700">{t('profile.password.new')}</label>
                  <input id="newPassword" name="newPassword" type={showPwd ? 'text' : 'password'} required minLength={8} value={passwordData.newPassword} onChange={handlePasswordChange} className="field-input" />
                </div>
                <div>
                  <label htmlFor="confirmPassword" className="mb-1 block text-sm font-medium text-slate-700">{t('profile.password.confirm')}</label>
                  <input id="confirmPassword" name="confirmPassword" type={showPwd ? 'text' : 'password'} required minLength={8} value={passwordData.confirmPassword} onChange={handlePasswordChange} className="field-input" />
                </div>
                <Button type="submit" disabled={loading}>{loading ? t('common.loading') : t('profile.password.change')}</Button>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="mt-8">
          <Button variant="outline" onClick={logout} className="text-red-600">{t('profile.logout')}</Button>
        </div>
      </div>
    </div>
  );
}
