import { createContext, useContext, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { getErrorMessage } from '@/lib/errors';

const AuthContext = createContext(null);

function normalizeUserRole(user) {
  if (!user) return user;
  if (user.role === 'CITIZEN') return { ...user, role: 'CONSUMER' };
  if (user.role === 'HELPER') return { ...user, role: 'PROVIDER' };
  return user;
}

export function AuthProvider({ children }) {
  const { t } = useTranslation();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accessToken, setAccessToken] = useState(localStorage.getItem('accessToken'));
  const [refreshToken, setRefreshToken] = useState(localStorage.getItem('refreshToken'));

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (accessToken) {
      loadUser();
    } else {
      setLoading(false);
    }
    const onExpired = () => {
      setUser(null);
      clearTokens();
    };
    window.addEventListener('samadhan:auth-expired', onExpired);
    return () => window.removeEventListener('samadhan:auth-expired', onExpired);
  }, []);

  async function loadUser() {
    try {
      const response = await api.get('/auth/me');
      setUser(normalizeUserRole(response.data.user));
    } catch {
      if (refreshToken) {
        const refreshed = await tryRefreshToken();
        if (!refreshed) {
          setUser(null);
          clearTokens();
        }
      } else {
        setUser(null);
        clearTokens();
      }
    } finally {
      setLoading(false);
    }
  }

  async function tryRefreshToken() {
    try {
      const response = await api.post('/auth/refresh', null, {
        headers: { Authorization: `Bearer ${refreshToken}` },
      });
      const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data;
      setTokens(newAccessToken, newRefreshToken);
      const meRes = await api.get('/auth/me');
      setUser(normalizeUserRole(meRes.data.user));
      return true;
    } catch {
      return false;
    }
  }

  function setTokens(access, refresh) {
    setAccessToken(access);
    setRefreshToken(refresh);
    localStorage.setItem('accessToken', access);
    localStorage.setItem('refreshToken', refresh);
  }

  function clearTokens() {
    setAccessToken(null);
    setRefreshToken(null);
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }

  function redirectAfterAuth(authUser) {
    if (location.state?.from) {
      navigate(location.state.from, { replace: true });
      return;
    }
    if (authUser.role === 'ADMIN') {
      navigate('/admin', { replace: true });
    } else if (authUser.role === 'PROVIDER') {
      navigate('/local/dashboard', { replace: true });
    } else {
      navigate('/issues', { replace: true });
    }
  }

  async function register(userData) {
    try {
      const response = await api.post('/auth/register', userData);
      const { user: rawUser, accessToken: aToken, refreshToken: rToken } = response.data;
      const newUser = normalizeUserRole(rawUser);

      setUser(newUser);
      setTokens(aToken, rToken);

      toast.success(t('auth.toast.registerSuccess'));
      if (newUser.role === 'PROVIDER') {
        navigate('/local/register', { replace: true });
      } else {
        redirectAfterAuth(newUser);
      }
      return { success: true };
    } catch (error) {
      const message = getErrorMessage(error, t);
      toast.error(message);
      return { success: false, error: message };
    }
  }

  async function login(credentials) {
    try {
      const response = await api.post('/auth/login', credentials);
      const { user: rawUser, accessToken: aToken, refreshToken: rToken } = response.data;
      const loggedInUser = normalizeUserRole(rawUser);

      setUser(loggedInUser);
      setTokens(aToken, rToken);

      toast.success(t('auth.toast.loginSuccess', { name: loggedInUser.name }));
      redirectAfterAuth(loggedInUser);
      return { success: true };
    } catch (error) {
      const message = getErrorMessage(error, t);
      toast.error(message);
      return { success: false, error: message };
    }
  }

  function logout() {
    setUser(null);
    clearTokens();
    toast.success(t('auth.toast.logoutSuccess'));
    navigate('/');
  }

  async function updateProfile(updates) {
    try {
      const response = await api.patch('/auth/profile', updates);
      const updated = normalizeUserRole(response.data.user);
      setUser(updated);
      toast.success(t('auth.toast.profileUpdated'));
      return { success: true, user: updated };
    } catch (error) {
      const message = getErrorMessage(error, t);
      toast.error(message);
      return { success: false, error: message };
    }
  }

  async function switchMode(mode) {
    try {
      const response = await api.post('/auth/switch-mode', { mode });
      setUser(normalizeUserRole(response.data.user));
      toast.success(mode === 'GLOBAL' ? t('auth.toast.modeGlobal') : t('auth.toast.modeLocal'));
      return { success: true };
    } catch (error) {
      const message = getErrorMessage(error, t);
      toast.error(message);
      return { success: false, error: message };
    }
  }

  async function changePassword(currentPassword, newPassword) {
    try {
      await api.post('/auth/change-password', { currentPassword, newPassword });
      toast.success(t('auth.toast.passwordChanged'));
      return { success: true };
    } catch (error) {
      const message = getErrorMessage(error, t);
      toast.error(message);
      return { success: false, error: message };
    }
  }

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    register,
    login,
    logout,
    updateProfile,
    switchMode,
    changePassword,
    refreshUser: loadUser,
    accessToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
