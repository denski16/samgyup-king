import { useState, useEffect } from 'react';
import { supabase } from "../../supabaseClient";
import StaffSidebar from "../../components/StaffSidebar";
import {
    TrendingUp, Package, Clock,
    Calendar, PhilippinePeso, Utensils
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
        const today = new Date().toISOString().split('T')[0];

        // 1. Fetch Today's Sales for this specific branch
        // In a real scenario, you'd filter by the staff's assigned branch
        const { data: salesData } = await supabase
            .from('sales')
            .select('*')
            .gte('sale_date', today);

        if (salesData) {
            const total = salesData.reduce((acc, sale) => acc + sale.total_price, 0);
            setStats({
                todaySales: total,
                todayOrders: salesData.length,
                activeShift: getShiftName()
            });
            setRecentSales(salesData.slice(0, 5)); // Show last 5
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

            <main className="flex-1 p-8 overflow-y-auto">
                <header className="mb-10">
                    <h1 className="text-3xl font-black uppercase tracking-tight text-gray-900">
                        Staff <span className="text-orange-600">Dashboard</span>
                    </h1>
                    <p className="text-gray-500 font-medium italic italic">Current branch overview and shift performance.</p>
                </header>

                {/* Quick Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                    <StatCard
                        icon={<PhilippinePeso size={24} />}
                        label="Today's Sales"
                        value={`₱${stats.todaySales.toLocaleString()}`}
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
                    />
                </div>

                {/* Layout: Recent Activity & Reminders */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Recent Branch Activity */}
                    <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100">
                        <h2 className="text-xl font-black uppercase tracking-tight mb-6 flex items-center gap-2">
                            <TrendingUp className="text-orange-600" size={20} /> Recent Sales
                        </h2>
                        <div className="space-y-4">
                            {recentSales.map((sale) => (
                                <div key={sale.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-transparent hover:border-orange-200 transition-all">
                                    <div>
                                        <p className="font-black text-gray-900 uppercase text-xs">{sale.product_name}</p>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase">
                                            {new Date(sale.sale_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                    <p className="font-black italic text-orange-600">₱{sale.total_price}</p>
                                </div>
                            ))}
                            {recentSales.length === 0 && (
                                <p className="text-center py-10 text-gray-400 font-bold uppercase text-xs">No sales recorded yet today.</p>
                            )}
                        </div>
                    </div>

                    {/* Staff Reminders / Status */}
                    <div className="bg-gray-900 rounded-[2.5rem] p-8 shadow-2xl text-white">
                        <h2 className="text-xl font-black uppercase tracking-tight mb-6 flex items-center gap-2 italic">
                            <Utensils className="text-orange-500" size={20} /> Shift Notes
                        </h2>
                        <div className="space-y-4 text-sm font-medium text-gray-400">
                            <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                                <p className="text-white font-bold mb-1 uppercase text-xs">Check Inventory</p>
                                <p>Ensure Samgyupsal stocks are sufficient for the evening rush.</p>
                            </div>
                            <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                                <p className="text-white font-bold mb-1 uppercase text-xs">Branch Cleanliness</p>
                                <p>Maintain table sanitation protocols after every customer.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

function StatCard({ icon, label, value, color }) {
    return (
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 flex items-center gap-6">
            <div className={`${color} text-white p-4 rounded-2xl shadow-lg`}>
                {icon}
            </div>
            <div>
                <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">{label}</p>
                <p className="text-2xl font-black text-gray-900 tracking-tight">{value}</p>
            </div>
        </div>
    );
}