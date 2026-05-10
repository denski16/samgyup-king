import { useState, useEffect } from 'react';
import { supabase } from "../../supabaseClient";
import AdminSidebar from "../../components/AdminSidebar";
import {
    FileBarChart, TrendingUp, Package, Calendar,
    RefreshCcw, Banknote, Download, FileText,
    ShoppingCart, X, Wallet
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function SalesReport() {
    const branches = ['ALL', 'SUBIC', 'MINIMART', 'CASTILLEJOS', 'KSK VARIETY'];
    const [activeBranch, setActiveBranch] = useState('ALL');

    // Data States
    const [salesData, setSalesData] = useState([]);
    const [inventoryData, setInventoryData] = useState([]); // Added to hold inventory for cost matching
    const [groupedTransactions, setGroupedTransactions] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modal State
    const [selectedTxn, setSelectedTxn] = useState(null);
    const [showModal, setShowModal] = useState(false);

    // Date Filter State
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    useEffect(() => {
        fetchSales();
    }, [activeBranch, startDate, endDate]);

    async function fetchSales() {
        setLoading(true);

        // 1. Fetch Inventory for Cost Calculation
        const { data: invData } = await supabase.from('inventory').select('*');
        if (invData) setInventoryData(invData);

        // 2. Fetch Sales Data
        let query = supabase.from('sales').select('*').order('sale_date', { ascending: false });

        if (activeBranch !== 'ALL') query = query.eq('branch', activeBranch);
        if (startDate) query = query.gte('sale_date', startDate);
        if (endDate) query = query.lte('sale_date', `${endDate}T23:59:59`);

        const { data, error } = await query;
        if (error) {
            console.error(error);
            setSalesData([]);
            setGroupedTransactions([]);
        } else {
            const rawSales = data || [];
            setSalesData(rawSales);

            // --- GROUPING LOGIC ---
            const grouped = rawSales.reduce((acc, sale) => {
                const tid = sale.transaction_id || `OLD-TXN-${sale.id}`;

                if (!acc[tid]) {
                    acc[tid] = {
                        transaction_id: tid,
                        sale_date: sale.sale_date,
                        branch: sale.branch,
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

            // Convert to array and sort by newest
            const groupedArray = Object.values(grouped).sort((a, b) => new Date(b.sale_date) - new Date(a.sale_date));
            setGroupedTransactions(groupedArray);
        }
        setLoading(false);
    }

    // --- STATS CALCULATION ---
    const totalRevenue = salesData.reduce((acc, sale) => acc + Number(sale.total_price), 0);
    const totalUnits = salesData.reduce((acc, sale) => acc + Number(sale.quantity_sold), 0);
    const averageTicket = groupedTransactions.length > 0 ? totalRevenue / groupedTransactions.length : 0;

    // --- ACCURATE PROFIT CALCULATION (Mirrors Dashboard) ---
    let totalCost = 0;
    salesData.forEach(s => {
        const salePrice = Number(s.total_price) || 0;
        let rawQty = Number(s.quantity_sold) || 0;
        let baseQtySold = rawQty;

        const invItem = inventoryData.find(i =>
            i.product_name && s.product_name &&
            i.product_name.toUpperCase() === s.product_name.toUpperCase() &&
            i.branch === s.branch
        );

        if (invItem) {
            const bulkUnit = (invItem.bulk_unit || '').toUpperCase();
            const midUnit = (invItem.mid_unit || '').toUpperCase();
            const baseUnit = (invItem.base_unit || 'PC').toUpperCase();

            const convQty = Number(invItem.conversion_qty) || 1;
            const midConvQty = Number(invItem.mid_conversion_qty) || 1;
            const costPerUnit = Number(invItem.cost_per_unit) || 0;

            const priceBulk = Number(invItem.price_per_bulk) || -1;
            const priceMid = Number(invItem.price_per_mid) || -1;

            const unitPrice = rawQty > 0 ? (salePrice / rawQty) : 0;
            let identifiedUnit = (s.unit_sold || '').toUpperCase();

            // Reverse engineer unit if missing
            if (!identifiedUnit) {
                if (priceBulk > 0 && Math.abs(unitPrice - priceBulk) < 2) identifiedUnit = bulkUnit;
                else if (priceMid > 0 && Math.abs(unitPrice - priceMid) < 2) identifiedUnit = midUnit;
                else identifiedUnit = baseUnit;
            }

            // Convert to base units
            if (identifiedUnit === bulkUnit && convQty > 1) {
                baseQtySold = rawQty * convQty;
            } else if (identifiedUnit === midUnit && midConvQty > 1) {
                baseQtySold = rawQty * midConvQty;
            }

            // Get true base cost
            let divisor = 1;
            if (convQty > 1) {
                divisor = convQty;
            } else if (midConvQty > 1) {
                divisor = midConvQty;
            }

            const trueBaseCost = costPerUnit / divisor;
            totalCost += (trueBaseCost * baseQtySold);
        }
    });

    const totalProfit = isNaN(totalRevenue - totalCost) ? 0 : (totalRevenue - totalCost);

    const openTxnModal = (txn) => {
        setSelectedTxn(txn);
        setShowModal(true);
    };

    // --- EXPORTS ---
    const exportToCSV = () => {
        const headers = ["Transaction ID", "Date", "Time", "Product", "Category", "Branch", "Quantity", "Total Price"];
        const rows = salesData.map(s => [
            s.transaction_id || `OLD-TXN-${s.id}`,
            new Date(s.sale_date).toLocaleDateString(),
            new Date(s.sale_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            s.product_name,
            s.category || 'UNTAGGED',
            s.branch,
            s.quantity_sold,
            s.total_price
        ]);
        const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `SamgyupKing_Sales_${activeBranch}_${new Date().toLocaleDateString()}.csv`);
        link.click();
    };

    const exportToPDF = () => {
        try {
            const doc = new jsPDF();
            doc.setFontSize(20);
            doc.setTextColor(40);
            doc.text("SAMGYUP KING SALES REPORT", 14, 22);
            doc.setFontSize(10);
            doc.setTextColor(100);
            doc.text(`Branch Scope: ${activeBranch}`, 14, 30);
            doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 35);
            doc.text(`Range: ${startDate || 'All Time'} to ${endDate || 'Present'}`, 14, 40);

            const tableColumn = ["Txn ID", "Date", "Product", "Branch", "Qty", "Total"];
            const tableRows = salesData.map(s => [
                (s.transaction_id || `OLD-${s.id}`).substring(0, 16),
                new Date(s.sale_date).toLocaleDateString(),
                s.product_name.substring(0, 18),
                s.branch,
                s.quantity_sold,
                `P${Number(s.total_price).toFixed(2)}`
            ]);

            autoTable(doc, {
                head: [tableColumn],
                body: tableRows,
                startY: 48,
                styles: { fontSize: 7, cellPadding: 2 },
                headStyles: { fillColor: [234, 88, 12], textColor: [255, 255, 255], fontStyle: 'bold' },
                alternateRowStyles: { fillColor: [250, 250, 250] },
            });
            doc.save(`SamgyupKing_Report_${activeBranch}.pdf`);
        } catch (err) {
            console.error("Export error:", err);
        }
    };

    return (
        <div className="flex min-h-screen bg-gray-50 text-gray-900 font-sans">
            <AdminSidebar />

            <main className="flex-1 p-4 pt-24 md:p-6 md:pt-24 xl:p-8 overflow-y-auto w-full max-w-[100vw] overflow-x-hidden">
                {/* --- HEADER --- */}
                <header className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-6 md:mb-10 gap-6">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight">Sales Report</h1>
                        <p className="text-sm md:text-base text-gray-500 font-medium italic mt-1">Performance overview for {activeBranch}.</p>
                    </div>

                    <div className="flex gap-3 w-full xl:w-auto">
                        <button onClick={exportToCSV} className="flex-1 xl:flex-none flex items-center justify-center gap-2 bg-white border border-gray-200 px-4 py-3 rounded-xl font-black text-[10px] uppercase hover:bg-gray-50 shadow-sm transition-all active:scale-95">
                            <Download size={16} className="text-blue-600" /> CSV
                        </button>
                        <button onClick={exportToPDF} className="flex-1 xl:flex-none flex items-center justify-center gap-2 bg-white border border-gray-200 px-4 py-3 rounded-xl font-black text-[10px] uppercase hover:bg-gray-50 shadow-sm transition-all active:scale-95">
                            <FileText size={16} className="text-red-600" /> PDF
                        </button>
                    </div>
                </header>

                {/* --- FILTERS SECTION --- */}
                <div className="flex flex-col lg:flex-row gap-6 items-stretch lg:items-end mb-8 bg-white p-6 md:p-8 xl:p-10 rounded-[2rem] md:rounded-[2.5rem] border border-gray-100 shadow-sm">
                    <div className="flex-1">
                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest">Branch Scope</label>
                        <div className="flex gap-1 bg-gray-100 p-1.5 rounded-2xl overflow-x-auto custom-scrollbar">
                            {branches.map((br) => (
                                <button key={br} onClick={() => setActiveBranch(br)}
                                    className={`px-4 py-2.5 rounded-xl text-[9px] md:text-[10px] font-black transition-all whitespace-nowrap flex-1 ${activeBranch === br ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                                    {br}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 items-end">
                        <div className="w-full sm:w-auto">
                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest">Start Date</label>
                            <input type="date" className="w-full bg-gray-100 border-none p-3.5 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-orange-500" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                        </div>
                        <div className="w-full sm:w-auto">
                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest">End Date</label>
                            <input type="date" className="w-full bg-gray-100 border-none p-3.5 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-orange-500" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                        </div>
                        <button onClick={() => { setStartDate(''); setEndDate(''); }} className="p-3.5 text-gray-400 hover:text-orange-600 transition-colors bg-gray-100 rounded-xl shrink-0">
                            <RefreshCcw size={18} />
                        </button>
                    </div>
                </div>

                {/* --- ANALYTICS CARDS --- */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">

                    {/* 1. Gross Revenue */}
                    <div className="bg-white p-6 md:p-8 xl:p-10 rounded-[2rem] md:rounded-[2.5rem] shadow-sm border border-gray-100 relative group overflow-hidden">
                        <TrendingUp size={48} className="absolute top-6 right-6 text-orange-50 group-hover:text-orange-100 transition-colors" />
                        <p className="text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest">Gross Revenue</p>
                        <p className="text-2xl md:text-3xl font-black text-gray-900">₱{totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                    </div>

                    {/* 2. Net Profit (True) */}
                    <div className="bg-white p-6 md:p-8 xl:p-10 rounded-[2rem] md:rounded-[2.5rem] shadow-sm border border-gray-100 relative group overflow-hidden">
                        <Wallet size={48} className="absolute top-6 right-6 text-green-50 group-hover:text-green-100 transition-colors" />
                        <p className="text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest">Net Profit (True)</p>
                        <p className="text-2xl md:text-3xl font-black text-gray-900">₱{totalProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                    </div>

                    {/* 3. Inventory Outflow */}
                    <div className="bg-white p-6 md:p-8 xl:p-10 rounded-[2rem] md:rounded-[2.5rem] shadow-sm border border-gray-100 relative group overflow-hidden">
                        <Package size={48} className="absolute top-6 right-6 text-blue-50 group-hover:text-blue-100 transition-colors" />
                        <p className="text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest">Inventory Outflow</p>
                        <p className="text-2xl md:text-3xl font-black text-gray-900">{totalUnits.toLocaleString()}</p>
                    </div>

                    {/* 4. Avg. Transaction */}
                    <div className="bg-white p-6 md:p-8 xl:p-10 rounded-[2rem] md:rounded-[2.5rem] shadow-sm border border-gray-100 relative group overflow-hidden">
                        <Banknote size={48} className="absolute top-6 right-6 text-purple-50 group-hover:text-purple-100 transition-colors" />
                        <p className="text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest">Avg. Transaction</p>
                        <p className="text-2xl md:text-3xl font-black text-gray-900">₱{averageTicket.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                    </div>
                </div>

                {/* --- TRANSACTION TABLE --- */}
                <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden w-full">
                    <div className="p-6 md:p-8 xl:p-10 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-gray-50/50 gap-2">
                        <h3 className="font-black text-xs md:text-sm uppercase tracking-widest flex items-center gap-2 text-gray-900">
                            <Calendar size={18} className="text-orange-500" /> Transaction Ledger
                        </h3>
                        <span className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest">
                            {groupedTransactions.length} Transactions Found
                        </span>
                    </div>

                    <div className="overflow-x-auto w-full custom-scrollbar">
                        <table className="w-full text-left border-collapse min-w-[900px]">
                            <thead className="bg-gray-900 text-white text-[9px] md:text-[10px] uppercase tracking-[0.2em]">
                                <tr>
                                    <th className="p-4 md:p-6 xl:p-8">Timestamp</th>
                                    <th className="p-4 md:p-6 xl:p-8">Transaction ID</th>
                                    <th className="p-4 md:p-6 xl:p-8 text-center">Branch</th>
                                    <th className="p-4 md:p-6 xl:p-8 text-center">Items Inside</th>
                                    <th className="p-4 md:p-6 xl:p-8 text-right">Revenue</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-xs md:text-sm">
                                {loading ? (
                                    <tr><td colSpan="5" className="p-10 md:p-20 text-center text-gray-400 font-bold animate-pulse uppercase tracking-[0.2em] text-xs">Compiling Records...</td></tr>
                                ) : groupedTransactions.length === 0 ? (
                                    <tr><td colSpan="5" className="p-10 md:p-20 text-center text-gray-400 font-bold uppercase tracking-widest text-xs">No Sales History Found</td></tr>
                                ) : (
                                    groupedTransactions.map((txn) => (
                                        <tr
                                            key={txn.transaction_id}
                                            onClick={() => openTxnModal(txn)}
                                            className="hover:bg-orange-50/50 transition-colors cursor-pointer group"
                                        >
                                            <td className="p-4 md:p-6 xl:p-8 text-[10px] md:text-xs text-gray-900 font-black">
                                                {new Date(txn.sale_date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                                            </td>
                                            <td className="p-4 md:p-6 xl:p-8 font-black uppercase text-gray-500 tracking-widest text-[10px]">{txn.transaction_id}</td>
                                            <td className="p-4 md:p-6 xl:p-8 text-center">
                                                <span className="px-3 py-1 bg-gray-100 rounded-lg text-[9px] font-black uppercase text-gray-600 border border-gray-200">
                                                    {txn.branch}
                                                </span>
                                            </td>
                                            <td className="p-4 md:p-6 xl:p-8 text-center font-bold text-gray-700">
                                                {txn.total_items}
                                            </td>
                                            <td className="p-4 md:p-6 xl:p-8 text-right font-black text-orange-600 italic">
                                                ₱{txn.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
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
                                    {selectedTxn.transaction_id} • {selectedTxn.branch}
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
                                        <div className="flex items-start gap-2 mb-1">
                                            <p className="font-black text-xs md:text-sm uppercase text-gray-900 leading-tight">
                                                {item.product_name}
                                            </p>
                                            <span className="bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-widest shrink-0 mt-0.5">
                                                {item.category || 'UNTAGGED'}
                                            </span>
                                        </div>
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