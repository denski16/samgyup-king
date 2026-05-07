import { useState, useEffect } from 'react';
import { supabase } from "../../supabaseClient";
import StaffSidebar from "../../components/StaffSidebar";
import {
    FileBarChart,
    AlertTriangle,
    Store,
    PhilippinePeso,
    Package,
    Receipt
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

            if (branches.length > 0) {
                setActiveBranch(branches[0]);
            } else {
                setLoading(false);
            }
        }
    }

    useEffect(() => {
        if (activeBranch) {
            fetchTodaySales();
        }
    }, [activeBranch]);

    async function fetchTodaySales() {
        setLoading(true);

        // Get start and end of TODAY in local time
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const startOfDay = today.toISOString();

        const end = new Date(today);
        end.setHours(23, 59, 59, 999);
        const endOfDay = end.toISOString();

        // Fetch sales for this branch, ONLY for today
        const { data } = await supabase
            .from('sales')
            .select('*')
            // Using .eq for branch. If your DB uses 'branch_name', change 'branch' to 'branch_name' below
            .eq('branch', activeBranch)
            .gte('sale_date', startOfDay)
            .lte('sale_date', endOfDay)
            .order('sale_date', { ascending: false });

        const salesData = data || [];
        setSales(salesData);

        // Calculate Totals for the Top Cards
        const totalRev = salesData.reduce((sum, item) => sum + Number(item.total_price), 0);
        const totalItems = salesData.reduce((sum, item) => sum + Number(item.quantity_sold), 0);

        setStats({
            revenue: totalRev,
            itemsSold: totalItems,
            transactions: salesData.length
        });

        setLoading(false);
    }

    // Format today's date nicely (e.g., "Thursday, May 7, 2026")
    const todayFormatted = new Date().toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    return (
        <div className="flex min-h-screen bg-gray-50 text-gray-900 font-sans">
            <StaffSidebar />

            <main className="flex-1 p-8 overflow-y-auto">
                <header className="mb-8 flex justify-between items-end">
                    <div>
                        <h1 className="text-3xl font-black uppercase tracking-tight italic">
                            Daily <span className="text-orange-600">Shift Report</span>
                        </h1>
                        <p className="text-gray-500 font-medium italic mt-1">
                            End-of-day summary for {todayFormatted}.
                        </p>
                    </div>
                </header>

                {/* RESTRICTED Branch Selection */}
                {userBranches.length === 0 ? (
                    <div className="mb-8 p-4 bg-red-50 text-red-600 rounded-2xl border border-red-100 flex items-center gap-2 text-sm font-bold uppercase">
                        <AlertTriangle size={18} /> No branches assigned to your profile.
                    </div>
                ) : (
                    <div className="flex flex-wrap gap-2 mb-8 bg-gray-200/50 p-1.5 rounded-2xl w-fit items-center">
                        <Store size={14} className="text-gray-400 ml-3 mr-2" />
                        {userBranches.map((br) => (
                            <button key={br} onClick={() => setActiveBranch(br)}
                                className={`px-6 py-3 rounded-xl text-[10px] font-black tracking-[0.2em] transition-all ${activeBranch === br ? 'bg-white text-orange-600 shadow-md' : 'text-gray-500 hover:text-gray-900'}`}>
                                {br}
                            </button>
                        ))}
                    </div>
                )}

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex items-center gap-6">
                        <div className="bg-orange-600 text-white p-4 rounded-2xl shadow-lg shadow-orange-900/20">
                            <PhilippinePeso size={24} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">Total Revenue</p>
                            <p className="text-2xl font-black text-gray-900 tracking-tight">₱{stats.revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex items-center gap-6">
                        <div className="bg-gray-900 text-white p-4 rounded-2xl shadow-lg">
                            <Package size={24} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">Items Sold</p>
                            <p className="text-2xl font-black text-gray-900 tracking-tight">{stats.itemsSold}</p>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex items-center gap-6">
                        <div className="bg-blue-600 text-white p-4 rounded-2xl shadow-lg shadow-blue-900/20">
                            <Receipt size={24} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">Transactions</p>
                            <p className="text-2xl font-black text-gray-900 tracking-tight">{stats.transactions}</p>
                        </div>
                    </div>
                </div>

                {/* Ledger Table */}
                <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden min-w-[800px]">
                    <div className="p-6 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
                        <FileBarChart className="text-orange-600" size={18} />
                        <h2 className="font-black uppercase tracking-widest text-xs">Today's Ledger</h2>
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
                            {loading && !sales.length ? (
                                <tr><td colSpan="4" className="p-20 text-center text-gray-400 font-black animate-pulse uppercase tracking-widest">Generating Report...</td></tr>
                            ) : sales.length === 0 ? (
                                <tr><td colSpan="4" className="p-20 text-center text-gray-400 font-bold italic">No sales recorded today for {activeBranch}.</td></tr>
                            ) : sales.map((sale) => (
                                <tr key={sale.id} className="hover:bg-orange-50/20 transition-colors group">
                                    <td className="p-6">
                                        <p className="font-black text-gray-900 tracking-tight">
                                            {new Date(sale.sale_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </td>
                                    <td className="p-6 font-black uppercase tracking-tight text-gray-600">
                                        {sale.product_name}
                                    </td>
                                    <td className="p-6 font-bold text-center">
                                        {sale.quantity_sold}
                                    </td>
                                    <td className="p-6 text-right font-black italic text-orange-600">
                                        ₱{sale.total_price.toLocaleString()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </main>
        </div>
    );
}