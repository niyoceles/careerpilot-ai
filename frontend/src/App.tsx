import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DashboardLayout } from './layouts/DashboardLayout';
import { AuthPage } from './pages/AuthPage';
import { OverviewPage } from './pages/OverviewPage';
import { MyCVPage } from './pages/MyCVPage';
import { ProfilePage } from './pages/ProfilePage';
import { FindJobsPage } from './pages/FindJobsPage';
import { JobMatchesPage } from './pages/JobMatchesPage';
import { ApplicationsPage } from './pages/ApplicationsPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { InterviewPrepPage } from './pages/InterviewPrepPage';
import { AIAssistantPage } from './pages/AIAssistantPage';
import { SettingsPage } from './pages/SettingsPage';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<OverviewPage />} />
            <Route path="cv" element={<MyCVPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="jobs" element={<FindJobsPage />} />
            <Route path="matches" element={<JobMatchesPage />} />
            <Route path="applications" element={<ApplicationsPage />} />
            <Route path="documents" element={<DocumentsPage />} />
            <Route path="interviews" element={<InterviewPrepPage />} />
            <Route path="ai-assistant" element={<AIAssistantPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};
export default App;

