// --- AUTH & CLIENT ---
import Landing from './pages/client/Landing';
import Login from './pages/auth/Login';

// --- ADMIN PAGES ---
import Dashboard from './pages/admin/Dashboard';
import Inventory from './pages/admin/Inventory';
import Sales from './pages/admin/Sales';        // Updated path
import SalesReport from './pages/admin/SalesReport';
import Staff from './pages/admin/Staff';
import Settings from './pages/admin/Settings';

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />

      {/* Admin Protected Routes */}
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/inventory" element={<ProtectedRoute><Inventory /></ProtectedRoute>} />
      <Route path="/sales" element={<ProtectedRoute><Sales /></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute><SalesReport /></ProtectedRoute>} />
      <Route path="/staff" element={<ProtectedRoute><Staff /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}