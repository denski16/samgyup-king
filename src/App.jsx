import { Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Sales from './pages/Sales'; // 1. Make sure this import is here

export default function App() {
  return (
    <main>
      <Routes>
        {/* Login Page */}
        <Route path="/" element={<Login />} />

        {/* Dashboard Page */}
        <Route path="/dashboard" element={<Dashboard />} />

        {/* Inventory Page */}
        <Route path="/inventory" element={<Inventory />} />

        {/* 2. Add the Sales Route here */}
        <Route path="/sales" element={<Sales />} />

        {/* Sales Report Page (we'll use /reports to stay organized) */}
        <Route path="/reports" element={<div className="p-8"><h1>Reports Page Coming Soon</h1></div>} />

        <Route path="/staff" element={<div className="p-8"><h1>Staff Page Coming Soon</h1></div>} />
        <Route path="/settings" element={<div className="p-8"><h1>Settings Page Coming Soon</h1></div>} />
      </Routes>
    </main>
  );
}