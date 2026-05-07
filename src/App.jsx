import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';

// --- CLIENT / PUBLIC ---
import Landing from './pages/client/Landing';
import Login from './pages/auth/Login';

// --- ADMIN PAGES ---
import Dashboard from './pages/admin/Dashboard';
import Inventory from './pages/admin/Inventory';
import Sales from './pages/admin/Sales';
import SalesReport from './pages/admin/SalesReport';
import Staff from './pages/admin/Staff';
import Settings from './pages/admin/Settings';

export default function App() {
  return (
    <main>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />

        {/* Admin Protected Routes */}
        <Route
          path="/dashboard"
          element={<ProtectedRoute><Dashboard /></ProtectedRoute>}
        />
        <Route
          path="/inventory"
          element={<ProtectedRoute><Inventory /></ProtectedRoute>}
        />
        <Route
          path="/sales"
          element={<ProtectedRoute><Sales /></ProtectedRoute>}
        />
        <Route
          path="/reports"
          element={<ProtectedRoute><SalesReport /></ProtectedRoute>}
        />
        <Route
          path="/staff"
          element={<ProtectedRoute><Staff /></ProtectedRoute>}
        />
        <Route
          path="/settings"
          element={<ProtectedRoute><Settings /></ProtectedRoute>}
        />

        {/* Catch-all for undefined routes: Redirects to Landing */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </main>
  );
}