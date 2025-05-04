import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { trpc } from './utils/trpc';

// Компоненти
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import IncomePage from './pages/IncomePage';
import AnalyticsPage from './pages/AnalyticsPage';
import TaxesPage from './pages/TaxesPage';
import EventsPage from './pages/EventsPage';
import SettingsPage from './pages/SettingsPage';

// Контекст для аутентифікації
import { AuthProvider } from './contexts/AuthContext';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="income" element={<IncomePage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="taxes" element={<TaxesPage />} />
          <Route path="events" element={<EventsPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
};

export default App;
