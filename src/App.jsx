import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Sales from './pages/Sales';
import SalesReport from './pages/SalesReport';
import Staff from './pages/Staff';

export default function App() {
  return (
    <main>
      <Routes>
        {/* Auth / Entry */}
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* Main Management Pages (Protected) */}
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/inventory" element={<ProtectedRoute><Inventory /></ProtectedRoute>} />

        {/* Sales & POS (Protected) */}
        <Route path="/sales" element={<ProtectedRoute><Sales /></ProtectedRoute>} />

        {/* Reports (Path must match Sidebar: /reports) (Protected) */}
        <Route path="/reports" element={<ProtectedRoute><SalesReport /></ProtectedRoute>} />

        {/* Team Management (Protected) */}
        <Route path="/staff" element={<ProtectedRoute><Staff /></ProtectedRoute>} />

        {/* Settings Placeholder (Protected) */}
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <div className="p-8 text-gray-900">
                <h1>Settings Page Coming Soon</h1>
              </div>
            </ProtectedRoute>
          }
        />

        {/* Catch-all for undefined routes */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </main>
  );
}