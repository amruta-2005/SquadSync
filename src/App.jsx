import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import AppLayout from './components/layout/AppLayout';

import LandingPage from './pages/LandingPage';
import DashboardPage from './pages/DashboardPage';
import WorkloadPage from './pages/WorkloadPage';
import ReviewsPage from './pages/ReviewsPage';
import IntegrationRiskPage from './pages/IntegrationRiskPage';
import DataSourcesPage from './pages/DataSourcesPage';
import RisksPage from './pages/RisksPage';
import SettingsDocsPage from './pages/SettingsDocsPage';
import NotFoundPage from './pages/NotFoundPage';

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AppLayout />}>
            <Route index element={<LandingPage />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="workload" element={<WorkloadPage />} />
            <Route path="reviews" element={<ReviewsPage />} />
            <Route path="integration-risks" element={<IntegrationRiskPage />} />
            <Route path="data-sources" element={<DataSourcesPage />} />
            <Route path="risks" element={<RisksPage />} />
            <Route path="settings" element={<SettingsDocsPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}
