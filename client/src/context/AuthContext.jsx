import { createContext, useContext, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '@/lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accessToken, setAccessToken] = useState(
    localStorage.getItem('accessToken'),
  );
  const [refreshToken, setRefreshToken] = useState(
    localStorage.getItem('refreshToken'),
  );

  const navigate = useNavigate();
  const location = useLocation();

  // Load user on mount if token exists
  useEffect(() => {
    if (accessToken) {
      loadUser();
    } else {
      setLoading(false);
    }
  }, []);

  // Load current user profile
  async function loadUser() {
    try {
      const response = await api.get('/auth/me');
      setUser(response.data.user);
    } catch (error) {
      console.error('Failed to load user:', error);
      // Token might be expired, try refresh
      if (refreshToken) {
        const refreshed = await tryRefreshToken();
        if (!refreshed) {
          logout();
        }
      } else {
        logout();
      }
    } finally {
      setLoading(false);
    }
  }

  // Try to refresh access token
  async function tryRefreshToken() {
    try {
      const response = await api.post('/auth/refresh', null, {
        headers: {
          Authorization: `Bearer ${refreshToken}`,
        },
      });

      const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
        response.data;

      setTokens(newAccessToken, newRefreshToken);
      await loadUser();
      return true;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return false;
    }
  }

  // Set tokens in state and localStorage
  function setTokens(access, refresh) {
    setAccessToken(access);
    setRefreshToken(refresh);
    localStorage.setItem('accessToken', access);
    localStorage.setItem('refreshToken', refresh);
  }

  // Clear tokens
  function clearTokens() {
    setAccessToken(null);
    setRefreshToken(null);
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }

  // Register new user
  async function register(userData) {
    try {
      const response = await api.post('/auth/register', userData);
      const { user: newUser, accessToken, refreshToken } = response.data;

      setUser(newUser);
      setTokens(accessToken, refreshToken);

      toast.success('Registration successful! Welcome to Samadhan.');
      navigate('/');
      return { success: true };
    } catch (error) {
      const message =
        error.response?.data?.error?.message ||
        'Registration failed. Please try again.';
      toast.error(message);
      return { success: false, error: message };
    }
  }

  // Login user
  async function login(credentials) {
    try {
      const response = await api.post('/auth/login', credentials);
      const { user: loggedInUser, accessToken, refreshToken } = response.data;

      setUser(loggedInUser);
      setTokens(accessToken, refreshToken);

      toast.success(`Welcome back, ${loggedInUser.name}!`);
      navigate(location.state?.from || '/');
      return { success: true };
    } catch (error) {
      const message =
        error.response?.data?.error?.message ||
        'Login failed. Please check your credentials.';
      toast.error(message);
      return { success: false, error: message };
    }
  }

  // Logout user
  function logout() {
    setUser(null);
    clearTokens();
    toast.success('Logged out successfully');
    navigate('/');
  }

  // Update profile
  async function updateProfile(updates) {
    try {
      const response = await api.patch('/auth/profile', updates);
      setUser(response.data.user);
      toast.success('Profile updated successfully');
      return { success: true, user: response.data.user };
    } catch (error) {
      const message =
        error.response?.data?.error?.message ||
        'Failed to update profile. Please try again.';
      toast.error(message);
      return { success: false, error: message };
    }
  }

  // Switch mode (GLOBAL/LOCAL)
  async function switchMode(mode) {
    try {
      const response = await api.post('/auth/switch-mode', { mode });
      setUser(response.data.user);
      toast.success(
        mode === 'GLOBAL'
          ? 'Switched to Global Issues mode'
          : 'Switched to Local Helpers mode',
      );
      return { success: true };
    } catch (error) {
      const message =
        error.response?.data?.error?.message || 'Failed to switch mode';
      toast.error(message);
      return { success: false, error: message };
    }
  }

  // Change password
  async function changePassword(currentPassword, newPassword) {
    try {
      await api.post('/auth/change-password', {
        currentPassword,
        newPassword,
      });
      toast.success('Password changed successfully');
      return { success: true };
    } catch (error) {
      const message =
        error.response?.data?.error?.message ||
        'Failed to change password. Please try again.';
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
    accessToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Custom hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
