import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function ProfilePage() {
  const { t } = useTranslation();
  const { user, updateProfile, changePassword, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');

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

  function handleProfileChange(e) {
    setProfileData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  }

  function handlePasswordChange(e) {
    setPasswordData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  }

  async function handleProfileSubmit(e) {
    e.preventDefault();
    setLoading(true);
    await updateProfile(profileData);
    setLoading(false);
  }

  async function handlePasswordSubmit(e) {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error(t('profile.password.mismatch'));
      return;
    }

    setLoading(true);
    const result = await changePassword(
      passwordData.currentPassword,
      passwordData.newPassword,
    );

    if (result.success) {
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    }

    setLoading(false);
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-600">{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">
            {t('profile.title')}
          </h1>
          <p className="text-slate-600 mt-2">{t('profile.subtitle')}</p>
        </div>

        {/* User Info Card */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-2xl font-bold">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-slate-900">
                  {user.name}
                </h2>
                <p className="text-slate-600">{user.email}</p>
                <div className="flex gap-2 mt-2">
                  <Badge variant="outline">{t(`auth.role.${user.role.toLowerCase()}`)}</Badge>
                  <Badge variant="outline">{user.activeMode}</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={activeTab === 'profile' ? 'default' : 'outline'}
            onClick={() => setActiveTab('profile')}
          >
            {t('profile.tabs.profile')}
          </Button>
          <Button
            variant={activeTab === 'password' ? 'default' : 'outline'}
            onClick={() => setActiveTab('password')}
          >
            {t('profile.tabs.password')}
          </Button>
        </div>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <Card>
            <CardHeader>
              <CardTitle>{t('profile.edit.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleProfileSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium text-slate-700 mb-1"
                  >
                    {t('auth.name')}
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    value={profileData.name}
                    onChange={handleProfileChange}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label
                    htmlFor="phone"
                    className="block text-sm font-medium text-slate-700 mb-1"
                  >
                    {t('auth.phone')}
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    pattern="[6-9][0-9]{9}"
                    value={profileData.phone}
                    onChange={handleProfileChange}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label
                    htmlFor="language"
                    className="block text-sm font-medium text-slate-700 mb-1"
                  >
                    {t('profile.language')}
                  </label>
                  <select
                    id="language"
                    name="language"
                    value={profileData.language}
                    onChange={handleProfileChange}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="en">English</option>
                    <option value="hi">हिन्दी</option>
                  </select>
                </div>

                <Button type="submit" disabled={loading}>
                  {loading ? t('common.loading') : t('profile.save')}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Password Tab */}
        {activeTab === 'password' && (
          <Card>
            <CardHeader>
              <CardTitle>{t('profile.password.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="currentPassword"
                    className="block text-sm font-medium text-slate-700 mb-1"
                  >
                    {t('profile.password.current')}
                  </label>
                  <input
                    id="currentPassword"
                    name="currentPassword"
                    type="password"
                    required
                    value={passwordData.currentPassword}
                    onChange={handlePasswordChange}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label
                    htmlFor="newPassword"
                    className="block text-sm font-medium text-slate-700 mb-1"
                  >
                    {t('profile.password.new')}
                  </label>
                  <input
                    id="newPassword"
                    name="newPassword"
                    type="password"
                    required
                    minLength={8}
                    value={passwordData.newPassword}
                    onChange={handlePasswordChange}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="block text-sm font-medium text-slate-700 mb-1"
                  >
                    {t('profile.password.confirm')}
                  </label>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    required
                    minLength={8}
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordChange}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <Button type="submit" disabled={loading}>
                  {loading ? t('common.loading') : t('profile.password.change')}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Logout */}
        <div className="mt-8">
          <Button variant="outline" onClick={logout} className="text-red-600">
            {t('profile.logout')}
          </Button>
        </div>
      </div>
    </div>
  );
}
