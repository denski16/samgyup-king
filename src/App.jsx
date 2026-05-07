import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';

// --- CLIENT / PUBLIC ---
import Landing from './pages/client/Landing';
import Login from './pages/auth/Login';

// --- ADMIN PAGES ---
import AdminDashboard from './pages/admin/Dashboard';
import ActivityLog from './pages/admin/ActivityLog'; // <-- 1. NEW IMPORT HERE
import Inventory from './pages/admin/Inventory';
import AdminSales from './pages/admin/Sales';
import SalesReport from './pages/admin/SalesReport';
import StaffManagement from './pages/admin/Staff';
import Settings from './pages/admin/Settings';

// --- STAFF PAGES ---
import StaffDashboard from './pages/staff/Dashboard';
import StaffSales from './pages/staff/Sales';
import StaffInventory from './pages/staff/Inventory';
import StaffSalesReport from './pages/staff/SalesReport';

export default function App() {
  return (
    <main>
      <Routes>
        {/* --- PUBLIC ROUTES --- */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />

        {/* --- ADMIN PROTECTED ROUTES --- */}
        <Route
          path="/admin/dashboard"
          element={<ProtectedRoute role="Admin"><AdminDashboard /></ProtectedRoute>}
        />
        {/* --- 2. NEW ROUTE HERE --- */}
        <Route
          path="/admin/activity"
          element={<ProtectedRoute role="Admin"><ActivityLog /></ProtectedRoute>}
        />
        <Route
          path="/admin/inventory"
          element={<ProtectedRoute role="Admin"><Inventory /></ProtectedRoute>}
        />
        <Route
          path="/admin/sales"
          element={<ProtectedRoute role="Admin"><AdminSales /></ProtectedRoute>}
        />
        <Route
          path="/admin/reports"
          element={<ProtectedRoute role="Admin"><SalesReport /></ProtectedRoute>}
        />
        <Route
          path="/admin/staff"
          element={<ProtectedRoute role="Admin"><StaffManagement /></ProtectedRoute>}
        />
        <Route
          path="/admin/settings"
          element={<ProtectedRoute role="Admin"><Settings /></ProtectedRoute>}
        />

        {/* --- STAFF PROTECTED ROUTES --- */}
        <Route
          path="/staff/dashboard"
          element={<ProtectedRoute role="Staff"><StaffDashboard /></ProtectedRoute>}
        />
        <Route
          path="/staff/sales"
          element={<ProtectedRoute role="Staff"><StaffSales /></ProtectedRoute>}
        />
        <Route
          path="/staff/inventory"
          element={<ProtectedRoute role="Staff"><StaffInventory /></ProtectedRoute>}
        />
        <Route
          path="/staff/reports"
          element={<ProtectedRoute role="Staff"><StaffSalesReport /></ProtectedRoute>}
        />

        {/* Catch-all for undefined routes */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </main>
  );
}