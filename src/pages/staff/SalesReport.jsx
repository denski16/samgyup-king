import { useState, useEffect } from 'react';
import { supabase } from "../../supabaseClient";
import StaffSidebar from "../../components/StaffSidebar";
import {
    FileBarChart,
    AlertTriangle,
    Store,
    PhilippinePeso,
    Package,
    Receipt,
    RefreshCcw,
    Clock
} from 'lucide-react';

export default function StaffSalesReport() {
    const [userBranches, setUserBranches] = useState([]);
    const [activeBranch, setActiveBranch] = useState('');
    const [sales, setSales] = useState([]);
    const [loading, setLoading] = useState(true);

    const [stats, setStats] = useState({
        revenue: 0,
        itemsSold: 0,
        transactions: 0
    });

    useEffect(() => {
        initializeStaffData();
    }, []);

    async function initializeStaffData() {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('branches')
                .eq('id', user.id)
                .single();

            const branches = profile?.branches || [];
            setUserBranches(branches);
            if (branches.length > 0) setActiveBranch(branches[0]);
            else setLoading(false);
        }
    }

    useEffect(() => {
        if (activeBranch) fetchTodaySales();
    }, [activeBranch]);

    async function fetchTodaySales() {
        setLoading(true);

        // --- MANILA TIMEZONE FIX ---
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        const { data } = await supabase
            .from('sales')
            .select('*')
            .eq('branch', activeBranch)
            .gte('sale_date', startOfToday.toISOString())
            .order('sale_date', { ascending: false });

        const salesData = data || [];
        setSales(salesData);

        setStats({
            revenue: salesData.reduce((sum, item) => sum + Number(item.total_price), 0),
            itemsSold: salesData.reduce((sum, item) => sum + Number(item.quantity_sold), 0),
            transactions: salesData.length
        });
        setLoading(false);
    }

    const todayFormatted = new Date().toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    return (
        <div className="flex min-h-screen bg-gray-50 text-gray-900 font-sans">
            <StaffSidebar />

            <main className="flex-1 p-4 pt-20 md:p-8 overflow-y-auto w-full max-w-[100vw] overflow-x-hidden">
                <header className="mb-6 md:mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight italic">
                            Daily <span className="text-orange-600">Shift Report</span>
                        </h1>
                        <p className="text-sm md:text-base text-gray-500 font-medium italic mt-1">
                            End-of-day summary for {todayFormatted}.
                        </p>
                    </div>
                    <button onClick={fetchTodaySales} className="p-3 bg-white border border-gray-200 rounded-2xl hover:text-orange-500 shadow-sm active:scale-90 transition-all">
                        <RefreshCcw size={18} className={loading ? "animate-spin text-orange-600" : ""} />
                    </button>
                </header>

                {/* Branch Selection - Mobile Swipeable */}
                {userBranches.length > 0 && (
                    <div className="flex gap-2 mb-8 bg-gray-200/50 p-1.5 rounded-2xl w-full md:w-fit items-center overflow-x-auto custom-scrollbar">
                        <Store size={14} className="text-gray-400 ml-3 mr-1 shrink-0" />
                        {userBranches.map((br) => (
                            <button key={br} onClick={() => setActiveBranch(br)}
                                className={`px-5 md:px-6 py-2.5 md:py-3 rounded-xl text-[9px] md:text-[10px] font-black tracking-[0.2em] transition-all whitespace-nowrap flex-1 md:flex-none ${activeBranch === br ? 'bg-white text-orange-600 shadow-md' : 'text-gray-500 hover:text-gray-900'}`}>
                                {br}
                            </button>
                        ))}
                    </div>
                )}

                {/* Summary Cards - Responsive Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-8">
                    <ReportCard icon={<PhilippinePeso size={24} />} label="Total Revenue" value={`₱${stats.revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} color="bg-orange-600" />
                    <ReportCard icon={<Package size={24} />} label="Items Sold" value={stats.itemsSold} color="bg-gray-900" />
                    <ReportCard icon={<Receipt size={24} />} label="Transactions" value={stats.transactions} color="bg-blue-600" spanFullOnMobile />
                </div>

                {/* --- MOBILE LEDGER (Cards) --- */}
                <div className="md:hidden space-y-4">
                    <h2 className="text-sm font-black uppercase tracking-widest text-gray-400 mb-2 flex items-center gap-2">
                        <Clock size={16} /> Sales History
                    </h2>
                    {loading ? (
                        <p className="text-center py-10 text-gray-400 font-black text-[10px] animate-pulse">Compiling Shift Data...</p>
                    ) : sales.length === 0 ? (
                        <p className="text-center py-10 text-gray-400 font-bold italic text-sm">No sales logged today.</p>
                    ) : (
                        sales.map((sale) => (
                            <div key={sale.id} className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
                                <div className="flex justify-between items-start mb-3">
                                    <p className="text-[10px] font-black bg-gray-900 text-white px-2 py-1 rounded-md uppercase tracking-widest">
                                        {new Date(sale.sale_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                    <p className="font-black italic text-orange-600">₱{sale.total_price.toLocaleString()}</p>
                                </div>
                                <div className="flex justify-between items-end">
                                    <p className="font-black uppercase text-xs text-gray-800 truncate pr-4">{sale.product_name}</p>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">Qty: {sale.quantity_sold}</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* --- DESKTOP LEDGER (Table) --- */}
                <div className="hidden md:block bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
                        <FileBarChart className="text-orange-600" size={18} />
                        <h2 className="font-black uppercase tracking-widest text-xs">Today's Detailed Ledger</h2>
                    </div>
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-900 text-white text-[10px] uppercase tracking-[0.2em]">
                            <tr>
                                <th className="p-6">Time</th>
                                <th className="p-6">Product Item</th>
                                <th className="p-6 text-center">Qty</th>
                                <th className="p-6 text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-sm">
                            {loading ? (
                                <tr><td colSpan="4" className="p-20 text-center text-gray-400 font-black animate-pulse uppercase tracking-widest">Generating Report...</td></tr>
                            ) : (
                                sales.map((sale) => (
                                    <tr key={sale.id} className="hover:bg-orange-50/20 transition-colors group">
                                        <td className="p-6">
                                            <p className="font-black text-gray-900 tracking-tight">
                                                {new Date(sale.sale_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </td>
                                        <td className="p-6 font-black uppercase tracking-tight text-gray-600">{sale.product_name}</td>
                                        <td className="p-6 font-bold text-center">{sale.quantity_sold}</td>
                                        <td className="p-6 text-right font-black italic text-orange-600">₱{sale.total_price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </main>
        </div>
    );
}

// Helper Card Component
function ReportCard({ icon, label, value, color, spanFullOnMobile }) {
    return (
        <div className={`bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-gray-100 flex items-center gap-4 md:gap-6 ${spanFullOnMobile ? 'sm:col-span-2 lg:col-span-1' : ''}`}>
            <div className={`${color} text-white p-3 md:p-4 rounded-xl md:rounded-2xl shadow-lg`}>
                {icon}
            </div>
            <div className="min-w-0">
                <p className="text-[9px] md:text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1 truncate">{label}</p>
                <p className="text-xl md:text-2xl font-black text-gray-900 tracking-tight truncate">{value}</p>
            </div>
        </div>
    );
}