import { useState, useEffect } from 'react';
import { supabase } from "../../supabaseClient";
import AdminSidebar from "../../components/AdminSidebar";
import {
    ShoppingCart,
    ArrowRight,
    CheckCircle,
    AlertTriangle,
    RefreshCcw,
    Search,
    X
} from 'lucide-react';

export default function Sales() {
    const branches = ['SUBIC', 'MINIMART', 'CASTILLEJOS', 'KSK VARIETY'];
    const [activeBranch, setActiveBranch] = useState('SUBIC');
    const [adminName, setAdminName] = useState('Admin');

    const [inventory, setInventory] = useState([]);
    const [loading, setLoading] = useState(false);
    const [fetchingInventory, setFetchingInventory] = useState(false);

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedItem, setSelectedItem] = useState(null);
    const [qtySold, setQtySold] = useState(1);
    const [successMsg, setSuccessMsg] = useState('');

    useEffect(() => {
        async function fetchAdminName() {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('first_name, last_name')
                    .eq('id', user.id)
                    .single();

                if (profile) {
                    setAdminName(`${profile.first_name || ''} ${profile.last_name || ''} (Admin)`.trim());
                }
            }
        }
        fetchAdminName();
    }, []);

    useEffect(() => {
        fetchBranchInventory();
    }, [activeBranch]);

    async function fetchBranchInventory() {
        setFetchingInventory(true);
        const { data } = await supabase
            .from('inventory')
            .select('*')
            .eq('category', activeBranch)
            .order('product_name', { ascending: true });

        setInventory(data || []);

        // Reset selections when switching branches
        setSelectedItem(null);
        setSearchQuery('');
        setQtySold(1);

        setFetchingInventory(false);
    }

    // Filter logic for the search bar
    const filteredInventory = inventory.filter(item => {
        const query = searchQuery.toLowerCase();
        return (
            item.product_name?.toLowerCase().includes(query) ||
            item.sku?.toLowerCase().includes(query)
        );
    });

    async function handleProcessSale(e) {
        e.preventDefault();
        if (!selectedItem || qtySold <= 0) return;

        setLoading(true);
        const newStock = Number(selectedItem.current_stock) - Number(qtySold);

        if (newStock < 0) {
            alert("Error: Not enough stock available!");
            setLoading(false);
            return;
        }

        // 1. Update Inventory
        const { error: invError } = await supabase
            .from('inventory')
            .update({ current_stock: newStock })
            .eq('id', selectedItem.id);

        // 2. Insert Sale
        const { error: saleError } = await supabase
            .from('sales')
            .insert([{
                inventory_id: selectedItem.id,
                product_name: selectedItem.product_name,
                branch: activeBranch,
                quantity_sold: qtySold,
                total_price: selectedItem.price_per_unit * qtySold,
                sale_date: new Date()
            }]);

        if (invError || saleError) {
            alert("Transaction Failed!");
        } else {
            // 3. Log Activity
            await supabase.from('activity_logs').insert([{
                staff_name: adminName || 'Admin',
                branch: activeBranch || 'Unknown Branch',
                action_type: 'SALE',
                details: `Admin processed sale: ${qtySold}x ${selectedItem.product_name} (Total: ₱${(selectedItem.price_per_unit * qtySold).toLocaleString(undefined, { minimumFractionDigits: 2 })})`,
                created_at: new Date()
            }]);

            setSuccessMsg(`Sold ${qtySold} units of ${selectedItem.product_name}`);
            setSelectedItem(null);
            setSearchQuery('');
            setQtySold(1);
            fetchBranchInventory();
            setTimeout(() => setSuccessMsg(''), 3000);
        }
        setLoading(false);
    }

    return (
        <div className="flex min-h-screen bg-gray-50 text-gray-900 font-sans">
            <AdminSidebar />

            <main className="flex-1 p-4 pt-20 md:p-8 overflow-y-auto w-full max-w-[100vw] overflow-x-hidden">
                <header className="mb-6 md:mb-10">
                    <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-gray-900">SALES</h1>
                    <p className="text-sm md:text-base text-gray-500 font-medium italic mt-1">Record sales to auto-deduct from {activeBranch} inventory.</p>
                </header>

                {/* Branch Selection Tabs */}
                <div className="flex gap-1 md:gap-2 mb-8 bg-gray-200/50 p-1.5 rounded-2xl w-full md:w-fit overflow-x-auto custom-scrollbar">
                    {branches.map((br) => (
                        <button key={br} onClick={() => setActiveBranch(br)}
                            className={`px-4 md:px-6 py-2.5 md:py-3 rounded-xl text-[9px] md:text-[10px] font-black tracking-[0.2em] transition-all whitespace-nowrap flex-1 md:flex-none ${activeBranch === br ? 'bg-white text-orange-600 shadow-md' : 'text-gray-500 hover:text-gray-900'}`}>
                            {br}
                        </button>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
                    {/* LEFT: New Transaction Form */}
                    <div className="lg:col-span-2 bg-white rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-10 shadow-sm border border-gray-100 h-fit">
                        <h2 className="text-lg md:text-xl font-black uppercase mb-6 md:mb-8 flex items-center gap-3 text-gray-900">
                            <ShoppingCart className="text-orange-500" size={24} /> New Transaction
                        </h2>

                        {successMsg && (
                            <div className="mb-6 md:mb-8 p-4 md:p-5 bg-green-50 text-green-700 rounded-2xl md:rounded-3xl border border-green-100 flex items-center gap-3 font-black text-[10px] md:text-xs uppercase tracking-tight animate-in fade-in slide-in-from-top-2">
                                <CheckCircle size={20} /> {successMsg}
                            </div>
                        )}

                        <form onSubmit={handleProcessSale} className="space-y-6 md:space-y-8">

                            {/* --- NEW SEARCHABLE PRODUCT SELECTOR --- */}
                            <div className="space-y-3">
                                <label className="block text-[9px] md:text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Search & Select Product</label>

                                <div className="relative">
                                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder={`Search items in ${activeBranch}...`}
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full bg-gray-50 pl-12 pr-10 py-4 md:py-5 rounded-2xl md:rounded-3xl outline-none focus:ring-2 focus:ring-orange-500/20 border border-transparent focus:border-orange-500/50 font-bold text-xs md:text-sm transition-all"
                                    />
                                    {searchQuery && (
                                        <button type="button" onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                            <X size={16} />
                                        </button>
                                    )}
                                </div>

                                <div className="max-h-48 md:max-h-60 overflow-y-auto custom-scrollbar pr-2 space-y-2 mt-2">
                                    {filteredInventory.length === 0 ? (
                                        <div className="p-4 text-center text-[10px] font-black uppercase text-gray-400 tracking-widest bg-gray-50 rounded-2xl">
                                            No products found matching "{searchQuery}"
                                        </div>
                                    ) : (
                                        filteredInventory.map(item => (
                                            <div
                                                key={item.id}
                                                onClick={() => setSelectedItem(item)}
                                                className={`p-4 rounded-xl md:rounded-2xl cursor-pointer border-2 transition-all flex justify-between items-center ${selectedItem?.id === item.id ? 'border-orange-500 bg-orange-50 shadow-sm' : 'border-transparent bg-gray-50 hover:border-orange-200'}`}
                                            >
                                                <div className="min-w-0 pr-2">
                                                    <p className="font-black text-xs md:text-sm text-gray-900 uppercase truncate">{item.product_name}</p>
                                                    <p className="text-[9px] text-gray-400 font-bold tracking-widest mt-0.5">{item.sku || 'NO SKU'}</p>
                                                </div>
                                                <div className="text-right flex-shrink-0">
                                                    <p className="text-sm md:text-base text-orange-600 font-black">₱{item.price_per_unit}</p>
                                                    <p className="text-[9px] font-bold text-gray-400 tracking-widest uppercase">Stock: <span className={item.current_stock <= (item.re_order_level || 5) ? 'text-red-500' : 'text-gray-600'}>{item.current_stock}</span></p>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                            {/* --- END SEARCHABLE PRODUCT SELECTOR --- */}

                            {selectedItem && (
                                <div className="p-6 md:p-8 bg-gray-900 rounded-[1.5rem] md:rounded-[2rem] border border-gray-800 flex justify-between items-center text-white shadow-xl">
                                    <div className="space-y-1 min-w-0 pr-2">
                                        <p className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest truncate">{selectedItem.product_name}</p>
                                        <p className="text-xl md:text-2xl font-black text-orange-500">₱{selectedItem.price_per_unit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                                    </div>
                                    <ArrowRight className="text-gray-600 mx-2 flex-shrink-0" size={24} />
                                    <div className="text-right space-y-1 flex-shrink-0">
                                        <p className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Bill</p>
                                        <p className="text-xl md:text-2xl font-black text-white">₱{(selectedItem.price_per_unit * qtySold).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 pt-4">
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
                                        disabled={loading || !selectedItem}
                                        className="w-full py-4 md:py-6 bg-orange-600 hover:bg-orange-700 text-white font-black uppercase tracking-[0.2em] text-[10px] md:text-xs rounded-2xl md:rounded-3xl shadow-2xl shadow-orange-900/30 transition-all active:scale-95 disabled:opacity-50"
                                    >
                                        {loading ? 'Processing...' : 'Complete Sale'}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>

                    {/* RIGHT: Stock Check Sidebar */}
                    <div className="lg:col-span-1 bg-gray-900 rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-10 text-white shadow-2xl h-fit w-full">
                        <div className="flex justify-between items-center mb-6 md:mb-8">
                            <h2 className="text-base md:text-lg font-black uppercase tracking-widest flex items-center gap-3">
                                <AlertTriangle className="text-orange-500" size={24} /> Stock Check
                            </h2>
                            <button onClick={fetchBranchInventory} className="text-gray-500 hover:text-white transition-colors">
                                <RefreshCcw size={16} className={fetchingInventory ? 'animate-spin' : ''} />
                            </button>
                        </div>

                        <div className="space-y-3 md:space-y-4 max-h-[400px] md:max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                            {inventory.map(item => (
                                <div key={item.id} className="flex justify-between items-center p-3 md:p-4 rounded-xl md:rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors">
                                    <div className="truncate pr-3 min-w-0">
                                        <p className="font-bold text-xs md:text-sm truncate uppercase tracking-tight">{item.product_name}</p>
                                        <p className="text-[8px] md:text-[9px] text-gray-500 uppercase font-black mt-1 tracking-widest truncate">{item.sku}</p>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <p className={`font-black text-sm md:text-base ${item.current_stock <= (item.re_order_level || 5) ? 'text-red-500 animate-pulse' : 'text-green-500'}`}>
                                            {item.current_stock}
                                        </p>
                                    </div>
                                </div>
                            ))}
                            {inventory.length === 0 && (
                                <div className="text-center py-10 text-gray-600 font-black uppercase text-[10px] tracking-widest">
                                    No items found
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}