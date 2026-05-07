import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    Package,
    ShoppingCart, // Added for active Sales
    FileBarChart,
    Users,
    Settings,
    LogOut
} from 'lucide-react';
import logoImg from '../assets/LOGO NO BG.png';

export default function Sidebar() {
    const navigate = useNavigate();
    const location = useLocation();
    const [showLogoutModal, setShowLogoutModal] = useState(false);

    const isActive = (path) => location.pathname === path;

    // Updated navigation items to include both SALES and SALES REPORT
    const mainNavItems = [
        { name: 'DASHBOARD', path: '/dashboard', icon: LayoutDashboard },
        { name: 'INVENTORY', path: '/inventory', icon: Package },
        { name: 'SALES', path: '/sales', icon: ShoppingCart },
        { name: 'SALES REPORT', path: '/reports', icon: FileBarChart },
        { name: 'STAFF', path: '/staff', icon: Users },
    ];

    const handleLogout = () => {
        // Perform any logout logic here (e.g., supabase.auth.signOut())
        navigate('/');
    };

    return (
        <>
            <aside className="w-64 bg-gray-900 text-white hidden md:flex flex-col sticky top-0 h-screen shadow-2xl">

                {/* --- LOGO SECTION --- */}
                <div className="p-6 border-b border-gray-800 flex flex-col items-center gap-3">
                    <div className="w-20 h-20 rounded-full bg-white p-2 overflow-hidden flex items-center justify-center shadow-inner">
                        <img
                            src={logoImg}
                            alt="Samgyup King Logo"
                            className="w-full h-full object-contain"
                        />
                    </div>
                    <span className="text-xl font-black tracking-wider text-orange-500 uppercase">
                        Samgyup King
                    </span>
                </div>

                {/* --- MAIN NAVIGATION --- */}
                <nav className="flex-1 p-4 space-y-2 mt-4">
                    {mainNavItems.map((item) => {
                        const Icon = item.icon;
                        return (
                            <button
                                key={item.name}
                                onClick={() => navigate(item.path)}
                                className={`w-full text-left p-3 rounded-xl transition-all duration-200 flex items-center gap-3 group ${isActive(item.path)
                                    ? 'bg-orange-600 text-white shadow-lg shadow-orange-900/40'
                                    : 'hover:bg-gray-800 text-gray-400 hover:text-white'
                                    }`}
                            >
                                <Icon size={20} className={isActive(item.path) ? 'text-white' : 'group-hover:text-orange-400'} />
                                <span className="font-bold text-sm tracking-wide">{item.name}</span>
                            </button>
                        );
                    })}
                </nav>

                {/* --- BOTTOM SECTION (SETTINGS & LOGOUT) --- */}
                <div className="p-4 border-t border-gray-800 space-y-2">
                    {/* Settings Button */}
                    <button
                        onClick={() => navigate('/settings')}
                        className={`w-full text-left p-3 rounded-xl transition-all duration-200 flex items-center gap-3 group ${isActive('/settings')
                            ? 'bg-orange-600 text-white shadow-lg shadow-orange-900/40'
                            : 'hover:bg-gray-800 text-gray-400 hover:text-white'
                            }`}
                    >
                        <Settings size={20} className={isActive('/settings') ? 'text-white' : 'group-hover:text-orange-400'} />
                        <span className="font-bold text-sm tracking-wide">SETTINGS</span>
                    </button>

                    {/* Logout Button (Styled same as others) */}
                    <button
                        onClick={() => setShowLogoutModal(true)}
                        className="w-full text-left p-3 rounded-xl transition-all duration-200 flex items-center gap-3 group hover:bg-red-600/20 text-gray-400 hover:text-red-500"
                    >
                        <LogOut size={20} className="group-hover:text-red-500 transition-colors" />
                        <span className="font-bold text-sm tracking-wide">LOGOUT</span>
                    </button>
                </div>
            </aside>

            {/* --- LOGOUT CONFIRMATION MODAL --- */}
            {showLogoutModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl transform transition-all animate-in fade-in zoom-in duration-200">
                        <div className="flex flex-col items-center text-center">
                            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
                                <LogOut size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Confirm Logout</h3>
                            <p className="text-gray-500 mb-6 text-sm">
                                Are you sure you want to log out of the Samgyup King management system?
                            </p>

                            <div className="flex w-full gap-3">
                                <button
                                    onClick={() => setShowLogoutModal(false)}
                                    className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleLogout}
                                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-colors shadow-lg shadow-red-900/20"
                                >
                                    Yes, Logout
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}