import { useState, useEffect } from 'react';
import { supabase } from "../../supabaseClient";
import StaffSidebar from "../../components/StaffSidebar";
import {
    Package,
    AlertTriangle,
    Store,
    Edit2,
    X,
    CheckCircle,
    RefreshCcw,
    Filter
} from 'lucide-react';

export default function StaffInventory() {
    const [userBranches, setUserBranches] = useState([]);
    const [activeBranch, setActiveBranch] = useState('');
    const [staffName, setStaffName] = useState('');

    const [inventory, setInventory] = useState([]);
    const [loading, setLoading] = useState(true);

    // --- NEW: Category Filter State ---
    const [activeCategory, setActiveCategory] = useState('ALL');

    const [showModal, setShowModal] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [newStockCount, setNewStockCount] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    useEffect(() => {
        initializeStaffData();
    }, []);

    async function initializeStaffData() {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('branches, first_name, last_name')
                .eq('id', user.id)
                .single();

            const branches = profile?.branches || [];
            setUserBranches(branches);
            setStaffName(`${profile?.first_name || 'Staff'} ${profile?.last_name || ''}`.trim());

            if (branches.length > 0) {
                setActiveBranch(branches[0]);
            } else {
                setLoading(false);
            }
        }
    }

    useEffect(() => {
        if (activeBranch) {
            fetchBranchInventory();
        }
    }, [activeBranch]);

    async function fetchBranchInventory() {
        setLoading(true);
        const { data } = await supabase
            .from('inventory')
            .select('*')
            .eq('branch', activeBranch) // FIXED: Uses branch column now
            .order('category', { ascending: true })
            .order('product_name', { ascending: true });

        setInventory(data || []);
        setActiveCategory('ALL'); // Reset category when switching branches
        setLoading(false);
    }

    const openUpdateModal = (item) => {
        setSelectedItem(item);
        setNewStockCount(item.current_stock);
        setShowModal(true);
    };

    const handleUpdateStock = async (e) => {
        e.preventDefault();
        setLoading(true);

        const { error } = await supabase
            .from('inventory')
            .update({ current_stock: Number(newStockCount) })
            .eq('id', selectedItem.id);

        if (error) {
            alert("Failed to update stock: " + error.message);
        } else {
            // --- TIME FIXED LOGGING BLOCK ---
            await supabase.from('activity_logs').insert([{
                staff_name: staffName || 'Unknown Staff',
                branch: activeBranch,
                action_type: 'INVENTORY',
                details: `Updated physical count of [${selectedItem.product_name}] from ${selectedItem.current_stock} to ${newStockCount}`,
                created_at: new Date() // Ensures it matches your Manila time dashboard
            }]);

            setSuccessMsg(`${selectedItem.product_name} updated!`);
            setShowModal(false);
            fetchBranchInventory();
            setTimeout(() => setSuccessMsg(''), 3000);
        }
        setLoading(false);
    };

    // --- DYNAMIC CATEGORIES & FILTERING ---
    const uniqueCategories = ['ALL', ...Array.from(new Set(inventory.map(item => item.category || 'UNTAGGED'))).sort()];

    const filteredInventory = inventory.filter(item =>
        activeCategory === 'ALL' || (item.category || 'UNTAGGED') === activeCategory
    );

    return (
        <div className="flex min-h-screen bg-gray-50 text-gray-900 font-sans">
            <StaffSidebar />

            {/* RESPONSIVE UPGRADE: Keeps pt-24 until xl: breakpoint where sidebar docks */}
            <main className="flex-1 p-4 pt-24 md:p-6 md:pt-24 xl:p-8 overflow-y-auto w-full max-w-[100vw] overflow-x-hidden">
                <header className="mb-6 md:mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight italic">
                            Branch <span className="text-orange-600">Inventory</span>
                        </h1>
                        <p className="text-sm md:text-base text-gray-500 font-medium italic mt-1">
                            Physical stock for {activeBranch || 'your branch'}.
                        </p>
                    </div>
                    <button onClick={fetchBranchInventory} className="p-3 md:p-3.5 bg-white border border-gray-200 rounded-2xl md:rounded-xl hover:text-orange-500 shadow-sm transition-all active:scale-90">
                        <RefreshCcw size={18} className={loading ? "animate-spin text-orange-600" : ""} />
                    </button>
                </header>

                {successMsg && (
                    <div className="mb-6 p-4 md:p-5 bg-green-50 text-green-700 rounded-2xl border border-green-100 flex items-center gap-3 font-black text-[10px] md:text-xs uppercase tracking-tight animate-in fade-in slide-in-from-top-2">
                        <CheckCircle size={20} /> {successMsg}
                    </div>
                )}

                {/* RESTRICTED Branch Selection & Category Filter */}
                <div className="flex flex-col lg:flex-row gap-3 mb-8 shrink-0">
                    {userBranches.length > 0 && (
                        <div className="flex items-center gap-2 bg-gray-200/50 p-1.5 rounded-2xl w-full lg:w-fit overflow-x-auto custom-scrollbar shrink-0">
                            <Store size={14} className="text-gray-400 ml-3 mr-2 shrink-0" />
                            {userBranches.map((br) => (
                                <button key={br} onClick={() => setActiveBranch(br)}
                                    className={`px-5 md:px-6 py-2.5 md:py-3 rounded-xl text-[9px] md:text-[10px] font-black tracking-[0.2em] transition-all whitespace-nowrap flex-1 md:flex-none ${activeBranch === br ? 'bg-white text-orange-600 shadow-md' : 'text-gray-500 hover:text-gray-900'}`}>
                                    {br}
                                </button>
                            ))}
                        </div>
                    )}

                    {!loading && inventory.length > 0 && (
                        <div className="flex items-center gap-1.5 md:gap-2 bg-white border border-gray-200 p-1.5 rounded-2xl w-full lg:flex-1 overflow-x-auto custom-scrollbar shadow-sm">
                            <Filter size={14} className="text-orange-500 ml-3 mr-1 shrink-0" />
                            {uniqueCategories.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setActiveCategory(cat)}
                                    className={`px-4 py-2.5 md:py-3 rounded-xl text-[9px] md:text-[10px] font-black tracking-widest uppercase whitespace-nowrap transition-all ${activeCategory === cat
                                        ? 'bg-gray-900 text-white shadow-md'
                                        : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                                        }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* --- MOBILE/PORTRAIT IPAD VIEW (Cards) --- */}
                {/* Hides at lg: (1024px) so landscape iPad (1180px) gets the table */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:hidden">
                    {loading && !filteredInventory.length ? (
                        <p className="text-center py-10 text-gray-400 font-black uppercase text-xs animate-pulse sm:col-span-2">Loading Inventory...</p>
                    ) : filteredInventory.length === 0 ? (
                        <p className="text-center py-10 text-gray-400 font-black uppercase text-xs sm:col-span-2">No items found.</p>
                    ) : filteredInventory.map((item) => {
                        const isLowStock = item.current_stock <= (item.re_order_level || 5);
                        return (
                            <div key={item.id} className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col gap-4">
                                <div className="flex justify-between items-start">
                                    <div className="min-w-0 pr-2">
                                        <div className="flex gap-1 mb-1.5">
                                            <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">{item.category || 'UNTAGGED'}</span>
                                            <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest">{item.unit || '-'}</span>
                                        </div>
                                        <p className="font-black uppercase text-sm text-gray-900 leading-tight truncate">{item.product_name}</p>
                                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">{item.sku || 'NO SKU'}</p>
                                    </div>
                                    {isLowStock && <AlertTriangle size={16} className="text-red-500 animate-pulse shrink-0" />}
                                </div>

                                <div className="flex justify-between items-end border-t border-gray-50 pt-4">
                                    <div>
                                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Stock Level</p>
                                        <span className={`text-2xl font-black ${isLowStock ? 'text-red-600' : 'text-gray-900'}`}>{item.current_stock}</span>
                                    </div>
                                    <button onClick={() => openUpdateModal(item)} className="p-4 bg-orange-600 text-white rounded-2xl shadow-lg shadow-orange-900/20 active:scale-90 transition-all">
                                        <Edit2 size={20} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* --- DESKTOP/LANDSCAPE IPAD VIEW (Table) --- */}
                {/* Shows at lg: (1024px) -> Covers your 1180x820 screen natively */}
                <div className="hidden lg:block bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-900 text-white text-[10px] uppercase tracking-[0.2em]">
                            <tr>
                                <th className="p-6">Product Item</th>
                                <th className="p-6">Category</th>
                                <th className="p-6 text-center">Unit</th>
                                <th className="p-6 text-center">Current Stock</th>
                                <th className="p-6 text-center">Status</th>
                                <th className="p-6 text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-sm">
                            {filteredInventory.map((item) => {
                                const isLowStock = item.current_stock <= (item.re_order_level || 5);
                                return (
                                    <tr key={item.id} className="hover:bg-orange-50/20 transition-colors group">
                                        <td className="p-6">
                                            <p className="font-black uppercase tracking-tight text-gray-900">{item.product_name}</p>
                                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{item.sku || 'N/A'}</p>
                                        </td>
                                        <td className="p-6 text-[10px] font-bold text-gray-500 uppercase tracking-widest">{item.category || 'UNTAGGED'}</td>
                                        <td className="p-6 text-center text-[10px] font-bold text-gray-500 uppercase tracking-widest">{item.unit || '-'}</td>
                                        <td className="p-6 text-center">
                                            <span className={`text-xl font-black ${isLowStock ? 'text-red-500 animate-pulse' : 'text-gray-900'}`}>{item.current_stock}</span>
                                        </td>
                                        <td className="p-6 text-center">
                                            <span className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase border ${isLowStock ? 'bg-red-50 text-red-600 border-red-200' : 'bg-green-50 text-green-600 border-green-200'}`}>
                                                {isLowStock ? 'Low Stock' : 'Healthy'}
                                            </span>
                                        </td>
                                        <td className="p-6 text-center">
                                            <button onClick={() => openUpdateModal(item)} className="p-3 bg-gray-50 text-gray-600 rounded-xl hover:bg-orange-600 hover:text-white transition-all mx-auto block">
                                                <Edit2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                            {!loading && filteredInventory.length === 0 && (
                                <tr><td colSpan="6" className="p-10 text-center text-gray-400 font-bold uppercase tracking-widest text-xs">No items found</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </main>

            {/* --- UPDATE MODAL --- */}
            {showModal && selectedItem && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-gray-900/60 backdrop-blur-md p-4">
                    <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-10 w-full max-w-sm shadow-2xl animate-in zoom-in duration-200">
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-lg md:text-xl font-black uppercase tracking-tight flex items-center gap-2">
                                <Package className="text-orange-500" /> Count <span className="text-orange-600">Update</span>
                            </h2>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-900"><X size={24} /></button>
                        </div>

                        <div className="mb-6 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                            <div className="flex gap-2 mb-1.5">
                                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">{selectedItem.category || 'UNTAGGED'}</p>
                            </div>
                            <p className="font-black uppercase text-gray-900 text-sm">{selectedItem.product_name}</p>
                            <p className="text-[9px] font-bold text-orange-600 uppercase mt-1">Branch: {activeBranch}</p>
                        </div>

                        <form onSubmit={handleUpdateStock} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-gray-400 ml-2 tracking-widest">New Physical Count ({selectedItem.unit || 'PCS'})</label>
                                <input
                                    required
                                    type="number"
                                    min="0"
                                    autoFocus
                                    inputMode="numeric"
                                    className="w-full bg-gray-50 p-4 md:p-5 rounded-2xl outline-none font-black text-2xl border-2 border-transparent focus:border-orange-500 transition-all text-center"
                                    value={newStockCount}
                                    onChange={(e) => setNewStockCount(e.target.value)}
                                />
                            </div>

                            <button type="submit" disabled={loading} className="w-full p-4 md:p-5 bg-gray-900 hover:bg-black text-white font-black uppercase tracking-[0.2em] text-[10px] md:text-xs rounded-2xl shadow-xl active:scale-95 transition-all">
                                {loading ? 'Updating...' : 'Save New Count'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}