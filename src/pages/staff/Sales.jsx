import { useState, useEffect } from 'react';
import { supabase } from "../../supabaseClient";
import StaffSidebar from "../../components/StaffSidebar";
import {
    ShoppingCart,
    ArrowRight,
    CheckCircle,
    AlertTriangle,
    Store,
    RefreshCcw,
    Filter
} from 'lucide-react';

export default function Sales() {
    const [userBranches, setUserBranches] = useState([]);
    const [activeBranch, setActiveBranch] = useState('');
    const [staffName, setStaffName] = useState('');

    const [inventory, setInventory] = useState([]);
    const [loading, setLoading] = useState(false);
    const [fetchingInventory, setFetchingInventory] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [qtySold, setQtySold] = useState(1);
    const [successMsg, setSuccessMsg] = useState('');

    // --- NEW: Category Filter State ---
    const [activeCategory, setActiveCategory] = useState('ALL');

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
            }
        }
    }

    useEffect(() => {
        if (activeBranch) {
            fetchBranchInventory();
        }
    }, [activeBranch]);

    async function fetchBranchInventory() {
        if (!activeBranch) return;
        setFetchingInventory(true);
        const { data } = await supabase
            .from('inventory')
            .select('*')
            .eq('branch', activeBranch) // FIXED: Uses branch column now
            .order('category', { ascending: true })
            .order('product_name', { ascending: true });

        setInventory(data || []);
        setActiveCategory('ALL'); // Reset category when switching branches
        setSelectedItem(null);
        setQtySold(1);
        setFetchingInventory(false);
    }

    async function handleProcessSale(e) {
        e.preventDefault();
        if (!selectedItem || qtySold <= 0 || !activeBranch) return;

        setLoading(true);
        const newStock = Number(selectedItem.current_stock) - Number(qtySold);

        if (newStock < 0) {
            alert("Error: Not enough stock available!");
            setLoading(false);
            return;
        }

        const { error: invError } = await supabase
            .from('inventory')
            .update({ current_stock: newStock })
            .eq('id', selectedItem.id);

        const { error: saleError } = await supabase
            .from('sales')
            .insert([{
                inventory_id: selectedItem.id,
                product_name: selectedItem.product_name,
                branch: activeBranch,
                quantity_sold: qtySold,
                total_price: selectedItem.price_per_unit * qtySold,
                sale_date: new Date() // FIXED: Use local Date for Manila Timezone
            }]);

        if (invError || saleError) {
            alert("Transaction Failed!");
        } else {
            await supabase.from('activity_logs').insert([{
                staff_name: staffName || 'Unknown Staff',
                branch: activeBranch,
                action_type: 'SALE',
                details: `Processed sale: ${qtySold}x ${selectedItem.product_name} (Total: ₱${(selectedItem.price_per_unit * qtySold).toLocaleString()})`,
                created_at: new Date()
            }]);

            setSuccessMsg(`Sold ${qtySold} units of ${selectedItem.product_name}`);
            setSelectedItem(null);
            setQtySold(1);
            fetchBranchInventory();
            setTimeout(() => setSuccessMsg(''), 3000);
        }
        setLoading(false);
    }

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
                <header className="mb-6 md:mb-8">
                    <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight">Daily Sales Entry</h1>
                    <p className="text-sm md:text-base text-gray-500 font-medium italic mt-1">Record manual sales to auto-deduct from inventory.</p>
                </header>

                {/* RESTRICTED Branch Selection & Category Filter Row */}
                {userBranches.length === 0 ? (
                    <div className="mb-8 p-4 bg-red-50 text-red-600 rounded-2xl border border-red-100 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                        <AlertTriangle size={18} /> No branches assigned.
                    </div>
                ) : (
                    <div className="flex flex-col lg:flex-row gap-3 mb-8 shrink-0">
                        <div className="flex items-center gap-2 bg-gray-200/50 p-1.5 rounded-2xl w-full lg:w-fit overflow-x-auto custom-scrollbar shrink-0">
                            <Store size={14} className="text-gray-400 ml-3 mr-1 shrink-0" />
                            {userBranches.map((br) => (
                                <button key={br} onClick={() => setActiveBranch(br)}
                                    className={`px-5 md:px-6 py-2.5 md:py-3 rounded-xl text-[9px] md:text-[10px] font-black tracking-[0.2em] transition-all whitespace-nowrap flex-1 md:flex-none ${activeBranch === br ? 'bg-white text-orange-600 shadow-md' : 'text-gray-500 hover:text-gray-900'}`}>
                                    {br}
                                </button>
                            ))}
                        </div>

                        {!fetchingInventory && inventory.length > 0 && (
                            <div className="flex items-center gap-1.5 md:gap-2 bg-white border border-gray-200 p-1.5 rounded-2xl w-full lg:flex-1 overflow-x-auto custom-scrollbar shadow-sm">
                                <Filter size={14} className="text-orange-500 ml-3 mr-1 shrink-0" />
                                {uniqueCategories.map(cat => (
                                    <button
                                        key={cat}
                                        onClick={() => {
                                            setActiveCategory(cat);
                                            setSelectedItem(null); // Reset selection when category changes
                                        }}
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
                )}

                {/* 1180px iPad landscape triggers lg:grid-cols-3 cleanly */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
                    {/* LEFT: New Transaction */}
                    <div className="lg:col-span-2 bg-white rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 xl:p-10 shadow-sm border border-gray-100 h-fit">
                        <h2 className="text-lg md:text-xl font-black uppercase mb-6 md:mb-8 flex items-center gap-3">
                            <ShoppingCart className="text-orange-500" size={24} /> New Transaction
                        </h2>

                        {successMsg && (
                            <div className="mb-6 md:mb-8 p-4 md:p-5 bg-green-50 text-green-700 rounded-2xl md:rounded-3xl border border-green-100 flex items-center gap-3 font-black text-[10px] md:text-xs uppercase tracking-tight animate-in fade-in slide-in-from-top-2">
                                <CheckCircle size={20} /> {successMsg}
                            </div>
                        )}

                        <form onSubmit={handleProcessSale} className="space-y-6 md:space-y-8">
                            <div className="space-y-3">
                                <label className="block text-[9px] md:text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Select Product</label>
                                <select
                                    className="w-full bg-gray-50 p-4 md:p-5 rounded-2xl md:rounded-3xl outline-none focus:ring-2 focus:ring-orange-500/20 border border-transparent focus:border-orange-500/50 font-bold text-xs md:text-sm appearance-none cursor-pointer"
                                    onChange={(e) => setSelectedItem(filteredInventory.find(i => i.id === e.target.value))}
                                    value={selectedItem?.id || ''}
                                    required
                                    disabled={userBranches.length === 0}
                                >
                                    <option value="">-- Choose Item from {activeCategory === 'ALL' ? 'Menu' : activeCategory} --</option>
                                    {filteredInventory.map(item => (
                                        <option key={item.id} value={item.id}>
                                            {item.product_name} (Stock: {item.current_stock})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {selectedItem && (
                                <div className="p-6 md:p-8 bg-gray-50 rounded-[1.5rem] md:rounded-[2rem] border border-gray-100 flex justify-between items-center text-gray-900">
                                    <div className="space-y-1">
                                        <p className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest">Unit Price</p>
                                        <p className="text-xl md:text-2xl font-black text-orange-600">₱{selectedItem.price_per_unit.toLocaleString()}</p>
                                    </div>
                                    <ArrowRight className="text-gray-300 mx-2" size={24} />
                                    <div className="text-right space-y-1">
                                        <p className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Bill</p>
                                        <p className="text-xl md:text-2xl font-black text-gray-900">₱{(selectedItem.price_per_unit * qtySold).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 pt-2 md:pt-4">
                                <div className="space-y-3">
                                    <label className="block text-[9px] md:text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Quantity Sold</label>
                                    <input
                                        type="number"
                                        min="1"
                                        inputMode="numeric"
                                        className="w-full bg-gray-50 p-4 md:p-5 rounded-2xl md:rounded-3xl outline-none font-black text-xl md:text-2xl border border-transparent focus:border-orange-200 focus:bg-white transition-all disabled:opacity-50"
                                        value={qtySold}
                                        onChange={(e) => setQtySold(e.target.value)}
                                        required
                                        disabled={!selectedItem}
                                    />
                                </div>
                                <div className="flex items-end">
                                    <button
                                        type="submit"
                                        disabled={loading || !selectedItem || userBranches.length === 0}
                                        className="w-full py-4 md:py-6 bg-orange-600 hover:bg-orange-700 text-white font-black uppercase tracking-[0.2em] text-[10px] md:text-xs rounded-2xl md:rounded-3xl shadow-2xl shadow-orange-900/30 transition-all active:scale-95 disabled:opacity-50"
                                    >
                                        {loading ? 'Processing...' : 'Complete Sale'}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>

                    {/* RIGHT: Stock Check */}
                    <div className="lg:col-span-1 bg-gray-900 rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 xl:p-10 text-white shadow-2xl h-fit w-full">
                        <div className="flex justify-between items-center mb-6 md:mb-8">
                            <h2 className="text-base md:text-lg font-black uppercase tracking-widest flex items-center gap-3">
                                <AlertTriangle className="text-orange-500" size={24} /> Stock Check
                            </h2>
                            <button onClick={fetchBranchInventory} className="text-gray-500 hover:text-white transition-colors">
                                <RefreshCcw size={16} className={fetchingInventory ? 'animate-spin' : ''} />
                            </button>
                        </div>
                        <div className="space-y-3 md:space-y-4 max-h-[400px] md:max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                            {filteredInventory.map(item => (
                                <div key={item.id} className="flex justify-between items-center p-3 md:p-4 rounded-xl md:rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors">
                                    <div className="truncate pr-3 min-w-0">
                                        <p className="font-bold text-xs md:text-sm truncate uppercase tracking-tight">{item.product_name}</p>
                                        <div className="flex gap-1 mt-1">
                                            <span className="text-[8px] md:text-[9px] text-gray-500 uppercase font-black tracking-widest truncate">{item.sku || 'No SKU'}</span>
                                            <span className="text-[8px] md:text-[9px] text-gray-600 uppercase font-black tracking-widest">• {item.unit || 'UNIT'}</span>
                                        </div>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <p className={`font-black text-sm md:text-base ${item.current_stock <= (item.re_order_level || 5) ? 'text-red-500 animate-pulse' : 'text-green-500'}`}>
                                            {item.current_stock}
                                        </p>
                                    </div>
                                </div>
                            ))}
                            {filteredInventory.length === 0 && (
                                <div className="text-center py-10">
                                    <p className="text-gray-600 text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em]">
                                        {activeBranch ? 'No items found' : 'No branch selected'}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}