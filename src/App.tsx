import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute, PublicOnlyRoute } from './components/auth/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';
import { DashboardPage } from './pages/DashboardPage';
import { BusesPage } from './pages/BusesPage';
import { RoutesPage } from './pages/RoutesPage';
import { DriversPage } from './pages/DriversPage';
import { TripsPage } from './pages/TripsPage';
import { GpsTrackingPage } from './pages/GpsTrackingPage';
import { FuelPage } from './pages/FuelPage';
import { MaintenancePage } from './pages/MaintenancePage';
import { MaintenanceRecordsPage } from './pages/MaintenanceRecordsPage';
import { InventoryPage } from './pages/InventoryPage';
import { FinancePage } from './pages/FinancePage';
import { EmiPage } from './pages/EmiPage';
import { ReportsPage } from './pages/ReportsPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { SettingsPage } from './pages/SettingsPage';
import { ProfilePage } from './pages/ProfilePage';
import { AiIntelligencePage } from './pages/AiIntelligencePage';
import { AccessDeniedPage } from './pages/AccessDeniedPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Auth Screens */}
          <Route element={<PublicOnlyRoute />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
          </Route>

          {/* Protected Dashboard Shell */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/access-denied" element={<AccessDeniedPage />} />
              <Route path="/buses" element={<BusesPage />} />
              <Route path="/routes" element={<RoutesPage />} />
              <Route path="/drivers" element={<DriversPage />} />
              <Route path="/trips" element={<TripsPage />} />
              <Route path="/gps-tracking" element={<GpsTrackingPage />} />
              <Route path="/fuel" element={<FuelPage />} />
              <Route path="/maintenance" element={<MaintenancePage />} />
              <Route path="/maintenance-records" element={<MaintenanceRecordsPage />} />
              <Route path="/inventory" element={<InventoryPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/ai-intelligence" element={<AiIntelligencePage />} />
              <Route path="/reports" element={<ReportsPage />} />

              {/* Finance Protected Routes (Super Admin, Admin, Fleet Manager, Accountant) */}
              <Route element={<ProtectedRoute allowedRoles={['Super Admin', 'Admin', 'Fleet Manager', 'Accountant']} />}>
                <Route path="/finance" element={<FinancePage />} />
                <Route path="/emi" element={<EmiPage />} />
              </Route>

              {/* Administrative Protected Routes (Super Admin, Admin, Fleet Manager) */}
              <Route element={<ProtectedRoute allowedRoles={['Super Admin', 'Admin', 'Fleet Manager']} />}>
                <Route path="/audit-logs" element={<AuditLogsPage />} />
              </Route>

              {/* System Configuration Protected Routes (Super Admin, Admin) */}
              <Route element={<ProtectedRoute allowedRoles={['Super Admin', 'Admin']} />}>
                <Route path="/settings" element={<SettingsPage />} />
              </Route>
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
