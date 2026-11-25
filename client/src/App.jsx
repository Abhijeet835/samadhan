import { Toaster } from 'react-hot-toast';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import SiteLayout from '@/components/layout/SiteLayout';
import LandingPage from '@/pages/LandingPage';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import ProfilePage from '@/pages/ProfilePage';
import WalletPage from '@/pages/WalletPage';
import IssuesPage from '@/pages/IssuesPage';
import IssueDetailPage from '@/pages/IssueDetailPage';
import ReportPage from '@/pages/ReportPage';
import MyActivityPage from '@/pages/MyActivityPage';
import AdminDispatchPage from '@/pages/AdminDispatchPage';
import TrendingPage from '@/pages/TrendingPage';
import AdminSocialPage from '@/pages/AdminSocialPage';
import AdminHelpersPage from '@/pages/AdminHelpersPage';
import LocalLayout from '@/features/local/LocalLayout';
import LocalHomePage from '@/pages/LocalHomePage';
import HelperSearchPage from '@/pages/HelperSearchPage';
import HelperProfilePage from '@/pages/HelperProfilePage';
import HelperRegisterPage from '@/pages/HelperRegisterPage';
import HelperDashboardPage from '@/pages/HelperDashboardPage';
import ProtectedRoute from '@/components/ProtectedRoute';
import { AuthProvider } from '@/context/AuthContext';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 4000,
            style: {
              borderRadius: '12px',
              background: '#0F172A',
              color: '#F8FAFC',
              fontSize: '14px',
            },
          }}
        />

        <Routes>
          <Route element={<SiteLayout />}>
            <Route index element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/issues" element={<IssuesPage />} />
            <Route path="/trending" element={<TrendingPage />} />
            <Route element={<LocalLayout />}>
              <Route path="/local" element={<LocalHomePage />} />
              <Route path="/local/search" element={<HelperSearchPage />} />
              <Route path="/local/helpers/:helperId" element={<HelperProfilePage />} />
              <Route
                path="/local/register"
                element={
                  <ProtectedRoute>
                    <HelperRegisterPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/local/dashboard"
                element={
                  <ProtectedRoute>
                    <HelperDashboardPage />
                  </ProtectedRoute>
                }
              />
            </Route>
            <Route path="/issues/:issueId" element={<IssueDetailPage />} />
            <Route
              path="/report"
              element={
                <ProtectedRoute>
                  <ReportPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/wallet"
              element={
                <ProtectedRoute>
                  <WalletPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-activity"
              element={
                <ProtectedRoute>
                  <MyActivityPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/dispatch"
              element={
                <ProtectedRoute roles={['ADMIN']}>
                  <AdminDispatchPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/social"
              element={
                <ProtectedRoute roles={['ADMIN']}>
                  <AdminSocialPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/helpers"
              element={
                <ProtectedRoute roles={['ADMIN']}>
                  <AdminHelpersPage />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
