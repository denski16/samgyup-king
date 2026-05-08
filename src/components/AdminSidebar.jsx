import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import {
    LayoutDashboard,
    Package,
    ShoppingCart,
    FileBarChart,
    Users,
    Settings,
    LogOut,
    ShieldCheck,
    Activity,
    Menu,
    X
} from 'lucide-react';
import logoImg from '../assets/LOGO NO BG.png';

export default function AdminSidebar() {
    const navigate = useNavigate();
    const location = useLocation();
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const isActive = (path) => location.pathname === path;

    useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [location.pathname]);

    const navItems = [
        { name: 'DASHBOARD', path: '/admin/dashboard', icon: LayoutDashboard },
        { name: 'INVENTORY', path: '/admin/inventory', icon: Package },
        { name: 'SALES', path: '/admin/sales', icon: ShoppingCart },
        { name: 'SALES REPORT', path: '/admin/reports', icon: FileBarChart },
        { name: 'STAFF', path: '/admin/staff', icon: Users },
        { name: 'ACTIVITY LOG', path: '/admin/activity', icon: Activity },
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
            {/* --- Top-Left Mobile Menu Button --- */}
            <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="md:hidden fixed top-5 left-5 z-[130] p-3 bg-white border border-gray-200 text-gray-900 rounded-xl shadow-md hover:text-orange-600 hover:border-orange-200 active:scale-95 transition-all"
            >
                <Menu size={24} />
            </button>

            {/* Mobile Backdrop Overlay */}
            {isMobileMenuOpen && (
                <div
                    className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[140] transition-opacity"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* SIDEBAR */}
            <aside className={`fixed inset-y-0 left-0 z-[150] w-64 bg-gray-900 text-white flex flex-col h-screen shadow-2xl border-r border-white/5 transform transition-transform duration-300 ease-in-out md:translate-x-0 md:sticky md:top-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>

                <div className="p-8 border-b border-gray-800 relative">
                    {/* Mobile Close Button inside Sidebar */}
                    <button
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="md:hidden absolute top-4 right-4 p-2 text-gray-500 hover:text-white transition-colors rounded-lg bg-white/5 z-10"
                    >
                        <X size={16} />
                    </button>

                    {/* --- UPDATED BRANDING HEADER --- */}
                    <div
                        onClick={() => {
                            navigate('/admin/dashboard');
                            setIsMobileMenuOpen(false);
                        }}
                        className="flex items-center gap-3 cursor-pointer group mt-2"
                        title="Go to Dashboard"
                    >
                        {/* REMOVED bg-white and p-1.5, slightly reduced w/h */}
                        <div className="w-10 h-10 flex-shrink-0 transition-transform duration-300 group-hover:scale-105">
                            <img src={logoImg} alt="Logo" className="w-full h-full object-contain" />
                        </div>
                        <div className="text-left transition-opacity duration-300 group-hover:opacity-80 min-w-0">
                            {/* REDUCED text size to text-base to fit better */}
                            <span className="block text-base font-black tracking-tight text-orange-500 uppercase leading-none truncate">Samgyup King</span>
                            <span className="text-[8px] font-black text-gray-500 tracking-[0.2em] uppercase flex items-center gap-1 mt-1.5">
                                <ShieldCheck size={10} className="text-green-500 flex-shrink-0" /> Admin Portal
                            </span>
                        </div>
                    </div>
                </div>

                <nav className="flex-1 p-4 space-y-2 mt-6 overflow-y-auto custom-scrollbar">
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

                <div className="p-4 border-t border-gray-800 space-y-2">
                    <button
                        onClick={() => navigate('/admin/settings')}
                        className={`w-full text-left p-4 rounded-xl flex items-center gap-4 text-xs font-bold uppercase tracking-widest transition-all ${isActive('/admin/settings') ? 'text-orange-500' : 'text-gray-500 hover:text-white'}`}
                    >
                        <Settings size={18} /> Settings
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
                        <p className="text-gray-500 mb-8 text-sm font-medium italic">Are you sure you want to log out?</p>
                        <div className="flex gap-3">
                            <button onClick={() => setShowLogoutModal(false)} className="flex-1 py-4 bg-gray-100 font-black uppercase text-[10px] tracking-widest rounded-xl">Cancel</button>
                            <button onClick={handleLogout} className="flex-1 py-4 bg-red-600 text-white font-black uppercase text-[10px] tracking-widest rounded-xl">Logout</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}