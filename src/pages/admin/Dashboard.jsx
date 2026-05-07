import { useState, useEffect } from 'react';
import { supabase } from "../../supabaseClient";
// --- FIXED IMPORT ---
import AdminSidebar from "../../components/AdminSidebar";
import {
    TrendingUp,
    ShoppingBag,
    Package,
    ArrowUpRight,
    RefreshCcw,
    Clock
} from 'lucide-react';

export default function Dashboard() {
    const filters = ['Daily', 'Weekly', 'Monthly', 'Quarterly', 'Yearly'];
    const [filter, setFilter] = useState('Daily');
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        revenue: 0,
        transactions: 0,
        itemsSold: 0
    });
    const [topProducts, setTopProducts] = useState([]);
    const [chartData, setChartData] = useState([]);

    useEffect(() => {
        fetchDashboardData();
    }, [filter]);

    async function fetchDashboardData() {
        setLoading(true);
        const now = new Date();
        let startDate = new Date();

        if (filter === 'Daily') startDate.setHours(now.getHours() - 24);
        else if (filter === 'Weekly') startDate.setDate(now.getDate() - 7);
        else if (filter === 'Monthly') startDate.setDate(now.getDate() - 30);
        else if (filter === 'Quarterly') startDate.setDate(now.getDate() - 90);
        else if (filter === 'Yearly') startDate.setDate(now.getDate() - 365);

        const { data: sales, error } = await supabase
            .from('sales')
            .select('*')
            .gte('sale_date', startDate.toISOString())
            .lte('sale_date', now.toISOString());

        if (!error && sales) {
            const totalRevenue = sales.reduce((acc, s) => acc + Number(s.total_price), 0);
            const totalUnits = sales.reduce((acc, s) => acc + Number(s.quantity_sold), 0);

            setStats({
                revenue: totalRevenue,
                transactions: sales.length,
                itemsSold: totalUnits
            });

            const productMap = {};
            sales.forEach(s => {
                productMap[s.product_name] = (productMap[s.product_name] || 0) + Number(s.quantity_sold);
            });

            const sortedProducts = Object.entries(productMap)
                .map(([name, qty]) => ({ name, qty }))
                .sort((a, b) => b.qty - a.qty);

            setTopProducts(sortedProducts);

            const bucketCount = 7;
            const totalDuration = now.getTime() - startDate.getTime();
            const bucketSize = totalDuration / bucketCount;
            const buckets = new Array(bucketCount).fill(0);

            sales.forEach(sale => {
                const saleTime = new Date(sale.sale_date).getTime();
                const offset = saleTime - startDate.getTime();
                let bucketIndex = Math.floor(offset / bucketSize);
                if (bucketIndex >= bucketCount) bucketIndex = bucketCount - 1;
                if (bucketIndex < 0) bucketIndex = 0;
                buckets[bucketIndex] += Number(sale.total_price);
            });

            const maxRevenue = Math.max(...buckets);
            setChartData(buckets.map(val =>
                maxRevenue === 0 ? 0 : Math.round((val / maxRevenue) * 100)
            ));
        }
        setLoading(false);
    }

    return (
        <div className="flex min-h-screen bg-gray-50 text-gray-900 font-sans">
            {/* --- FIXED COMPONENT TAG --- */}
            <AdminSidebar />

            <main className="flex-1 p-8 overflow-y-auto">
                <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-10 gap-6">
                    <div>
                        <h1 className="text-3xl font-black uppercase tracking-tight">Executive Dashboard</h1>
                        <p className="text-gray-500 font-medium italic">Business Intelligence Overview</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex gap-1 bg-gray-200/60 p-1.5 rounded-2xl shadow-inner">
                            {filters.map((f) => (
                                <button
                                    key={f}
                                    onClick={() => setFilter(f)}
                                    className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-200 ${filter === f
                                        ? 'bg-white text-orange-600 shadow-md'
                                        : 'text-gray-500 hover:text-gray-900'
                                        }`}
                                >
                                    {f}
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={fetchDashboardData}
                            className="p-3 bg-white border border-gray-200 rounded-2xl hover:text-orange-500 transition-colors shadow-sm active:scale-90"
                        >
                            <RefreshCcw size={18} className={loading ? "animate-spin" : ""} />
                        </button>
                    </div>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
                    <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-6 text-orange-50 group-hover:text-orange-100 transition-colors">
                            <TrendingUp size={48} />
                        </div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Total Revenue</p>
                        <p className="text-3xl font-black">₱{stats.revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                        <div className="mt-4 flex items-center gap-1 text-green-600 font-bold text-[10px] uppercase">
                            <ArrowUpRight size={14} /> {filter} Performance
                        </div>
                    </div>

                    <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-6 text-blue-50 group-hover:text-blue-100 transition-colors">
                            <ShoppingBag size={48} />
                        </div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Transactions</p>
                        <p className="text-3xl font-black">{stats.transactions.toLocaleString()}</p>
                        <p className="mt-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Orders Processed</p>
                    </div>

                    <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-6 text-green-50 group-hover:text-green-100 transition-colors">
                            <Package size={48} />
                        </div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Items Sold</p>
                        <p className="text-3xl font-black">{stats.itemsSold.toLocaleString()}</p>
                        <p className="mt-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Inventory Units</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="bg-gray-900 rounded-[2.5rem] p-10 text-white shadow-2xl relative overflow-hidden">
                        <div className="flex justify-between items-center mb-10 relative z-10">
                            <h3 className="text-lg font-black uppercase tracking-widest">Revenue Flow</h3>
                            <span className="text-[10px] bg-orange-600 px-3 py-1 rounded-full font-black uppercase tracking-tighter">Live Feed</span>
                        </div>
                        <div className="flex items-end justify-around h-48 gap-3 relative z-10">
                            {chartData.map((height, i) => (
                                <div key={i} className="flex flex-col items-center w-full group">
                                    <div
                                        style={{ height: `${height}%` }}
                                        className="w-full bg-orange-600/40 group-hover:bg-orange-500 transition-all rounded-t-xl relative min-h-[4px]"
                                    >
                                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-white text-gray-900 text-[10px] font-black px-2 py-1 rounded shadow-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                            {height}% intensity
                                        </div>
                                    </div>
                                    <span className="text-[9px] font-black text-gray-500 mt-4 uppercase">S{i + 1}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-gray-100">
                        <h3 className="text-lg font-black uppercase tracking-widest mb-8">Top Performance</h3>
                        <div className="space-y-10">
                            {loading ? (
                                <p className="text-center text-gray-400 font-bold uppercase py-10 animate-pulse">Analyzing Cloud...</p>
                            ) : topProducts.length > 0 ? (
                                <>
                                    <div>
                                        <div className="flex justify-between items-center mb-3">
                                            <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">⭐ Most Popular</span>
                                            <span className="text-sm font-black text-orange-600 uppercase italic">{topProducts[0].name}</span>
                                        </div>
                                        <div className="w-full bg-gray-100 h-4 rounded-full overflow-hidden">
                                            <div className="bg-orange-500 h-full w-full"></div>
                                        </div>
                                        <p className="text-right mt-2 font-black text-xs text-gray-900">{topProducts[0].qty} units</p>
                                    </div>

                                    {topProducts.length > 1 && (
                                        <div>
                                            <div className="flex justify-between items-center mb-3">
                                                <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">📉 Slow Mover</span>
                                                <span className="text-sm font-black text-gray-800 uppercase italic">{topProducts[topProducts.length - 1].name}</span>
                                            </div>
                                            <div className="w-full bg-gray-100 h-4 rounded-full overflow-hidden">
                                                <div className="bg-red-400 h-full w-[25%]"></div>
                                            </div>
                                            <p className="text-right mt-2 font-black text-xs text-gray-400">{topProducts[topProducts.length - 1].qty} units</p>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <p className="text-center py-10 text-gray-400 font-bold uppercase text-xs">No data for this range</p>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}