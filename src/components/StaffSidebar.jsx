import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';
// Added FileBarChart here!
import {
    LayoutDashboard,
    ShoppingBag,
    Package,
    FileBarChart,
    Settings,
    LogOut,
    Utensils
} from 'lucide-react';
import logoImg from '../assets/LOGO NO BG.png';

export default function StaffSidebar() {
    const navigate = useNavigate();
    const location = useLocation();
    const [showLogoutModal, setShowLogoutModal] = useState(false);

    const isActive = (path) => location.pathname === path;

    // --- Staff Specific Menu ---
    const navItems = [
        { name: 'DASHBOARD', path: '/staff/dashboard', icon: LayoutDashboard },
        { name: 'INVENTORY', path: '/staff/inventory', icon: Package },
        { name: 'SALES', path: '/staff/sales', icon: ShoppingBag },
        { name: 'SHIFT REPORT', path: '/staff/reports', icon: FileBarChart },
    ];

    const handleLogout = async () => {
        try {
            await supabase.auth.signOut();
            setShowLogoutModal(false);
            navigate('/login', { replace: true });
        } catch (error) {
            alert("Error: " + error.message);
        }
    };

    return (
        <>
            <aside className="w-64 bg-gray-900 text-white hidden md:flex flex-col sticky top-0 h-screen shadow-2xl border-r border-white/5">
                {/* --- BRANDING --- */}
                <div className="p-8 border-b border-gray-800 flex flex-col items-center gap-4">
                    <div className="w-20 h-20 rounded-full bg-white p-2 shadow-2xl">
                        <img src={logoImg} alt="Logo" className="w-full h-full object-contain" />
                    </div>
                    <div className="text-center">
                        <span className="block text-xl font-black tracking-tighter text-orange-500 uppercase leading-none">Samgyup King</span>
                        <span className="text-[9px] font-black text-gray-500 tracking-[0.3em] uppercase flex items-center justify-center gap-1 mt-2">
                            <Utensils size={10} className="text-orange-500" /> Staff Portal
                        </span>
                    </div>
                </div>

                {/* --- NAV --- */}
                <nav className="flex-1 p-4 space-y-2 mt-6">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const active = isActive(item.path);
                        return (
                            <button
                                key={item.name}
                                onClick={() => navigate(item.path)}
                                className={`w-full text-left p-4 rounded-2xl transition-all flex items-center gap-4 group ${active
                                    ? 'bg-orange-600 text-white shadow-xl shadow-orange-900/40'
                                    : 'hover:bg-white/5 text-gray-400 hover:text-white'
                                    }`}
                            >
                                <Icon size={20} className={active ? 'text-white' : 'group-hover:text-orange-500'} />
                                <span className="font-black text-xs tracking-widest">{item.name}</span>
                            </button>
                        );
                    })}
                </nav>

                {/* --- FOOTER --- */}
                <div className="p-4 border-t border-gray-800 space-y-2">
                    {/* Note: Staff usually don't have access to general settings, but left here for layout symmetry */}
                    <button
                        onClick={() => navigate('/staff/settings')}
                        className={`w-full text-left p-4 rounded-xl flex items-center gap-4 text-xs font-bold uppercase tracking-widest transition-all ${isActive('/staff/settings') ? 'text-orange-500' : 'text-gray-500 hover:text-white'}`}
                    >
                        <Settings size={18} /> Profile Settings
                    </button>

                    <button
                        onClick={() => setShowLogoutModal(true)}
                        className="w-full text-left p-4 rounded-xl flex items-center gap-4 text-gray-500 hover:text-red-500 transition-all hover:bg-red-500/5"
                    >
                        <LogOut size={18} />
                        <span className="font-bold text-xs uppercase tracking-widest">Logout</span>
                    </button>
                </div>
            </aside>

            {/* Logout Modal */}
            {showLogoutModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 text-gray-900">
                    <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-sm shadow-2xl text-center">
                        <LogOut size={32} className="mx-auto mb-4 text-red-500" />
                        <h3 className="text-xl font-black uppercase tracking-tight mb-2">End Session?</h3>
                        <p className="text-gray-500 mb-8 text-sm font-medium italic font-sans">Are you sure you want to log out of the staff portal?</p>
                        <div className="flex gap-3">
                            <button onClick={() => setShowLogoutModal(false)} className="flex-1 py-4 bg-gray-100 font-black uppercase text-[10px] tracking-widest rounded-xl">Cancel</button>
                            <button onClick={handleLogout} className="flex-1 py-4 bg-red-600 text-white font-black uppercase text-[10px] tracking-widest rounded-xl shadow-lg shadow-red-900/20">Logout</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}