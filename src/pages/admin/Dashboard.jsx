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
    LineChart
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';

export default function Dashboard() {
    const filters = ['Daily', 'Weekly', 'Monthly', 'Quarterly', 'Yearly'];
    const [filter, setFilter] = useState('Daily');
    const [loading, setLoading] = useState(true);

    // Stats State
    const [stats, setStats] = useState({ revenue: 0, transactions: 0, itemsSold: 0 });
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

        let filterStartDate = new Date();
        if (filter === 'Daily') filterStartDate.setHours(now.getHours() - 24);
        else if (filter === 'Weekly') filterStartDate.setDate(now.getDate() - 7);
        else if (filter === 'Monthly') filterStartDate.setDate(now.getDate() - 30);
        else if (filter === 'Quarterly') filterStartDate.setDate(now.getDate() - 90);
        else if (filter === 'Yearly') filterStartDate.setDate(now.getDate() - 365);

        let oneYearAgo = new Date();
        oneYearAgo.setDate(now.getDate() - 365);

        const { data: allSales, error: salesError } = await supabase
            .from('sales')
            .select('*')
            .gte('sale_date', oneYearAgo.toISOString())
            .lte('sale_date', now.toISOString());

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
                const saleTime = new Date(sale.sale_date).getTime();
                const diffDays = (nowTime - saleTime) / (1000 * 3600 * 24);
                const amt = Number(sale.total_price);
                const b = sale.branch;

                if (matrix[b]) {
                    if (diffDays <= 1) matrix[b].daily += amt;
                    if (diffDays <= 7) matrix[b].weekly += amt;
                    if (diffDays <= 30) matrix[b].monthly += amt;
                    if (diffDays <= 90) matrix[b].quarterly += amt;
                    if (diffDays <= 365) matrix[b].yearly += amt;
                }
            });
            setBranchMatrix(matrix);

            const transformedChartData = [
                { name: 'Daily', SUBIC: matrix['SUBIC'].daily, MINIMART: matrix['MINIMART'].daily, CASTILLEJOS: matrix['CASTILLEJOS'].daily, 'KSK VARIETY': matrix['KSK VARIETY'].daily },
                { name: 'Weekly', SUBIC: matrix['SUBIC'].weekly, MINIMART: matrix['MINIMART'].weekly, CASTILLEJOS: matrix['CASTILLEJOS'].weekly, 'KSK VARIETY': matrix['KSK VARIETY'].weekly },
                { name: 'Monthly', SUBIC: matrix['SUBIC'].monthly, MINIMART: matrix['MINIMART'].monthly, CASTILLEJOS: matrix['CASTILLEJOS'].monthly, 'KSK VARIETY': matrix['KSK VARIETY'].monthly },
                { name: 'Quarterly', SUBIC: matrix['SUBIC'].quarterly, MINIMART: matrix['MINIMART'].quarterly, CASTILLEJOS: matrix['CASTILLEJOS'].quarterly, 'KSK VARIETY': matrix['KSK VARIETY'].quarterly },
                { name: 'Yearly', SUBIC: matrix['SUBIC'].yearly, MINIMART: matrix['MINIMART'].yearly, CASTILLEJOS: matrix['CASTILLEJOS'].yearly, 'KSK VARIETY': matrix['KSK VARIETY'].yearly },
            ];
            setMatrixChartData(transformedChartData);

            const filteredSales = allSales.filter(s => new Date(s.sale_date) >= filterStartDate);

            const totalRevenue = filteredSales.reduce((acc, s) => acc + Number(s.total_price), 0);
            const totalUnits = filteredSales.reduce((acc, s) => acc + Number(s.quantity_sold), 0);
            setStats({ revenue: totalRevenue, transactions: filteredSales.length, itemsSold: totalUnits });

            const productMap = {};
            filteredSales.forEach(s => {
                productMap[s.product_name] = (productMap[s.product_name] || 0) + Number(s.quantity_sold);
            });
            const sortedProducts = Object.entries(productMap)
                .map(([name, qty]) => ({ name, qty }))
                .sort((a, b) => b.qty - a.qty)
                .slice(0, 5);
            setTopProducts(sortedProducts);

            const branchMap = { 'SUBIC': 0, 'MINIMART': 0, 'CASTILLEJOS': 0, 'KSK VARIETY': 0 };
            filteredSales.forEach(s => {
                if (branchMap[s.branch] !== undefined) {
                    branchMap[s.branch] += Number(s.total_price);
                }
            });
            const chartFormatted = Object.keys(branchMap).map(key => ({
                name: key,
                revenue: branchMap[key]
            }));
            setBranchData(chartFormatted);
        }

        if (inventory) {
            const lowStockItems = inventory.filter(item => Number(item.current_stock) <= Number(item.re_order_level));
            setCriticalStock(lowStockItems);
        }

        setLoading(false);
    }

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-gray-900 text-white p-3 md:p-4 rounded-xl shadow-2xl border border-gray-700">
                    <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">{payload[0].payload.name}</p>
                    <p className="text-lg md:text-xl font-black text-orange-500">₱{payload[0].value.toLocaleString()}</p>
                </div>
            );
        }
        return null;
    };

    const MatrixTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white text-gray-900 p-3 md:p-4 rounded-xl shadow-2xl border border-gray-100 z-50 relative">
                    <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 md:mb-3">{label}</p>
                    {payload.map((entry, index) => (
                        <div key={index} className="flex justify-between items-center gap-3 md:gap-4 mb-1">
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></span>
                                <span className="text-[10px] md:text-xs font-bold">{entry.name}</span>
                            </div>
                            <span className="text-xs md:text-sm font-black text-gray-900">₱{entry.value.toLocaleString(undefined, { minimumFractionDigits: 0 })}</span>
                        </div>
                    ))}
                </div>
            );
        }
        return null;
    };

    return (
        <div className="flex min-h-screen bg-gray-50 text-gray-900 font-sans">
            <AdminSidebar />

            {/* RESPONSIVE UPGRADE: Adjusted padding for mobile (p-4) vs desktop (md:p-8) and overflow containment */}
            <main className="flex-1 p-4 md:p-8 overflow-y-auto w-full max-w-[100vw] overflow-x-hidden">

                {/* RESPONSIVE UPGRADE: Header items wrap gracefully */}
                <header className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-6 md:mb-10 gap-4 md:gap-6">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight">Command Center</h1>
                        <p className="text-sm md:text-base text-gray-500 font-medium italic">Master Analytics & Global Overview</p>
                    </div>

                    <div className="flex items-center gap-2 md:gap-3 w-full xl:w-auto">
                        {/* RESPONSIVE UPGRADE: Filter buttons now scroll horizontally on mobile instead of disappearing */}
                        <div className="flex gap-1 bg-gray-200/60 p-1.5 rounded-2xl shadow-inner w-full overflow-x-auto custom-scrollbar">
                            {filters.map((f) => (
                                <button key={f} onClick={() => setFilter(f)}
                                    className={`px-4 md:px-5 py-2 md:py-2.5 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all duration-200 whitespace-nowrap flex-1 ${filter === f ? 'bg-white text-orange-600 shadow-md' : 'text-gray-500 hover:text-gray-900'}`}>
                                    {f}
                                </button>
                            ))}
                        </div>
                        <button onClick={fetchDashboardData} className="p-2 md:p-3 bg-white border border-gray-200 rounded-2xl hover:text-orange-500 transition-colors shadow-sm active:scale-90 flex-shrink-0">
                            <RefreshCcw size={18} className={loading ? "animate-spin text-orange-600" : ""} />
                        </button>
                    </div>
                </header>

                {/* --- STAT CARDS --- */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-8">
                    <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-gray-100 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 md:p-6 text-orange-50 group-hover:text-orange-100 transition-colors"><TrendingUp size={40} className="md:w-12 md:h-12" /></div>
                        <p className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1 md:mb-2">Total Revenue</p>
                        <p className="text-2xl md:text-3xl font-black text-gray-900">₱{stats.revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                        <div className="mt-3 md:mt-4 flex items-center gap-1 text-green-600 font-bold text-[9px] md:text-[10px] uppercase">
                            <ArrowUpRight size={14} /> {filter} Global
                        </div>
                    </div>

                    <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-gray-100 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 md:p-6 text-blue-50 group-hover:text-blue-100 transition-colors"><ShoppingBag size={40} className="md:w-12 md:h-12" /></div>
                        <p className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1 md:mb-2">Transactions</p>
                        <p className="text-2xl md:text-3xl font-black text-gray-900">{stats.transactions.toLocaleString()}</p>
                        <p className="mt-3 md:mt-4 text-[9px] md:text-[10px] font-bold text-gray-400 uppercase tracking-widest">Global Orders</p>
                    </div>

                    {/* On tablets, this 3rd card will span both columns. On desktop, it takes 1 column. */}
                    <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-gray-100 relative overflow-hidden group sm:col-span-2 lg:col-span-1">
                        <div className="absolute top-0 right-0 p-4 md:p-6 text-green-50 group-hover:text-green-100 transition-colors"><Package size={40} className="md:w-12 md:h-12" /></div>
                        <p className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1 md:mb-2">Items Sold</p>
                        <p className="text-2xl md:text-3xl font-black text-gray-900">{stats.itemsSold.toLocaleString()}</p>
                        <p className="mt-3 md:mt-4 text-[9px] md:text-[10px] font-bold text-gray-400 uppercase tracking-widest">Global Units Moved</p>
                    </div>
                </div>

                {/* --- MAIN CHARTS GRID --- */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 mb-8">

                    <div className="lg:col-span-2 space-y-6 md:space-y-8 min-w-0">
                        {/* RESPONSIVE UPGRADE: overflow-hidden and min-w-0 on parent ensures chart resizes correctly */}
                        <div className="bg-gray-900 rounded-[2rem] md:rounded-[2.5rem] p-4 md:p-8 text-white shadow-2xl relative w-full overflow-hidden">
                            <div className="flex justify-between items-center mb-6 md:mb-8 relative z-10">
                                <h3 className="text-sm md:text-lg font-black uppercase tracking-widest flex items-center gap-2">
                                    <BarChart2 className="text-orange-500 w-4 h-4 md:w-6 md:h-6" /> Active Comparison
                                </h3>
                                <span className="text-[8px] md:text-[10px] bg-white/10 px-2 py-1 rounded-md font-black uppercase text-gray-300">{filter}</span>
                            </div>

                            <div className="h-48 md:h-64 w-full">
                                {loading ? (
                                    <div className="h-full flex items-center justify-center text-gray-500 font-bold uppercase tracking-widest animate-pulse text-xs md:text-sm">Calculating Data...</div>
                                ) : (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={branchData} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                                            <XAxis dataKey="name" stroke="#4B5563" tick={{ fill: '#9CA3AF', fontSize: 9, fontWeight: 900 }} axisLine={false} tickLine={false} interval={0} angle={-45} textAnchor="end" height={60} />
                                            <YAxis stroke="#4B5563" tick={{ fill: '#9CA3AF', fontSize: 9, fontWeight: 900 }} axisLine={false} tickLine={false} tickFormatter={(value) => `₱${value / 1000}k`} />
                                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                                            <Bar dataKey="revenue" radius={[6, 6, 0, 0]} maxBarSize={50}>
                                                {branchData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.revenue > 0 ? '#EA580C' : '#374151'} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                        </div>

                        {/* Critical Stock */}
                        <div className="bg-red-50 rounded-[2rem] md:rounded-[2.5rem] p-4 md:p-8 border border-red-100 shadow-sm w-full">
                            <div className="flex justify-between items-center mb-4 md:mb-6">
                                <h3 className="text-sm md:text-lg font-black uppercase tracking-widest text-red-900 flex items-center gap-2">
                                    <AlertTriangle className="text-red-500 w-4 h-4 md:w-6 md:h-6" /> Critical Alerts
                                </h3>
                                <span className="bg-red-600 text-white text-[9px] md:text-[10px] px-2 md:px-3 py-1 rounded-full font-black">{criticalStock.length} Items</span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                {loading ? (
                                    <p className="text-red-400 font-bold uppercase text-[10px] animate-pulse">Scanning inventory...</p>
                                ) : criticalStock.length > 0 ? (
                                    criticalStock.map(item => (
                                        <div key={item.id} className="bg-white p-3 md:p-4 rounded-xl md:rounded-2xl shadow-sm border border-red-100 flex justify-between items-center">
                                            <div className="min-w-0 pr-2">
                                                <p className="font-black text-gray-900 uppercase text-xs md:text-sm tracking-tight truncate">{item.product_name}</p>
                                                <p className="text-[8px] md:text-[9px] font-bold text-red-500 uppercase tracking-widest mt-0.5 md:mt-1 truncate">{item.category}</p>
                                            </div>
                                            <div className="text-right flex-shrink-0">
                                                <p className="text-xl md:text-2xl font-black text-red-600 leading-none">{item.current_stock}</p>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-green-600 font-black uppercase text-xs flex items-center gap-2 col-span-1 sm:col-span-2 py-4">
                                        All branches are fully stocked!
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-1 bg-white rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 shadow-sm border border-gray-100 flex flex-col h-full w-full">
                        <h3 className="text-sm md:text-lg font-black uppercase tracking-widest mb-6 md:mb-8 text-gray-900 flex justify-between items-center">
                            Top Sellers
                            <span className="text-[9px] md:text-[10px] text-gray-400">By Volume</span>
                        </h3>

                        <div className="flex-1 flex flex-col justify-center space-y-4 md:space-y-6">
                            {loading ? (
                                <p className="text-center text-gray-400 font-bold uppercase py-10 animate-pulse text-xs">Ranking Data...</p>
                            ) : topProducts.length > 0 ? (
                                topProducts.map((product, index) => {
                                    const maxQty = topProducts[0].qty;
                                    const percentage = (product.qty / maxQty) * 100;

                                    return (
                                        <div key={index} className="relative">
                                            <div className="flex justify-between items-end mb-1 md:mb-2">
                                                <div className="flex items-center gap-2 md:gap-3 min-w-0 pr-2">
                                                    <span className={`flex-shrink-0 w-5 h-5 md:w-6 md:h-6 flex items-center justify-center rounded-md font-black text-[9px] md:text-[10px] ${index === 0 ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-500'}`}>
                                                        #{index + 1}
                                                    </span>
                                                    <span className="text-xs md:text-sm font-black text-gray-800 uppercase tracking-tight truncate">{product.name}</span>
                                                </div>
                                                <span className="font-black text-[10px] md:text-xs text-gray-900 flex-shrink-0">{product.qty} sold</span>
                                            </div>
                                            <div className="w-full bg-gray-100 h-1.5 md:h-2 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-1000 ${index === 0 ? 'bg-orange-500' : 'bg-gray-800'}`}
                                                    style={{ width: `${percentage}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    )
                                })
                            ) : (
                                <div className="text-center py-10">
                                    <Package className="mx-auto text-gray-300 mb-3 w-8 h-8 md:w-10 md:h-10" />
                                    <p className="text-gray-400 font-bold uppercase text-[10px] md:text-xs tracking-widest">No sales data found</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* --- MATRIX CHART & TABLE SECTION --- */}
                {/* RESPONSIVE UPGRADE: Added overflow-hidden to card, and overflow-x-auto to the table wrapper */}
                <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] p-4 md:p-8 shadow-sm border border-gray-100 overflow-hidden mb-8 w-full">
                    <div className="flex justify-between items-start mb-6 md:mb-8">
                        <div className="flex items-center gap-2 md:gap-3">
                            <div className="p-2 md:p-3 bg-blue-50 text-blue-600 rounded-lg md:rounded-xl">
                                <LineChart className="w-5 h-5 md:w-6 md:h-6" />
                            </div>
                            <div>
                                <h3 className="text-sm md:text-lg font-black uppercase tracking-widest text-gray-900">Visual Matrix</h3>
                                <p className="text-[8px] md:text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5 md:mt-1">Branch growth comparison</p>
                            </div>
                        </div>
                    </div>

                    <div className="h-60 md:h-80 w-full mb-6 md:mb-10 border-b border-gray-100 pb-6 md:pb-10 -ml-4 md:ml-0 pr-4 md:pr-0">
                        {loading ? (
                            <div className="h-full flex items-center justify-center text-gray-500 font-bold uppercase tracking-widest animate-pulse text-xs">Plotting Matrix...</div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={matrixChartData} margin={{ top: 20, right: 0, left: -20, bottom: 5 }}>
                                    <XAxis dataKey="name" stroke="#9CA3AF" tick={{ fill: '#6B7280', fontSize: 9, fontWeight: 800 }} axisLine={false} tickLine={false} />
                                    <YAxis stroke="#9CA3AF" tick={{ fill: '#6B7280', fontSize: 9, fontWeight: 800 }} axisLine={false} tickLine={false} tickFormatter={(value) => `₱${value >= 1000 ? value / 1000 + 'k' : value}`} />
                                    <Tooltip content={<MatrixTooltip />} cursor={{ fill: 'rgba(0,0,0,0.02)' }} />
                                    <Legend wrapperStyle={{ fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', paddingTop: '10px' }} iconType="circle" />

                                    <Bar dataKey="SUBIC" fill="#f97316" radius={[4, 4, 0, 0]} maxBarSize={40} />
                                    <Bar dataKey="MINIMART" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                                    <Bar dataKey="CASTILLEJOS" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                                    <Bar dataKey="KSK VARIETY" fill="#8b5cf6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>

                    <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6">
                        <div className="p-2 md:p-3 bg-orange-50 text-orange-600 rounded-lg md:rounded-xl">
                            <CalendarDays className="w-4 h-4 md:w-5 md:h-5" />
                        </div>
                        <h3 className="text-xs md:text-sm font-black uppercase tracking-widest text-gray-900">Raw Data Ledger</h3>
                    </div>

                    {/* RESPONSIVE UPGRADE: This wrapper allows the table to scroll smoothly on mobile */}
                    <div className="overflow-x-auto w-full custom-scrollbar pb-4">
                        <table className="w-full text-left border-collapse min-w-[700px]">
                            <thead className="bg-gray-900 text-white text-[9px] md:text-[10px] uppercase tracking-[0.2em]">
                                <tr>
                                    <th className="p-3 md:p-5 rounded-tl-xl whitespace-nowrap">Branch Location</th>
                                    <th className="p-3 md:p-5 whitespace-nowrap">24h (Daily)</th>
                                    <th className="p-3 md:p-5 whitespace-nowrap">7d (Weekly)</th>
                                    <th className="p-3 md:p-5 whitespace-nowrap">30d (Monthly)</th>
                                    <th className="p-3 md:p-5 whitespace-nowrap">90d (Quarterly)</th>
                                    <th className="p-3 md:p-5 rounded-tr-xl whitespace-nowrap">365d (Yearly)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-xs md:text-sm">
                                {loading ? (
                                    <tr><td colSpan="6" className="p-6 md:p-10 text-center text-gray-400 font-bold uppercase tracking-widest animate-pulse text-xs">Generating Matrix...</td></tr>
                                ) : (
                                    Object.entries(branchMatrix).map(([branch, data]) => (
                                        <tr key={branch} className="hover:bg-orange-50/30 transition-colors">
                                            <td className="p-3 md:p-5 font-black uppercase text-gray-900 tracking-tight flex items-center gap-2 whitespace-nowrap">
                                                <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full flex-shrink-0" style={{
                                                    backgroundColor: branch === 'SUBIC' ? '#f97316' : branch === 'MINIMART' ? '#3b82f6' : branch === 'CASTILLEJOS' ? '#10b981' : '#8b5cf6'
                                                }}></span>
                                                {branch}
                                            </td>
                                            <td className="p-3 md:p-5 font-bold text-gray-600 whitespace-nowrap">₱{data.daily.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                            <td className="p-3 md:p-5 font-bold text-gray-600 whitespace-nowrap">₱{data.weekly.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                            <td className="p-3 md:p-5 font-bold text-gray-600 whitespace-nowrap">₱{data.monthly.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                            <td className="p-3 md:p-5 font-bold text-gray-600 whitespace-nowrap">₱{data.quarterly.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                            <td className="p-3 md:p-5 font-black text-orange-600 whitespace-nowrap">₱{data.yearly.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </main>
        </div>
    );
}