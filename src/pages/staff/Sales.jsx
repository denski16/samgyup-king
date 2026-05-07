import { useState, useEffect } from 'react';
import { supabase } from "../../supabaseClient";
import StaffSidebar from "../../components/StaffSidebar";
import {
    ShoppingCart,
    ArrowRight,
    CheckCircle,
    AlertTriangle,
    Store
} from 'lucide-react';

export default function Sales() {
    // Staff-specific state
    const [userBranches, setUserBranches] = useState([]);
    const [activeBranch, setActiveBranch] = useState('');
    const [staffName, setStaffName] = useState(''); // <-- ADDED: Tracker for who is logged in

    // Inventory and Transaction state
    const [inventory, setInventory] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [qtySold, setQtySold] = useState(1);
    const [successMsg, setSuccessMsg] = useState('');

    // 1. On Mount: Fetch the logged-in Staff's profile to get their branches and name
    useEffect(() => {
        initializeStaffData();
    }, []);

    async function initializeStaffData() {
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
            // UPDATED: Now grabbing first_name and last_name for the activity log
            const { data: profile } = await supabase
                .from('profiles')
                .select('branches, first_name, last_name')
                .eq('id', user.id)
                .single();

            const branches = profile?.branches || [];
            setUserBranches(branches);

            // Set the staff name for the logs
            setStaffName(`${profile?.first_name || 'Staff'} ${profile?.last_name || ''}`.trim());

            // Automatically set the first branch as active
            if (branches.length > 0) {
                setActiveBranch(branches[0]);
            }
        }
    }

    // 2. When activeBranch changes, fetch that specific branch's inventory
    useEffect(() => {
        if (activeBranch) {
            fetchBranchInventory();
        }
    }, [activeBranch]);

    async function fetchBranchInventory() {
        // Only fetch if they actually have a branch selected
        if (!activeBranch) return;

        const { data } = await supabase
            .from('inventory')
            .select('*')
            .eq('category', activeBranch)
            .order('product_name', { ascending: true });

        setInventory(data || []);
        // Reset selection when switching branches
        setSelectedItem(null);
        setQtySold(1);
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

        // Deduct from Inventory
        const { error: invError } = await supabase
            .from('inventory')
            .update({ current_stock: newStock })
            .eq('id', selectedItem.id);

        // Record the Sale
        const { error: saleError } = await supabase
            .from('sales')
            .insert([{
                inventory_id: selectedItem.id,
                product_name: selectedItem.product_name,
                branch: activeBranch,
                quantity_sold: qtySold,
                total_price: selectedItem.price_per_unit * qtySold,
                sale_date: new Date().toISOString()
            }]);

        if (invError || saleError) {
            alert("Transaction Failed! " + (invError?.message || saleError?.message));
        } else {
            // --- NEW LOGGING BLOCK ---
            // This silently sends the action to the Admin Radar
            await supabase.from('activity_logs').insert([{
                staff_name: staffName || 'Unknown Staff',
                branch: activeBranch,
                action_type: 'SALE',
                details: `Processed sale: ${qtySold}x ${selectedItem.product_name} (Total: ₱${(selectedItem.price_per_unit * qtySold).toLocaleString()})`
            }]);
            // -------------------------

            setSuccessMsg(`Sold ${qtySold} units of ${selectedItem.product_name}`);
            setSelectedItem(null);
            setQtySold(1);
            fetchBranchInventory(); // Refresh stock list
            setTimeout(() => setSuccessMsg(''), 3000);
        }
        setLoading(false);
    }

    return (
        <div className="flex min-h-screen bg-gray-50 text-gray-900 font-sans">
            <StaffSidebar />

            <main className="flex-1 p-8 overflow-y-auto">
                <header className="mb-8 flex justify-between items-end">
                    <div>
                        <h1 className="text-3xl font-black uppercase tracking-tight">Daily Sales Entry</h1>
                        <p className="text-gray-500 font-medium italic">Record sales to auto-deduct from {activeBranch || 'your'} inventory.</p>
                    </div>
                </header>

                {/* RESTRICTED Branch Selection */}
                {userBranches.length === 0 ? (
                    <div className="mb-8 p-4 bg-red-50 text-red-600 rounded-2xl border border-red-100 flex items-center gap-2 text-sm font-bold uppercase">
                        <AlertTriangle size={18} /> No branches assigned to your profile. Please contact Admin.
                    </div>
                ) : (
                    <div className="flex flex-wrap gap-2 mb-8 bg-gray-200/50 p-1.5 rounded-2xl w-fit items-center">
                        <Store size={14} className="text-gray-400 ml-3 mr-2" />
                        {userBranches.map((br) => (
                            <button key={br} onClick={() => setActiveBranch(br)}
                                className={`px-6 py-3 rounded-xl text-[10px] font-black tracking-[0.2em] transition-all ${activeBranch === br ? 'bg-white text-orange-600 shadow-md' : 'text-gray-500 hover:text-gray-900'}`}>
                                {br}
                            </button>
                        ))}
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* LEFT: New Transaction */}
                    <div className="lg:col-span-2 bg-white rounded-[2.5rem] p-10 shadow-sm border border-gray-100 h-fit">
                        <h2 className="text-xl font-black uppercase mb-8 flex items-center gap-3">
                            <ShoppingCart className="text-orange-500" size={24} /> New Transaction
                        </h2>

                        {successMsg && (
                            <div className="mb-8 p-5 bg-green-50 text-green-700 rounded-3xl border border-green-100 flex items-center gap-3 font-black text-xs uppercase tracking-tight animate-in fade-in slide-in-from-top-2">
                                <CheckCircle size={20} /> {successMsg}
                            </div>
                        )}

                        <form onSubmit={handleProcessSale} className="space-y-8">
                            <div className="space-y-3">
                                <label className="block text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Select Product</label>
                                <select
                                    className="w-full bg-gray-50 p-5 rounded-3xl outline-none focus:ring-2 focus:ring-orange-500/20 border border-transparent focus:border-orange-500/50 font-bold text-sm appearance-none cursor-pointer"
                                    onChange={(e) => setSelectedItem(inventory.find(i => i.id === e.target.value))}
                                    value={selectedItem?.id || ''}
                                    required
                                    disabled={userBranches.length === 0}
                                >
                                    <option value="">-- Choose Item from {activeBranch || 'Branch'} --</option>
                                    {inventory.map(item => (
                                        <option key={item.id} value={item.id}>
                                            {item.product_name} (Stock: {item.current_stock})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {selectedItem && (
                                <div className="p-8 bg-gray-50 rounded-[2rem] border border-gray-100 flex justify-between items-center text-gray-900">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Unit Price</p>
                                        <p className="text-2xl font-black text-orange-600">₱{selectedItem.price_per_unit.toLocaleString()}</p>
                                    </div>
                                    <ArrowRight className="text-gray-300" size={32} />
                                    <div className="text-right space-y-1">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Bill</p>
                                        <p className="text-2xl font-black text-gray-900">₱{(selectedItem.price_per_unit * qtySold).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                                <div className="space-y-3">
                                    <label className="block text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Quantity Sold</label>
                                    <input
                                        type="number"
                                        min="1"
                                        className="w-full bg-gray-50 p-5 rounded-3xl outline-none font-black text-2xl border border-transparent focus:border-orange-200 focus:bg-white transition-all disabled:opacity-50"
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
                                        className="w-full py-6 bg-orange-600 hover:bg-orange-700 text-white font-black uppercase tracking-[0.2em] text-xs rounded-3xl shadow-2xl shadow-orange-900/30 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100"
                                    >
                                        {loading ? 'Processing...' : 'Complete Sale'}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>

                    {/* RIGHT: Stock Check */}
                    <div className="lg:col-span-1 bg-gray-900 rounded-[2.5rem] p-10 text-white shadow-2xl h-fit">
                        <h2 className="text-lg font-black uppercase tracking-widest mb-8 flex items-center gap-3">
                            <AlertTriangle className="text-orange-500" size={24} /> Stock Check
                        </h2>
                        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-3 custom-scrollbar">
                            {inventory.map(item => (
                                <div key={item.id} className="flex justify-between items-center p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors">
                                    <div className="truncate pr-4">
                                        <p className="font-bold text-sm truncate uppercase tracking-tight">{item.product_name}</p>
                                        <p className="text-[9px] text-gray-500 uppercase font-black mt-1 tracking-widest">{item.sku || 'No SKU'}</p>
                                    </div>
                                    <div className="text-right min-w-[60px]">
                                        <p className={`font-black text-base ${item.current_stock <= (item.re_order_level || 5) ? 'text-red-500 animate-pulse' : 'text-green-500'}`}>
                                            {item.current_stock}
                                        </p>
                                    </div>
                                </div>
                            ))}
                            {inventory.length === 0 && (
                                <div className="text-center py-12">
                                    <p className="text-gray-600 text-[10px] font-black uppercase tracking-[0.3em]">
                                        {activeBranch ? `No items in ${activeBranch}` : 'No branch selected'}
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