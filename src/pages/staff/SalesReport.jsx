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
    Clock,
    X,
    ShoppingCart
} from 'lucide-react';

export default function StaffSalesReport() {
    const [userBranches, setUserBranches] = useState([]);
    const [activeBranch, setActiveBranch] = useState('');
    const [loading, setLoading] = useState(true);

    // Grouped Transactions State
    const [groupedTransactions, setGroupedTransactions] = useState([]);

    // Modal State
    const [selectedTxn, setSelectedTxn] = useState(null);
    const [showModal, setShowModal] = useState(false);

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

        // --- GROUPING LOGIC ---
        // Group individual sale items into transactions
        const grouped = salesData.reduce((acc, sale) => {
            // Fallback to sale.id if transaction_id doesn't exist (for older records)
            const tid = sale.transaction_id || `OLD-TXN-${sale.id}`;

            if (!acc[tid]) {
                acc[tid] = {
                    transaction_id: tid,
                    sale_date: sale.sale_date,
                    total_amount: 0,
                    total_items: 0,
                    items: []
                };
            }

            acc[tid].total_amount += Number(sale.total_price);
            acc[tid].total_items += Number(sale.quantity_sold);
            acc[tid].items.push(sale);

            return acc;
        }, {});

        // Convert grouped object back to an array and sort by newest first
        const groupedArray = Object.values(grouped).sort((a, b) => new Date(b.sale_date) - new Date(a.sale_date));

        setGroupedTransactions(groupedArray);

        // --- STATS CALCULATION ---
        setStats({
            revenue: groupedArray.reduce((sum, txn) => sum + txn.total_amount, 0),
            itemsSold: groupedArray.reduce((sum, txn) => sum + txn.total_items, 0),
            transactions: groupedArray.length // Count unique transactions, not individual items
        });

        setLoading(false);
    }

    const openTxnModal = (txn) => {
        setSelectedTxn(txn);
        setShowModal(true);
    };

    const todayFormatted = new Date().toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    return (
        <div className="flex min-h-screen bg-gray-50 text-gray-900 font-sans">
            <StaffSidebar />

            <main className="flex-1 p-4 pt-24 md:p-6 md:pt-24 xl:p-8 overflow-y-auto w-full max-w-[100vw] overflow-x-hidden">
                <header className="mb-6 md:mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight italic">
                            Daily <span className="text-orange-600">Shift Report</span>
                        </h1>
                        <p className="text-sm md:text-base text-gray-500 font-medium italic mt-1">
                            End-of-day summary for {todayFormatted}.
                        </p>
                    </div>
                    <button onClick={fetchTodaySales} className="p-3 md:p-3.5 bg-white border border-gray-200 rounded-2xl md:rounded-xl hover:text-orange-500 shadow-sm active:scale-90 transition-all shrink-0">
                        <RefreshCcw size={18} className={loading ? "animate-spin text-orange-600" : ""} />
                    </button>
                </header>

                {/* Branch Selection - Mobile Swipeable */}
                {userBranches.length > 0 && (
                    <div className="flex gap-2 mb-8 bg-gray-200/50 p-1.5 rounded-2xl w-full md:w-fit items-center overflow-x-auto custom-scrollbar shrink-0">
                        <Store size={14} className="text-gray-400 ml-3 mr-1 shrink-0" />
                        {userBranches.map((br) => (
                            <button key={br} onClick={() => setActiveBranch(br)}
                                className={`px-5 md:px-6 py-2.5 md:py-3 rounded-xl text-[9px] md:text-[10px] font-black tracking-[0.2em] transition-all whitespace-nowrap flex-1 md:flex-none ${activeBranch === br ? 'bg-white text-orange-600 shadow-md' : 'text-gray-500 hover:text-gray-900'}`}>
                                {br}
                            </button>
                        ))}
                    </div>
                )}

                {/* Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-8">
                    <ReportCard icon={<PhilippinePeso size={24} />} label="Total Revenue" value={`₱${stats.revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} color="bg-orange-600" />
                    <ReportCard icon={<Package size={24} />} label="Items Sold" value={stats.itemsSold} color="bg-gray-900" />
                    <ReportCard icon={<Receipt size={24} />} label="Transactions" value={stats.transactions} color="bg-blue-600" spanFullOnMobile />
                </div>

                {/* --- MOBILE/PORTRAIT IPAD LEDGER (Cards) --- */}
                <div className="lg:hidden space-y-4">
                    <h2 className="text-sm font-black uppercase tracking-widest text-gray-400 mb-2 flex items-center gap-2">
                        <Clock size={16} /> Transaction History
                    </h2>
                    {loading ? (
                        <p className="text-center py-10 text-gray-400 font-black text-[10px] animate-pulse">Compiling Shift Data...</p>
                    ) : groupedTransactions.length === 0 ? (
                        <p className="text-center py-10 text-gray-400 font-bold italic text-sm">No sales logged today.</p>
                    ) : (
                        groupedTransactions.map((txn) => (
                            <div
                                key={txn.transaction_id}
                                onClick={() => openTxnModal(txn)}
                                className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm active:scale-95 transition-transform cursor-pointer"
                            >
                                <div className="flex justify-between items-start mb-3">
                                    <p className="text-[10px] font-black bg-gray-900 text-white px-2 py-1 rounded-md uppercase tracking-widest">
                                        {new Date(txn.sale_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                    <p className="font-black italic text-orange-600 text-lg">₱{txn.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                                </div>
                                <div className="flex justify-between items-end">
                                    <div className="overflow-hidden pr-4">
                                        <p className="font-black uppercase text-xs text-gray-500 truncate tracking-widest">{txn.transaction_id}</p>
                                    </div>
                                    <p className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap bg-gray-100 px-2 py-1 rounded-lg">
                                        {txn.total_items} {txn.total_items === 1 ? 'Item' : 'Items'}
                                    </p>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* --- DESKTOP/LANDSCAPE IPAD LEDGER (Table) --- */}
                <div className="hidden lg:block bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 md:p-8 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
                        <FileBarChart className="text-orange-600" size={18} />
                        <h2 className="font-black uppercase tracking-widest text-xs">Today's Transactions</h2>
                    </div>
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-900 text-white text-[10px] uppercase tracking-[0.2em]">
                            <tr>
                                <th className="p-6">Time</th>
                                <th className="p-6">Transaction ID</th>
                                <th className="p-6 text-center">Total Items</th>
                                <th className="p-6 text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-sm">
                            {loading ? (
                                <tr><td colSpan="4" className="p-20 text-center text-gray-400 font-black animate-pulse uppercase tracking-widest">Generating Report...</td></tr>
                            ) : groupedTransactions.length === 0 ? (
                                <tr><td colSpan="4" className="p-20 text-center text-gray-400 font-bold uppercase tracking-widest">No sales logged today.</td></tr>
                            ) : (
                                groupedTransactions.map((txn) => (
                                    <tr
                                        key={txn.transaction_id}
                                        onClick={() => openTxnModal(txn)}
                                        className="hover:bg-orange-50/50 transition-colors group cursor-pointer"
                                    >
                                        <td className="p-6">
                                            <p className="font-black text-gray-900 tracking-tight">
                                                {new Date(txn.sale_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </td>
                                        <td className="p-6 font-black uppercase tracking-tight text-gray-500 text-xs">{txn.transaction_id}</td>
                                        <td className="p-6 font-bold text-center">
                                            <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-lg text-xs tracking-widest uppercase">
                                                {txn.total_items}
                                            </span>
                                        </td>
                                        <td className="p-6 text-right font-black italic text-orange-600 text-base">
                                            ₱{txn.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </main>

            {/* --- TRANSACTION DETAILS MODAL --- */}
            {showModal && selectedTxn && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-gray-900/80 backdrop-blur-sm p-4 text-gray-900 font-sans">
                    <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 w-full max-w-lg shadow-2xl animate-in zoom-in duration-200 flex flex-col max-h-[90vh]">

                        {/* Modal Header */}
                        <div className="flex justify-between items-start mb-6 shrink-0 border-b border-gray-100 pb-4">
                            <div>
                                <h2 className="text-lg md:text-xl font-black uppercase tracking-tight flex items-center gap-2 mb-1">
                                    <ShoppingCart className="text-orange-600" size={20} /> Receipt Details
                                </h2>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                    {selectedTxn.transaction_id}
                                </p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-900 bg-gray-100 p-2 rounded-full transition-colors">
                                <X size={18} />
                            </button>
                        </div>

                        {/* Items List */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3 mb-6">
                            {selectedTxn.items.map((item, idx) => (
                                <div key={idx} className="flex justify-between items-center p-3 md:p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                    <div className="flex-1 pr-4">
                                        <p className="font-black text-xs md:text-sm uppercase text-gray-900 leading-tight mb-1">
                                            {item.product_name}
                                        </p>
                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                                            {item.quantity_sold}x {item.unit_sold || 'PC'}
                                        </p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="font-black text-sm md:text-base text-gray-900">
                                            ₱{Number(item.total_price).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Modal Footer / Total */}
                        <div className="p-5 md:p-6 bg-gray-900 rounded-[1.5rem] flex justify-between items-center shrink-0">
                            <div>
                                <p className="text-[9px] font-black uppercase text-gray-400 tracking-widest mb-1">Total Paid</p>
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{selectedTxn.total_items} Items</p>
                            </div>
                            <p className="text-2xl md:text-3xl font-black text-white tracking-tight">
                                ₱{selectedTxn.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </p>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
}

// Helper Card Component
function ReportCard({ icon, label, value, color, spanFullOnMobile }) {
    return (
        <div className={`bg-white p-5 md:p-6 lg:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-sm border border-gray-100 flex items-center gap-4 md:gap-6 ${spanFullOnMobile ? 'sm:col-span-2 lg:col-span-1' : ''}`}>
            <div className={`${color} text-white p-3 md:p-4 rounded-xl md:rounded-2xl shadow-lg flex-shrink-0`}>
                {icon}
            </div>
            <div className="min-w-0">
                <p className="text-[9px] md:text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1 truncate">{label}</p>
                <p className="text-xl md:text-2xl font-black text-gray-900 tracking-tight truncate">{value}</p>
            </div>
        </div>
    );
}