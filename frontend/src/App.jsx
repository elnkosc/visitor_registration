import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';

// Auth pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ConfirmPage from './pages/ConfirmPage';
import AuthConfirmPage from './pages/AuthConfirmPage';

// Admin pages
import AdminDashboard from './pages/admin/AdminDashboard';
import UserManagement from './pages/admin/UserManagement';
import ConfigPage from './pages/admin/ConfigPage';

// Receptionist pages
import ReceptionDashboard from './pages/receptionist/ReceptionDashboard';
import VisitorSearch from './pages/receptionist/VisitorSearch';
import WalkInForm from './pages/receptionist/WalkInForm';

// Employee pages
import EmployeeDashboard from './pages/employee/EmployeeDashboard';
import VisitorForm from './pages/employee/VisitorForm';

// Kiosk
import KioskPage from './pages/kiosk/KioskPage';

function HomeRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'admin') return <Navigate to="/admin" replace />;
  if (user.role === 'receptionist') return <Navigate to="/reception" replace />;
  if (user.role === 'employee') return <Navigate to="/employee" replace />;
  return <Navigate to="/login" replace />;
}

function AppLayout({ children }) {
  return (
    <div className="layout">
      <Navbar />
      <main className="main-content">{children}</main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/confirm" element={<ConfirmPage />} />
        <Route path="/auth/confirm/:token" element={<AuthConfirmPage />} />
        <Route path="/kiosk/*" element={<KioskPage />} />

        {/* Home redirect */}
        <Route path="/" element={<HomeRedirect />} />

        {/* Admin */}
        <Route path="/admin" element={
          <ProtectedRoute roles={['admin']}>
            <AppLayout><AdminDashboard /></AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/admin/users" element={
          <ProtectedRoute roles={['admin']}>
            <AppLayout><UserManagement /></AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/admin/config" element={
          <ProtectedRoute roles={['admin']}>
            <AppLayout><ConfigPage /></AppLayout>
          </ProtectedRoute>
        } />

        {/* Receptionist */}
        <Route path="/reception" element={
          <ProtectedRoute roles={['admin', 'receptionist']}>
            <AppLayout><ReceptionDashboard /></AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/reception/visitors" element={
          <ProtectedRoute roles={['admin', 'receptionist']}>
            <AppLayout><VisitorSearch /></AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/reception/walkin" element={
          <ProtectedRoute roles={['admin', 'receptionist']}>
            <AppLayout><WalkInForm /></AppLayout>
          </ProtectedRoute>
        } />

        {/* Employee */}
        <Route path="/employee" element={
          <ProtectedRoute roles={['employee']}>
            <AppLayout><EmployeeDashboard /></AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/employee/visitors/new" element={
          <ProtectedRoute roles={['employee']}>
            <AppLayout><VisitorForm /></AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/employee/visitors/:id/edit" element={
          <ProtectedRoute roles={['employee']}>
            <AppLayout><VisitorForm /></AppLayout>
          </ProtectedRoute>
        } />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
