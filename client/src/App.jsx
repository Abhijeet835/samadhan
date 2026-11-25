import { Toaster } from 'react-hot-toast';
import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

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
import ErrorBoundary from '@/components/ErrorBoundary';
import RouteFocus from '@/components/RouteFocus';
import NotFoundPage from '@/pages/NotFoundPage';
import { AuthProvider } from '@/context/AuthContext';

const GlobalMapPage = lazy(() => import('@/pages/GlobalMapPage'));
const NotificationsPage = lazy(() => import('@/pages/NotificationsPage'));
const AdminLayout = lazy(() => import('@/features/admin/AdminLayout'));
const AdminDashboardPage = lazy(() => import('@/features/admin/AdminDashboardPage'));
const AdminIssuesPage = lazy(() => import('@/features/admin/AdminIssuesPage'));
const AdminIssueDetailPage = lazy(() => import('@/features/admin/AdminIssueDetailPage'));
const AdminUsersPage = lazy(() => import('@/features/admin/AdminUsersPage'));
const AdminSettingsPage = lazy(() => import('@/features/admin/AdminSettingsPage'));
const AdminAuditPage = lazy(() => import('@/features/admin/AdminAuditPage'));
const MapFallback = () => <div className="mx-auto max-w-6xl px-4 py-8"><div className="h-[520px] animate-pulse rounded-xl bg-slate-200" /></div>;

export default function App() {
  return (
    <ErrorBoundary>
    <BrowserRouter>
      <AuthProvider>
        <RouteFocus />
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
            <Route path="/map" element={<Suspense fallback={<MapFallback />}><GlobalMapPage /></Suspense>} />
            <Route path="/notifications" element={<ProtectedRoute><Suspense fallback={<MapFallback />}><NotificationsPage /></Suspense></ProtectedRoute>} />
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
              path="/admin"
              element={
                <ProtectedRoute roles={['ADMIN']}>
                  <Suspense fallback={<MapFallback />}>
                    <AdminLayout />
                  </Suspense>
                </ProtectedRoute>
              }
            >
              <Route index element={<Suspense fallback={<MapFallback />}><AdminDashboardPage /></Suspense>} />
              <Route path="issues" element={<Suspense fallback={<MapFallback />}><AdminIssuesPage /></Suspense>} />
              <Route path="issues/:issueId" element={<Suspense fallback={<MapFallback />}><AdminIssueDetailPage /></Suspense>} />
              <Route path="helpers" element={<AdminHelpersPage />} />
              <Route path="users" element={<Suspense fallback={<MapFallback />}><AdminUsersPage /></Suspense>} />
              <Route path="dispatch" element={<AdminDispatchPage />} />
              <Route path="social" element={<AdminSocialPage />} />
              <Route path="settings" element={<Suspense fallback={<MapFallback />}><AdminSettingsPage /></Suspense>} />
              <Route path="audit" element={<Suspense fallback={<MapFallback />}><AdminAuditPage /></Suspense>} />
            </Route>
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
    </ErrorBoundary>
  );
}
