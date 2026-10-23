import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { AuthProvider } from './auth/AuthProvider';
import ProtectedRoute from './auth/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';
import ErrorBoundary from './components/common/ErrorBoundary';

import LandingPage from './pages/LandingPage';
import DashboardPage from './pages/DashboardPage';
import WorkloadPage from './pages/WorkloadPage';
import ReviewsPage from './pages/ReviewsPage';
import IntegrationRiskPage from './pages/IntegrationRiskPage';
import DataSourcesPage from './pages/DataSourcesPage';
import RisksPage from './pages/RisksPage';
import SettingsDocsPage from './pages/SettingsDocsPage';
import Login from './pages/Login';
import Register from './pages/Register';
import AcceptInvitation from './pages/AcceptInvitation';
import TasksPage from './pages/TasksPage';
import NotFoundPage from './pages/NotFoundPage';

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <ErrorBoundary title="SquadSync Application Error" message="An unexpected error occurred in the application. Please reload or return to the dashboard.">
          <BrowserRouter>
            <Routes>
              {/* Public standalone auth routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/invitations/accept" element={<AcceptInvitation />} />

              {/* Public landing page within app layout */}
              <Route path="/" element={<AppLayout />}>
                <Route index element={<LandingPage />} />

                {/* Protected feature routes wrapped in ProtectedRoute */}
                <Route element={<ProtectedRoute />}>
                  <Route path="dashboard" element={<DashboardPage />} />
                  <Route path="tasks" element={<TasksPage />} />
                  <Route path="workload" element={<WorkloadPage />} />
                  <Route path="reviews" element={<ReviewsPage />} />
                  <Route path="integration-risks" element={<IntegrationRiskPage />} />
                  <Route path="data-sources" element={<DataSourcesPage />} />
                  <Route path="risks" element={<RisksPage />} />
                  <Route path="settings" element={<SettingsDocsPage />} />
                </Route>

                {/* Fallback 404 route */}
                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </ErrorBoundary>
      </AppProvider>
    </AuthProvider>
  );
}
