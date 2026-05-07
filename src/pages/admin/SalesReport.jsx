import { useState, useEffect } from 'react';
import { supabase } from "../../supabaseClient";
import AdminSidebar from "../../components/AdminSidebar";
import {
    FileBarChart, TrendingUp, Package, Calendar,
    RefreshCcw, Banknote, ArrowUpRight, Download, FileText, Filter
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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

        if (activeBranch !== 'ALL') query = query.eq('branch', activeBranch);
        if (startDate) query = query.gte('sale_date', startDate);
        if (endDate) query = query.lte('sale_date', `${endDate}T23:59:59`);

        const { data, error } = await query;
        if (error) console.error(error);
        else setSalesData(data || []);
        setLoading(false);
    }

    const totalRevenue = salesData.reduce((acc, sale) => acc + Number(sale.total_price), 0);
    const totalUnits = salesData.reduce((acc, sale) => acc + Number(sale.quantity_sold), 0);
    const averageTicket = salesData.length > 0 ? totalRevenue / salesData.length : 0;

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

            const tableColumn = ["Date", "Product", "Branch", "Qty", "Total"];
            const tableRows = salesData.map(s => [
                new Date(s.sale_date).toLocaleDateString(),
                s.product_name,
                s.branch,
                s.quantity_sold,
                `P${Number(s.total_price).toFixed(2)}`
            ]);

            autoTable(doc, {
                head: [tableColumn],
                body: tableRows,
                startY: 48,
                styles: { fontSize: 8, cellPadding: 3 },
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

            <main className="flex-1 p-4 pt-20 md:p-8 overflow-y-auto w-full max-w-[100vw] overflow-x-hidden">
                {/* --- HEADER --- */}
                <header className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-6 md:mb-10 gap-6">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight">Sales Report</h1>
                        <p className="text-sm md:text-base text-gray-500 font-medium italic">Performance overview for {activeBranch}.</p>
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
                <div className="flex flex-col lg:flex-row gap-6 items-stretch lg:items-end mb-8 bg-white p-6 md:p-8 rounded-[2rem] border border-gray-100 shadow-sm">
                    <div className="flex-1">
                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest">Branch Scope</label>
                        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl overflow-x-auto custom-scrollbar">
                            {branches.map((br) => (
                                <button key={br} onClick={() => setActiveBranch(br)}
                                    className={`px-4 py-2 rounded-lg text-[9px] font-black transition-all whitespace-nowrap flex-1 ${activeBranch === br ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                                    {br}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 items-end">
                        <div className="w-full sm:w-auto">
                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest">Start Date</label>
                            <input type="date" className="w-full bg-gray-100 border-none p-3 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-orange-500" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                        </div>
                        <div className="w-full sm:w-auto">
                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest">End Date</label>
                            <input type="date" className="w-full bg-gray-100 border-none p-3 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-orange-500" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                        </div>
                        <button onClick={() => { setStartDate(''); setEndDate(''); }} className="p-3 text-gray-400 hover:text-orange-600 transition-colors bg-gray-100 rounded-xl">
                            <RefreshCcw size={18} />
                        </button>
                    </div>
                </div>

                {/* --- ANALYTICS CARDS --- */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-8">
                    <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 relative group overflow-hidden">
                        <TrendingUp size={48} className="absolute top-6 right-6 text-orange-50 group-hover:text-orange-100 transition-colors" />
                        <p className="text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest">Gross Revenue</p>
                        <p className="text-2xl md:text-3xl font-black text-gray-900">₱{totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                    </div>

                    <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 relative group overflow-hidden">
                        <Package size={48} className="absolute top-6 right-6 text-blue-50 group-hover:text-blue-100 transition-colors" />
                        <p className="text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest">Inventory Outflow</p>
                        <p className="text-2xl md:text-3xl font-black text-gray-900">{totalUnits.toLocaleString()}</p>
                    </div>

                    <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 relative group overflow-hidden sm:col-span-2 lg:col-span-1">
                        <Banknote size={48} className="absolute top-6 right-6 text-green-50 group-hover:text-green-100 transition-colors" />
                        <p className="text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest">Avg. Transaction</p>
                        <p className="text-2xl md:text-3xl font-black text-gray-900">₱{averageTicket.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                    </div>
                </div>

                {/* --- TRANSACTION TABLE --- */}
                <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden w-full">
                    <div className="p-6 md:p-8 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-gray-50/50 gap-2">
                        <h3 className="font-black text-xs md:text-sm uppercase tracking-widest flex items-center gap-2 text-gray-900">
                            <Calendar size={18} className="text-orange-500" /> Transaction Ledger
                        </h3>
                        <span className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest">
                            {salesData.length} records in this view
                        </span>
                    </div>

                    <div className="overflow-x-auto w-full custom-scrollbar">
                        <table className="w-full text-left border-collapse min-w-[900px]">
                            <thead className="bg-gray-900 text-white text-[9px] md:text-[10px] uppercase tracking-[0.2em]">
                                <tr>
                                    <th className="p-4 md:p-6">Timestamp</th>
                                    <th className="p-4 md:p-6">Item Description</th>
                                    <th className="p-4 md:p-6 text-center">Branch</th>
                                    <th className="p-4 md:p-6 text-center">Qty</th>
                                    <th className="p-4 md:p-6 text-right">Revenue</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-xs md:text-sm">
                                {loading ? (
                                    <tr><td colSpan="5" className="p-10 md:p-20 text-center text-gray-400 font-bold animate-pulse uppercase tracking-[0.2em] text-xs">Compiling Records...</td></tr>
                                ) : salesData.length === 0 ? (
                                    <tr><td colSpan="5" className="p-10 md:p-20 text-center text-gray-400 font-bold uppercase tracking-widest text-xs">No Sales History Found</td></tr>
                                ) : (
                                    salesData.map((sale) => (
                                        <tr key={sale.id} className="hover:bg-orange-50/20 transition-colors">
                                            <td className="p-4 md:p-6 text-[10px] md:text-xs text-gray-400 font-medium">
                                                {new Date(sale.sale_date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                                            </td>
                                            <td className="p-4 md:p-6 font-black uppercase text-gray-800 tracking-tight">{sale.product_name}</td>
                                            <td className="p-4 md:p-6 text-center">
                                                <span className="px-3 py-1 bg-gray-100 rounded-lg text-[9px] font-black uppercase text-gray-500 border border-gray-200">
                                                    {sale.branch}
                                                </span>
                                            </td>
                                            <td className="p-4 md:p-6 text-center font-bold text-gray-700">{sale.quantity_sold}</td>
                                            <td className="p-4 md:p-6 text-right font-black text-orange-600 italic">₱{Number(sale.total_price).toFixed(2)}</td>
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