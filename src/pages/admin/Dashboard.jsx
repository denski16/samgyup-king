import { useState, useEffect } from 'react';
import { supabase } from "../../supabaseClient";
import AdminSidebar from "../../components/AdminSidebar";
import {
    TrendingUp,
    ShoppingBag,
    Package,
    ArrowUpRight,
    RefreshCcw,
    AlertTriangle,
    BarChart2,
    CalendarDays,
    LineChart,
    Wallet // Added for Profit Card
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';

export default function Dashboard() {
    const filters = ['Daily', 'Weekly', 'Monthly', 'Quarterly', 'Yearly'];
    const [filter, setFilter] = useState('Daily');
    const [loading, setLoading] = useState(true);

    // Stats State - Added Profit
    const [stats, setStats] = useState({ revenue: 0, profit: 0, transactions: 0, itemsSold: 0 });
    const [topProducts, setTopProducts] = useState([]);
    const [branchData, setBranchData] = useState([]);
    const [criticalStock, setCriticalStock] = useState([]);

    // Matrix State
    const [branchMatrix, setBranchMatrix] = useState({});
    const [matrixChartData, setMatrixChartData] = useState([]);

    useEffect(() => {
        fetchDashboardData();
    }, [filter]);

    async function fetchDashboardData() {
        setLoading(true);
        const now = new Date();
        const todayStr = now.toDateString(); // "Fri May 08 2026"

        let filterStartDate = new Date();
        if (filter === 'Daily') filterStartDate.setHours(0, 0, 0, 0); // Start of today (Local Time)
        else if (filter === 'Weekly') filterStartDate.setDate(now.getDate() - 7);
        else if (filter === 'Monthly') filterStartDate.setDate(now.getDate() - 30);
        else if (filter === 'Quarterly') filterStartDate.setDate(now.getDate() - 90);
        else if (filter === 'Yearly') filterStartDate.setDate(now.getDate() - 365);

        let oneYearAgo = new Date();
        oneYearAgo.setDate(now.getDate() - 365);

        // Fetch all sales for the last year to build the matrix without multiple queries
        const { data: allSales, error: salesError } = await supabase
            .from('sales')
            .select('*')
            .gte('sale_date', oneYearAgo.toISOString())
            .order('sale_date', { ascending: false });

        const { data: inventory } = await supabase.from('inventory').select('*');

        if (!salesError && allSales) {
            const matrix = {
                'SUBIC': { daily: 0, weekly: 0, monthly: 0, quarterly: 0, yearly: 0 },
                'MINIMART': { daily: 0, weekly: 0, monthly: 0, quarterly: 0, yearly: 0 },
                'CASTILLEJOS': { daily: 0, weekly: 0, monthly: 0, quarterly: 0, yearly: 0 },
                'KSK VARIETY': { daily: 0, weekly: 0, monthly: 0, quarterly: 0, yearly: 0 }
            };

            const nowTime = now.getTime();

            allSales.forEach(sale => {
                const sDate = new Date(sale.sale_date); // JS auto-converts UTC to Local Time
                const sTime = sDate.getTime();
                const diffDays = (nowTime - sTime) / (1000 * 3600 * 24);
                const amt = Number(sale.total_price);
                const b = sale.branch;

                if (matrix[b]) {
                    // Timezone Fix: Check if calendar date matches today exactly
                    if (sDate.toDateString() === todayStr) matrix[b].daily += amt;
                    if (diffDays <= 7) matrix[b].weekly += amt;
                    if (diffDays <= 30) matrix[b].monthly += amt;
                    if (diffDays <= 90) matrix[b].quarterly += amt;
                    if (diffDays <= 365) matrix[b].yearly += amt;
                }
            });
            setBranchMatrix(matrix);

            // Matrix Chart Data Transformation
            setMatrixChartData([
                { name: 'Daily', SUBIC: matrix['SUBIC'].daily, MINIMART: matrix['MINIMART'].daily, CASTILLEJOS: matrix['CASTILLEJOS'].daily, 'KSK VARIETY': matrix['KSK VARIETY'].daily },
                { name: 'Weekly', SUBIC: matrix['SUBIC'].weekly, MINIMART: matrix['MINIMART'].weekly, CASTILLEJOS: matrix['CASTILLEJOS'].weekly, 'KSK VARIETY': matrix['KSK VARIETY'].weekly },
                { name: 'Monthly', SUBIC: matrix['SUBIC'].monthly, MINIMART: matrix['MINIMART'].monthly, CASTILLEJOS: matrix['CASTILLEJOS'].monthly, 'KSK VARIETY': matrix['KSK VARIETY'].monthly },
                { name: 'Quarterly', SUBIC: matrix['SUBIC'].quarterly, MINIMART: matrix['MINIMART'].quarterly, CASTILLEJOS: matrix['CASTILLEJOS'].quarterly, 'KSK VARIETY': matrix['KSK VARIETY'].quarterly },
                { name: 'Yearly', SUBIC: matrix['SUBIC'].yearly, MINIMART: matrix['MINIMART'].yearly, CASTILLEJOS: matrix['CASTILLEJOS'].yearly, 'KSK VARIETY': matrix['KSK VARIETY'].yearly },
            ]);

            // Top-Level Stats (Respecting the active filter)
            const filteredSales = allSales.filter(s => {
                const d = new Date(s.sale_date);
                if (filter === 'Daily') return d.toDateString() === todayStr;
                return d >= filterStartDate;
            });

            const totalRevenue = filteredSales.reduce((acc, s) => acc + Number(s.total_price), 0);

            setStats({
                revenue: totalRevenue,
                // PROFIT FORMULA: Change the '0.35' below to whatever your margin is, or calculate based on cost per item if available!
                profit: totalRevenue * 0.35,
                transactions: filteredSales.length,
                itemsSold: filteredSales.reduce((acc, s) => acc + Number(s.quantity_sold), 0)
            });

            // Top Products Mapping
            const productMap = {};
            filteredSales.forEach(s => {
                productMap[s.product_name] = (productMap[s.product_name] || 0) + Number(s.quantity_sold);
            });
            setTopProducts(Object.entries(productMap)
                .map(([name, qty]) => ({ name, qty }))
                .sort((a, b) => b.qty - a.qty)
                .slice(0, 5));

            // Branch Chart Mapping
            const branchMap = { 'SUBIC': 0, 'MINIMART': 0, 'CASTILLEJOS': 0, 'KSK VARIETY': 0 };
            filteredSales.forEach(s => { if (branchMap[s.branch] !== undefined) branchMap[s.branch] += Number(s.total_price); });
            setBranchData(Object.keys(branchMap).map(key => ({ name: key, revenue: branchMap[key] })));
        }

        if (inventory) {
            setCriticalStock(inventory.filter(item => Number(item.current_stock) <= Number(item.re_order_level)));
        }

        setLoading(false);
    }

    // Tooltips
    const CustomTooltip = ({ active, payload }) => (
        active && payload && payload.length && (
            <div className="bg-gray-900 text-white p-3 rounded-xl shadow-2xl border border-gray-700">
                <p className="text-[10px] font-black uppercase text-gray-400 mb-1">{payload[0].payload.name}</p>
                <p className="text-xl font-black text-orange-500">₱{payload[0].value.toLocaleString()}</p>
            </div>
        )
    );

    const MatrixTooltip = ({ active, payload, label }) => (
        active && payload && payload.length && (
            <div className="bg-white text-gray-900 p-4 rounded-xl shadow-2xl border border-gray-100 z-50 relative">
                <p className="text-[10px] font-black uppercase text-gray-400 mb-3">{label}</p>
                {payload.map((entry, index) => (
                    <div key={index} className="flex justify-between items-center gap-4 mb-1">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></span>
                            <span className="text-[10px] font-bold">{entry.name}</span>
                        </div>
                        <span className="text-xs font-black">₱{entry.value.toLocaleString()}</span>
                    </div>
                ))}
            </div>
        )
    );

    return (
        <div className="flex min-h-screen bg-gray-50 text-gray-900 font-sans">
            <AdminSidebar />

            {/* RESPONSIVE UPGRADE: pt-24 provides clearance for mobile menu up to xl: */}
            <main className="flex-1 p-4 pt-24 md:p-6 md:pt-24 xl:p-8 w-full max-w-[100vw] overflow-x-hidden">
                <header className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-6 md:mb-10 gap-6">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight">DASHBOARD OVERVIEW</h1>
                        <p className="text-sm md:text-base text-gray-500 font-medium italic mt-1">Global Business Intelligence</p>
                    </div>

                    <div className="flex items-center gap-3 w-full xl:w-auto">
                        <div className="flex gap-1 bg-gray-200/60 p-1.5 rounded-2xl shadow-inner w-full overflow-x-auto custom-scrollbar">
                            {filters.map((f) => (
                                <button key={f} onClick={() => setFilter(f)}
                                    className={`px-5 py-2.5 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap flex-1 ${filter === f ? 'bg-white text-orange-600 shadow-md' : 'text-gray-500'}`}>
                                    {f}
                                </button>
                            ))}
                        </div>
                        <button onClick={fetchDashboardData} className="p-3 md:p-3.5 bg-white border border-gray-200 rounded-2xl md:rounded-xl hover:text-orange-500 shadow-sm transition-all active:scale-90">
                            <RefreshCcw size={18} className={loading ? "animate-spin text-orange-600" : ""} />
                        </button>
                    </div>
                </header>

                {/* SUMMARY CARDS - lg:grid-cols-4 makes them single row on 1180px iPad */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
                    <Card icon={<TrendingUp />} label="Total Revenue" value={`₱${stats.revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} color="orange" footer={`${filter} Sales`} />
                    <Card icon={<Wallet />} label="Net Profit (Est)" value={`₱${stats.profit.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} color="green" footer={`${filter} Return`} />
                    <Card icon={<ShoppingBag />} label="Transactions" value={stats.transactions.toLocaleString()} color="blue" footer="Orders Logged" />
                    <Card icon={<Package />} label="Items Sold" value={stats.itemsSold.toLocaleString()} color="gray" footer="Units Dispatched" />
                </div>

                {/* MAIN GRID */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 mb-8">
                    <div className="lg:col-span-2 space-y-6 md:space-y-8">
                        {/* Active Chart */}
                        <div className="bg-gray-900 rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 xl:p-10 text-white shadow-2xl relative overflow-hidden">
                            <div className="flex justify-between items-center mb-8 relative z-10">
                                <h3 className="text-sm md:text-lg font-black uppercase tracking-widest flex items-center gap-2">
                                    <BarChart2 className="text-orange-500" /> Branch Comparison
                                </h3>
                                <span className="text-[8px] md:text-[10px] bg-white/10 px-3 py-1 rounded-md font-black text-gray-300 uppercase">{filter}</span>
                            </div>
                            <div className="h-56 md:h-64 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={branchData} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                                        <XAxis dataKey="name" stroke="#4B5563" tick={{ fill: '#9CA3AF', fontSize: 9, fontWeight: 900 }} axisLine={false} tickLine={false} interval={0} angle={-45} textAnchor="end" height={60} />
                                        <YAxis stroke="#4B5563" tick={{ fill: '#9CA3AF', fontSize: 9, fontWeight: 900 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₱${v / 1000}k`} />
                                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                                        <Bar dataKey="revenue" radius={[6, 6, 0, 0]} maxBarSize={50}>
                                            {branchData.map((e, i) => <Cell key={i} fill={e.revenue > 0 ? '#EA580C' : '#374151'} />)}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Critical Stock */}
                        <div className="bg-red-50 rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 xl:p-10 border border-red-100">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-sm md:text-lg font-black uppercase tracking-widest text-red-900 flex items-center gap-2"><AlertTriangle className="text-red-500" /> Critical Stock</h3>
                                <span className="bg-red-600 text-white text-[9px] px-3 py-1 rounded-full font-black">{criticalStock.length} Items</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                {criticalStock.length > 0 ? criticalStock.map(item => (
                                    <div key={item.id} className="bg-white p-4 rounded-2xl shadow-sm border border-red-100 flex justify-between items-center">
                                        <div className="min-w-0 pr-2">
                                            <p className="font-black text-gray-900 uppercase text-xs md:text-sm truncate">{item.product_name}</p>
                                            <p className="text-[8px] font-bold text-red-500 uppercase tracking-widest mt-1 truncate">{item.category}</p>
                                        </div>
                                        <p className="text-2xl font-black text-red-600 leading-none">{item.current_stock}</p>
                                    </div>
                                )) : <p className="text-green-600 font-black uppercase text-xs col-span-2">All branches are fully stocked!</p>}
                            </div>
                        </div>
                    </div>

                    {/* Top Sellers */}
                    <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 xl:p-10 shadow-sm border border-gray-100 flex flex-col h-full">
                        <h3 className="text-sm md:text-lg font-black uppercase tracking-widest mb-8 text-gray-900 flex justify-between items-center">Top Sellers <span className="text-[9px] text-gray-400 bg-gray-100 px-2 py-1 rounded-md">By Qty</span></h3>
                        <div className="flex-1 flex flex-col justify-center space-y-6">
                            {topProducts.length > 0 ? topProducts.map((p, i) => (
                                <div key={i} className="relative">
                                    <div className="flex justify-between items-end mb-2">
                                        <div className="flex items-center gap-3 min-w-0 pr-2">
                                            <span className={`w-6 h-6 flex items-center justify-center rounded-md font-black text-[10px] ${i === 0 ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-500'}`}>#{i + 1}</span>
                                            <span className="text-xs md:text-sm font-black text-gray-800 uppercase tracking-tight truncate">{p.name}</span>
                                        </div>
                                        <span className="font-black text-[10px] md:text-xs text-gray-900">{p.qty} sold</span>
                                    </div>
                                    <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                                        <div className={`h-full rounded-full ${i === 0 ? 'bg-orange-500' : 'bg-gray-800'}`} style={{ width: `${(p.qty / topProducts[0].qty) * 100}%` }}></div>
                                    </div>
                                </div>
                            )) : <p className="text-center text-gray-400 font-bold uppercase text-xs">No sales data</p>}
                        </div>
                    </div>
                </div>

                {/* MATRIX SECTION */}
                <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 xl:p-10 shadow-sm border border-gray-100 overflow-hidden mb-8">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><LineChart size={24} /></div>
                        <div>
                            <h3 className="text-sm md:text-lg font-black uppercase tracking-widest text-gray-900">Visual Performance Matrix</h3>
                            <p className="text-[9px] font-bold text-gray-400 uppercase mt-1">Growth trends across all branches</p>
                        </div>
                    </div>

                    <div className="h-64 md:h-80 w-full mb-10 border-b border-gray-100 pb-10">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={matrixChartData} margin={{ top: 20, right: 0, left: -20, bottom: 5 }}>
                                <XAxis dataKey="name" stroke="#9CA3AF" tick={{ fill: '#6B7280', fontSize: 9, fontWeight: 800 }} axisLine={false} tickLine={false} />
                                <YAxis stroke="#9CA3AF" tick={{ fill: '#6B7280', fontSize: 9, fontWeight: 800 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₱${v >= 1000 ? v / 1000 + 'k' : v}`} />
                                <Tooltip content={<MatrixTooltip />} cursor={{ fill: 'rgba(0,0,0,0.02)' }} />
                                <Legend wrapperStyle={{ fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', paddingTop: '10px' }} iconType="circle" />
                                <Bar dataKey="SUBIC" fill="#f97316" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="MINIMART" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="CASTILLEJOS" fill="#10b981" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="KSK VARIETY" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="overflow-x-auto w-full custom-scrollbar pb-4">
                        <table className="w-full text-left border-collapse min-w-[800px]">
                            <thead className="bg-gray-900 text-white text-[9px] md:text-[10px] uppercase tracking-[0.2em]">
                                <tr>
                                    <th className="p-5 rounded-tl-xl">Branch</th>
                                    <th className="p-5">24h (Today)</th>
                                    <th className="p-5">7d (Weekly)</th>
                                    <th className="p-5">30d (Monthly)</th>
                                    <th className="p-5">90d (Quarterly)</th>
                                    <th className="p-5 rounded-tr-xl">365d (Yearly)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-xs md:text-sm font-bold text-gray-600">
                                {Object.entries(branchMatrix).map(([branch, data]) => (
                                    <tr key={branch} className="hover:bg-orange-50/30 transition-colors">
                                        <td className="p-5 font-black uppercase text-gray-900 tracking-tight flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: branch === 'SUBIC' ? '#f97316' : branch === 'MINIMART' ? '#3b82f6' : branch === 'CASTILLEJOS' ? '#10b981' : '#8b5cf6' }}></span>
                                            {branch}
                                        </td>
                                        <td className="p-5">₱{data.daily.toLocaleString()}</td>
                                        <td className="p-5">₱{data.weekly.toLocaleString()}</td>
                                        <td className="p-5">₱{data.monthly.toLocaleString()}</td>
                                        <td className="p-5">₱{data.quarterly.toLocaleString()}</td>
                                        <td className="p-5 font-black text-orange-600">₱{data.yearly.toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        </div>
    );
}

// Reusable Helper Component for the Top Cards
function Card({ icon, label, value, color, footer }) {
    const colorClasses = {
        orange: "text-orange-50 group-hover:text-orange-100",
        blue: "text-blue-50 group-hover:text-blue-100",
        green: "text-green-50 group-hover:text-green-100",
        gray: "text-gray-50 group-hover:text-gray-100" // Added for the 4th card
    };
    return (
        // Removed the spanMobile logic here since we want them all side-by-side on lg screens anyway
        <div className={`bg-white p-5 md:p-6 lg:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-sm border border-gray-100 relative overflow-hidden group`}>
            <div className={`absolute top-0 right-0 p-6 transition-colors ${colorClasses[color]}`}>{icon}</div>
            <p className="text-[8px] md:text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">{label}</p>
            <p className="text-xl md:text-2xl font-black text-gray-900">{value}</p>
            <div className="mt-4 text-[8px] md:text-[9px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                {(color === 'orange' || color === 'green') && <ArrowUpRight size={14} className="text-green-600" />} {footer}
            </div>
        </div>
    );
}