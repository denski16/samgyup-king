import { useState, useEffect } from 'react';
import { supabase } from "../../supabaseClient";
import StaffSidebar from "../../components/StaffSidebar";
import {
    TrendingUp, Package, Clock,
    PhilippinePeso, Utensils, RefreshCcw
} from 'lucide-react';

export default function StaffDashboard() {
    const [stats, setStats] = useState({
        todaySales: 0,
        todayOrders: 0,
        activeShift: "Morning"
    });
    const [recentSales, setRecentSales] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStaffData();
    }, []);

    async function fetchStaffData() {
        setLoading(true);

        // Correct "Today" logic for Manila Time
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        // 1. Fetch Today's Sales
        const { data: salesData } = await supabase
            .from('sales')
            .select('*')
            .gte('sale_date', startOfToday.toISOString())
            .order('sale_date', { ascending: false });

        if (salesData) {
            const total = salesData.reduce((acc, sale) => acc + Number(sale.total_price), 0);
            setStats({
                todaySales: total,
                todayOrders: salesData.length,
                activeShift: getShiftName()
            });
            setRecentSales(salesData.slice(0, 5));
        }
        setLoading(false);
    }

    const getShiftName = () => {
        const hour = new Date().getHours();
        if (hour < 12) return "Morning Shift";
        if (hour < 18) return "Afternoon Shift";
        return "Evening Shift";
    };

    return (
        <div className="flex min-h-screen bg-gray-50 text-gray-900 font-sans">
            <StaffSidebar />

            {/* RESPONSIVE UPGRADE: Added pt-20 and px-4 for mobile spacing */}
            <main className="flex-1 p-4 pt-20 md:p-8 overflow-y-auto w-full max-w-[100vw] overflow-x-hidden">
                <header className="flex justify-between items-start mb-8 md:mb-10">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-gray-900">
                            Staff <span className="text-orange-600">Dashboard</span>
                        </h1>
                        <p className="text-sm md:text-base text-gray-500 font-medium italic">Current branch overview and shift performance.</p>
                    </div>
                    <button
                        onClick={fetchStaffData}
                        className="p-3 bg-white border border-gray-200 rounded-2xl hover:text-orange-500 shadow-sm transition-all active:scale-90"
                    >
                        <RefreshCcw size={18} className={loading ? "animate-spin text-orange-600" : ""} />
                    </button>
                </header>

                {/* Quick Stats Cards - RESPONSIVE: Stack on mobile, grid on desktop */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-8 md:mb-10">
                    <StatCard
                        icon={<PhilippinePeso size={24} />}
                        label="Today's Sales"
                        value={`₱${stats.todaySales.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                        color="bg-orange-600"
                    />
                    <StatCard
                        icon={<Package size={24} />}
                        label="Orders Processed"
                        value={stats.todayOrders}
                        color="bg-gray-900"
                    />
                    <StatCard
                        icon={<Clock size={24} />}
                        label="Current Shift"
                        value={stats.activeShift}
                        color="bg-blue-600"
                        spanFullOnMobile
                    />
                </div>

                {/* Layout: Recent Activity & Reminders - RESPONSIVE: Stack on mobile */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 mb-8">
                    {/* Recent Branch Activity */}
                    <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 shadow-sm border border-gray-100 h-fit">
                        <h2 className="text-lg md:text-xl font-black uppercase tracking-tight mb-6 flex items-center gap-2">
                            <TrendingUp className="text-orange-600" size={20} /> Recent Sales
                        </h2>
                        <div className="space-y-3 md:space-y-4">
                            {loading ? (
                                <p className="text-center py-10 text-gray-400 font-black uppercase text-[10px] animate-pulse">Checking records...</p>
                            ) : recentSales.length > 0 ? (
                                recentSales.map((sale) => (
                                    <div key={sale.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-transparent hover:border-orange-200 transition-all group">
                                        <div className="min-w-0 pr-2">
                                            <p className="font-black text-gray-900 uppercase text-[10px] md:text-xs truncate">{sale.product_name}</p>
                                            <p className="text-[9px] text-gray-400 font-bold uppercase mt-0.5">
                                                {new Date(sale.sale_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                        <p className="font-black italic text-orange-600 text-sm md:text-base flex-shrink-0">₱{Number(sale.total_price).toLocaleString()}</p>
                                    </div>
                                ))
                            ) : (
                                <p className="text-center py-10 text-gray-400 font-bold uppercase text-[10px] tracking-widest">No sales yet today.</p>
                            )}
                        </div>
                    </div>

                    {/* Staff Reminders / Status */}
                    <div className="bg-gray-900 rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 shadow-2xl text-white relative overflow-hidden">
                        <Utensils size={100} className="absolute -bottom-6 -right-6 text-white/5 rotate-12 pointer-events-none" />

                        <h2 className="text-lg md:text-xl font-black uppercase tracking-tight mb-6 flex items-center gap-2 italic relative z-10">
                            <Utensils className="text-orange-500" size={20} /> Shift Notes
                        </h2>
                        <div className="space-y-4 text-xs md:text-sm font-medium text-gray-400 relative z-10">
                            <div className="p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-colors">
                                <p className="text-white font-black mb-1 uppercase text-[10px] tracking-widest">Inventory Management</p>
                                <p className="leading-relaxed">Verify Samgyupsal and Side Dish stocks are ready for peak hours.</p>
                            </div>
                            <div className="p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-colors">
                                <p className="text-white font-black mb-1 uppercase text-[10px] tracking-widest">Service Standards</p>
                                <p className="leading-relaxed">Perform table sanitation immediately after customer departure.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

function StatCard({ icon, label, value, color, spanFullOnMobile }) {
    return (
        <div className={`bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-sm border border-gray-100 flex items-center gap-4 md:gap-6 ${spanFullOnMobile ? 'sm:col-span-2 lg:col-span-1' : ''}`}>
            <div className={`${color} text-white p-3 md:p-4 rounded-xl md:rounded-2xl shadow-lg flex-shrink-0`}>
                {icon}
            </div>
            <div className="min-w-0">
                <p className="text-[9px] md:text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1 truncate">{label}</p>
                <p className="text-lg md:text-2xl font-black text-gray-900 tracking-tight truncate">{value}</p>
            </div>
        </div>
    );
}