import { useState, useEffect } from 'react';
import { supabase } from "../../supabaseClient";
import StaffSidebar from "../../components/StaffSidebar";
import { Receipt, Plus, Search, Calendar, X, Banknote } from 'lucide-react';

export default function StaffExpenses() {
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [staffBranch, setStaffBranch] = useState('');

    // Modal State
    const [showAddModal, setShowAddModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        description: '',
        amount: '',
        category: 'Restock'
    });

    useEffect(() => {
        fetchStaffDataAndExpenses();
    }, []);

    // Clean branch names of any array brackets or quotes
    const sanitizeBranch = (val) => {
        if (!val) return "";
        // Removes [, ], and " characters if the DB stored it as a stringified array
        return String(val).replace(/[\[\]"]/g, "").trim().toUpperCase();
    };

    async function fetchStaffDataAndExpenses() {
        setLoading(true);
        try {
            // 1. Get current user session
            const { data: { user }, error: authError } = await supabase.auth.getUser();
            if (authError || !user) return;

            // 2. Get branch from 'branches' column in profiles
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('branches')
                .eq('id', user.id)
                .single();

            if (profileError) throw profileError;

            if (profile?.branches) {
                const cleanBranch = sanitizeBranch(profile.branches);
                setStaffBranch(cleanBranch);

                // 3. Fetch expenses using .ilike to ignore case sensitivity
                const { data: expData, error: expError } = await supabase
                    .from('expenses')
                    .select('*')
                    .ilike('branches', cleanBranch)
                    .order('created_at', { ascending: false });

                if (expError) throw expError;

                // Final UI Safety: If the DB still has brackets, clean them for the display
                const cleanedList = (expData || []).map(item => ({
                    ...item,
                    branches: sanitizeBranch(item.branches)
                }));

                setExpenses(cleanedList);
            }
        } catch (error) {
            console.error("Fetch System Error:", error.message);
        } finally {
            setLoading(false);
        }
    }

    const handleAddExpense = async (e) => {
        e.preventDefault();
        if (!staffBranch) return alert("Error: No branch assigned to your profile.");

        setIsSubmitting(true);

        const { error } = await supabase.from('expenses').insert([{
            description: formData.description,
            amount: Number(formData.amount),
            category: formData.category,
            branches: staffBranch // Inserts clean string "KSK VARIETY"
        }]);

        if (error) {
            console.error("Insert Error:", error.message);
            alert("Failed to log expense: " + error.message);
        } else {
            setFormData({ description: '', amount: '', category: 'Restock' });
            setShowAddModal(false);
            fetchStaffDataAndExpenses();
        }
        setIsSubmitting(false);
    };

    // Date Logic & Totals
    const todayStr = new Date().toDateString();
    const todaysTotal = expenses
        .filter(exp => new Date(exp.created_at).toDateString() === todayStr)
        .reduce((acc, exp) => acc + Number(exp.amount), 0);

    const filteredExpenses = expenses.filter(exp =>
        exp.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exp.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex min-h-screen bg-gray-50 text-gray-900 font-sans">
            <StaffSidebar />

            <main className="flex-1 p-4 pt-24 md:p-6 md:pt-24 xl:p-8 w-full max-w-[100vw] overflow-x-hidden">

                {/* --- HEADER --- */}
                <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 md:mb-10 gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight flex items-center gap-3">
                            <Receipt className="text-orange-600" size={32} />
                            Expenses Log
                        </h1>
                        <p className="text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-[0.2em] mt-1">
                            Branch Location: <span className="text-orange-600">{staffBranch || 'FETCHING...'}</span>
                        </p>
                    </div>

                    <button
                        onClick={() => setShowAddModal(true)}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-6 py-3.5 rounded-xl font-black text-[10px] md:text-xs uppercase tracking-widest shadow-lg active:scale-95 transition-all"
                    >
                        <Plus size={18} /> New Entry
                    </button>
                </header>

                {/* --- TOTAL CARD --- */}
                <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-gray-100 relative overflow-hidden group mb-8">
                    <Banknote size={64} className="absolute -bottom-4 -right-4 text-red-50 group-hover:text-red-100 transition-colors transform rotate-12" />
                    <p className="text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Branch Expenses (Today)</p>
                    <p className="text-4xl md:text-5xl font-black text-gray-900 tracking-tighter">
                        ₱{todaysTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                </div>

                {/* --- DATA TABLE --- */}
                <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 md:p-8 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-gray-50/50 gap-4">
                        <h3 className="font-black text-sm md:text-base uppercase tracking-widest text-gray-900">Recent Records</h3>
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input
                                type="text"
                                placeholder="Search reason..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-white border border-gray-200 pl-10 pr-4 py-2.5 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-orange-500"
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto w-full custom-scrollbar">
                        <table className="w-full text-left border-collapse min-w-[700px]">
                            <thead className="bg-gray-900 text-white text-[9px] md:text-[10px] uppercase tracking-[0.2em]">
                                <tr>
                                    <th className="p-4 md:p-6">Timestamp</th>
                                    <th className="p-4 md:p-6">Reason / Item</th>
                                    <th className="p-4 md:p-6">Category</th>
                                    <th className="p-4 md:p-6 text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-xs md:text-sm font-bold">
                                {loading ? (
                                    <tr><td colSpan="4" className="p-10 text-center animate-pulse text-gray-400 uppercase tracking-widest">Updating branch history...</td></tr>
                                ) : filteredExpenses.length === 0 ? (
                                    <tr><td colSpan="4" className="p-10 text-center text-gray-300 uppercase tracking-widest">No logs found for {staffBranch}</td></tr>
                                ) : (
                                    filteredExpenses.map((exp) => (
                                        <tr key={exp.id} className="hover:bg-orange-50/30 transition-colors">
                                            <td className="p-4 md:p-6 text-[10px] text-gray-400">
                                                {new Date(exp.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                                            </td>
                                            <td className="p-4 md:p-6 text-gray-900 uppercase">{exp.description}</td>
                                            <td className="p-4 md:p-6">
                                                <span className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-lg text-[9px] uppercase tracking-widest">
                                                    {exp.category}
                                                </span>
                                            </td>
                                            <td className="p-4 md:p-6 text-right text-red-600 italic">
                                                -₱{Number(exp.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>

            {/* --- ADD MODAL --- */}
            {showAddModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-gray-900/80 backdrop-blur-sm p-4 font-sans text-gray-900">
                    <div className="bg-white rounded-[2rem] p-6 md:p-8 w-full max-w-md shadow-2xl scale-in-center">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
                                <Receipt className="text-orange-600" /> Log Expense
                            </h2>
                            <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-900 bg-gray-100 p-2 rounded-full transition-colors">
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleAddExpense} className="space-y-4">
                            <div className="bg-orange-50 border border-orange-100 p-3 rounded-xl mb-4">
                                <p className="text-[8px] font-black text-orange-400 uppercase tracking-[0.2em]">Reporting for</p>
                                <p className="text-xs font-black uppercase text-orange-600">{staffBranch}</p>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest">Description</label>
                                <input
                                    required
                                    type="text"
                                    placeholder="e.g. Purified Water, Gas Refill"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full bg-gray-50 border border-gray-200 p-3.5 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-orange-500"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest">Amount (₱)</label>
                                    <input
                                        required
                                        type="number"
                                        step="0.01"
                                        placeholder="0.00"
                                        value={formData.amount}
                                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                        className="w-full bg-gray-50 border border-gray-200 p-3.5 rounded-xl text-sm font-black text-red-600 outline-none focus:ring-2 focus:ring-orange-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest">Category</label>
                                    <select
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                        className="w-full bg-gray-50 border border-gray-200 p-3.5 rounded-xl text-xs font-bold outline-none uppercase cursor-pointer"
                                    >
                                        <option value="Restock">Restock</option>
                                        <option value="Utility">Utility</option>
                                        <option value="Maintenance">Maintenance</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full mt-4 py-4 bg-gray-900 hover:bg-black text-white font-black uppercase text-xs tracking-widest rounded-xl transition-all shadow-xl active:scale-95 disabled:opacity-50"
                            >
                                {isSubmitting ? 'Recording...' : 'Confirm Entry'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}