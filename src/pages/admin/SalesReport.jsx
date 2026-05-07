import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import Sidebar from '../components/Sidebar';
import {
    FileBarChart, TrendingUp, Package, Calendar,
    RefreshCcw, Banknote, ArrowUpRight, Download, FileText, Filter
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable'; // Updated import for stability

export default function SalesReport() {
    const branches = ['ALL', 'SUBIC', 'MINIMART', 'CASTILLEJOS', 'KSK VARIETY'];
    const [activeBranch, setActiveBranch] = useState('ALL');
    const [salesData, setSalesData] = useState([]);
    const [loading, setLoading] = useState(true);

    // Date Filter State
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    useEffect(() => {
        fetchSales();
    }, [activeBranch, startDate, endDate]);

    async function fetchSales() {
        setLoading(true);
        let query = supabase.from('sales').select('*').order('sale_date', { ascending: false });

        // Branch Filter
        if (activeBranch !== 'ALL') query = query.eq('branch', activeBranch);

        // Date Range Filter
        if (startDate) query = query.gte('sale_date', startDate);
        if (endDate) query = query.lte('sale_date', `${endDate}T23:59:59`);

        const { data, error } = await query;
        if (error) console.error(error);
        else setSalesData(data || []);
        setLoading(false);
    }

    // Analytics
    const totalRevenue = salesData.reduce((acc, sale) => acc + Number(sale.total_price), 0);
    const totalUnits = salesData.reduce((acc, sale) => acc + Number(sale.quantity_sold), 0);
    const averageTicket = salesData.length > 0 ? totalRevenue / salesData.length : 0;

    // --- EXPORT TO CSV ---
    const exportToCSV = () => {
        const headers = ["Date", "Product", "Branch", "Quantity", "Total Price"];
        const rows = salesData.map(s => [
            new Date(s.sale_date).toLocaleDateString(),
            s.product_name,
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

    // --- EXPORT TO PDF (FIXED VERSION) ---
    const exportToPDF = () => {
        try {
            const doc = new jsPDF();

            // Header
            doc.setFontSize(20);
            doc.setTextColor(40);
            doc.text("SAMGYUP KING SALES REPORT", 14, 22);

            doc.setFontSize(10);
            doc.setTextColor(100);
            doc.text(`Branch Scope: ${activeBranch}`, 14, 30);
            doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 35);
            doc.text(`Range: ${startDate || 'All Time'} to ${endDate || 'Present'}`, 14, 40);

            const tableColumn = ["Date", "Product", "Branch", "Qty", "Total"];
            const tableRows = salesData.map(s => [
                new Date(s.sale_date).toLocaleDateString(),
                s.product_name,
                s.branch,
                s.quantity_sold,
                `P${Number(s.total_price).toFixed(2)}`
            ]);

            // Using the autoTable function directly
            autoTable(doc, {
                head: [tableColumn],
                body: tableRows,
                startY: 48,
                styles: { fontSize: 8, cellPadding: 3 },
                headStyles: {
                    fillColor: [234, 88, 12], // Orange-600
                    textColor: [255, 255, 255],
                    fontStyle: 'bold'
                },
                alternateRowStyles: { fillColor: [250, 250, 250] },
            });

            doc.save(`SamgyupKing_Report_${activeBranch}.pdf`);
        } catch (err) {
            console.error("Export error:", err);
            alert("Could not generate PDF. Please ensure jspdf and jspdf-autotable are installed.");
        }
    };

    return (
        <div className="flex min-h-screen bg-gray-50 text-gray-900">
            <Sidebar />

            <main className="flex-1 p-8 overflow-x-auto">
                <header className="flex justify-between items-start mb-8">
                    <div>
                        <h1 className="text-3xl font-black uppercase tracking-tight">Sales Analytics</h1>
                        <p className="text-gray-500 font-medium italic">Performance overview for {activeBranch}.</p>
                    </div>

                    <div className="flex gap-3">
                        <button onClick={exportToCSV} className="flex items-center gap-2 bg-white border border-gray-200 px-4 py-2.5 rounded-xl font-bold text-xs uppercase hover:bg-gray-50 shadow-sm transition-all active:scale-95">
                            <Download size={16} className="text-blue-600" /> CSV
                        </button>
                        <button onClick={exportToPDF} className="flex items-center gap-2 bg-white border border-gray-200 px-4 py-2.5 rounded-xl font-bold text-xs uppercase hover:bg-gray-50 shadow-sm transition-all active:scale-95">
                            <FileText size={16} className="text-red-600" /> PDF
                        </button>
                    </div>
                </header>

                {/* --- FILTERS SECTION --- */}
                <div className="flex flex-wrap gap-4 items-end mb-8 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1">Branch</label>
                        <div className="flex gap-1.5 bg-gray-100 p-1 rounded-xl">
                            {branches.map((br) => (
                                <button key={br} onClick={() => setActiveBranch(br)}
                                    className={`px-4 py-2 rounded-lg text-[9px] font-black transition-all ${activeBranch === br ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                                    {br}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex gap-4 items-end">
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1">Start Date</label>
                            <input type="date" className="bg-gray-100 border-none p-2.5 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-orange-500" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1">End Date</label>
                            <input type="date" className="bg-gray-100 border-none p-2.5 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-orange-500" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                        </div>
                        <button onClick={() => { setStartDate(''); setEndDate(''); }} className="p-2.5 text-gray-400 hover:text-orange-600 transition-colors">
                            <RefreshCcw size={18} />
                        </button>
                    </div>
                </div>

                {/* Analytics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 relative group overflow-hidden">
                        <TrendingUp size={48} className="absolute top-6 right-6 text-orange-50 group-hover:text-orange-100 transition-colors" />
                        <p className="text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest">Gross Revenue</p>
                        <p className="text-3xl font-black text-gray-900">₱{totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                    </div>

                    <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 relative group overflow-hidden">
                        <Package size={48} className="absolute top-6 right-6 text-blue-50 group-hover:text-blue-100 transition-colors" />
                        <p className="text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest">Inventory Outflow</p>
                        <p className="text-3xl font-black text-gray-900">{totalUnits.toLocaleString()}</p>
                    </div>

                    <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 relative group overflow-hidden">
                        <Banknote size={48} className="absolute top-6 right-6 text-green-50 group-hover:text-green-100 transition-colors" />
                        <p className="text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest">Avg. Transaction</p>
                        <p className="text-3xl font-black text-gray-900">₱{averageTicket.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                    </div>
                </div>

                {/* Transaction Table */}
                <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                        <h3 className="font-black text-sm uppercase tracking-widest flex items-center gap-2">
                            <Calendar size={18} className="text-orange-500" /> Activity Log
                        </h3>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                            {salesData.length} records in this view
                        </span>
                    </div>
                    <table className="w-full text-left border-collapse min-w-[900px]">
                        <thead className="bg-gray-900 text-white text-[10px] uppercase tracking-[0.2em]">
                            <tr>
                                <th className="p-6">Timestamp</th>
                                <th className="p-6">Item Description</th>
                                <th className="p-6 text-center">Branch</th>
                                <th className="p-6 text-center">Qty</th>
                                <th className="p-6 text-right">Revenue</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-sm">
                            {loading ? (
                                <tr><td colSpan="5" className="p-20 text-center text-gray-400 font-bold animate-pulse uppercase tracking-[0.2em]">Compiling Records...</td></tr>
                            ) : salesData.length === 0 ? (
                                <tr><td colSpan="5" className="p-20 text-center text-gray-400 font-bold uppercase tracking-widest">No Sales History Found</td></tr>
                            ) : (
                                salesData.map((sale) => (
                                    <tr key={sale.id} className="hover:bg-orange-50/20 transition-colors">
                                        <td className="p-6 text-xs text-gray-400 font-medium">
                                            {new Date(sale.sale_date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                                        </td>
                                        <td className="p-6 font-black uppercase text-gray-800 tracking-tight">{sale.product_name}</td>
                                        <td className="p-6 text-center">
                                            <span className="px-3 py-1 bg-gray-100 rounded-lg text-[9px] font-black uppercase text-gray-500 border border-gray-200">
                                                {sale.branch}
                                            </span>
                                        </td>
                                        <td className="p-6 text-center font-bold text-gray-700">{sale.quantity_sold}</td>
                                        <td className="p-6 text-right font-black text-orange-600 italic">₱{Number(sale.total_price).toFixed(2)}</td>
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