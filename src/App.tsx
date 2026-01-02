import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ClientsProvider } from './context/ClientsContext';

import ProtectedRoute from './components/ProtectedRoute';
import PrivateLayout from './layouts/PrivateLayout';

const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const ClientsManager = React.lazy(() => import('./pages/ClientsManager'));
const LoginPage = React.lazy(() => import('./pages/LoginPage'));

const ControlPanel = React.lazy(() => import('./pages/ControlPanel'));
const InmueblesPage = React.lazy(() => import('./pages/InmueblesPage'));
const PropertyEditorPage = React.lazy(() => import('./pages/PropertyEditorPage'));
const PropertyDetailPage = React.lazy(() => import('./pages/PropertyDetailPage'));
const CalendarPage = React.lazy(() => import('./pages/CalendarPage'));
const FilesPage = React.lazy(() => import('./pages/FilesPage'));

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand"></div>
  </div>
);

function App() {
  return (
    <AuthProvider>
      <ClientsProvider>
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Navigate to="/app" replace />} />
              <Route path="/login" element={<LoginPage />} />

              {/* Rutas Privadas */}
              <Route
                path="/app"
                element={
                  <ProtectedRoute>
                    <PrivateLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<ControlPanel />} />
                <Route path="inmuebles" element={<InmueblesPage />} />
                <Route path="inmuebles/new" element={<PropertyEditorPage />} />
                <Route path="inmuebles/:id/edit" element={<PropertyEditorPage />} />
                <Route path="inmuebles/:inmuebleId" element={<PropertyDetailPage />} />
                <Route path="inmuebles/editar" element={<Dashboard />} />
                <Route path="clients" element={<ClientsManager />} />
                <Route path="archivos" element={<FilesPage />} />
                <Route path="calendar" element={<CalendarPage />} />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </ClientsProvider>
    </AuthProvider>
  );
}

export default App;
