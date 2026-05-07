import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import Sidebar from '../components/Sidebar';
import { ShoppingCart, ArrowRight, CheckCircle, AlertCircle, Search, AlertTriangle } from 'lucide-react';

export default function Sales() {
    const branches = ['SUBIC', 'MINIMART', 'CASTILLEJOS', 'KSK VARIETY'];
    const [activeBranch, setActiveBranch] = useState('SUBIC');
    const [inventory, setInventory] = useState([]);
    const [loading, setLoading] = useState(false);

    const [selectedItem, setSelectedItem] = useState(null);
    const [qtySold, setQtySold] = useState(1);
    const [successMsg, setSuccessMsg] = useState('');

    useEffect(() => {
        fetchBranchInventory();
    }, [activeBranch]);

    async function fetchBranchInventory() {
        const { data } = await supabase
            .from('inventory')
            .select('*')
            .eq('category', activeBranch)
            .order('product_name', { ascending: true });
        setInventory(data || []);
    }

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
                total_price: selectedItem.price_per_unit * qtySold
            }]);

        if (invError || saleError) {
            alert("Transaction Failed!");
        } else {
            setSuccessMsg(`Sold ${qtySold} units of ${selectedItem.product_name}`);
            setSelectedItem(null);
            setQtySold(1);
            fetchBranchInventory();
            setTimeout(() => setSuccessMsg(''), 3000);
        }
        setLoading(false);
    }

    return (
        <div className="flex min-h-screen bg-gray-50 text-gray-900">
            <Sidebar />
            <main className="flex-1 p-8">
                <header className="mb-8">
                    <h1 className="text-3xl font-black uppercase tracking-tight">Daily Sales Entry</h1>
                    <p className="text-gray-500 font-medium italic">Record sales to auto-deduct from {activeBranch} inventory.</p>
                </header>

                {/* Branch Selection */}
                <div className="flex gap-2 mb-8 bg-gray-200/50 p-1.5 rounded-2xl w-fit">
                    {branches.map((br) => (
                        <button key={br} onClick={() => setActiveBranch(br)}
                            className={`px-6 py-2.5 rounded-xl text-[10px] font-black tracking-widest transition-all ${activeBranch === br ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500'}`}>
                            {br}
                        </button>
                    ))}
                </div>

                {/* --- GRID LAYOUT UPDATE --- */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* LEFT: New Transaction (WIDER: 2/3) */}
                    <div className="lg:col-span-2 bg-white rounded-[2.5rem] p-10 shadow-sm border border-gray-100 h-fit">
                        <h2 className="text-xl font-black uppercase mb-6 flex items-center gap-2">
                            <ShoppingCart className="text-orange-500" /> New Transaction
                        </h2>

                        {successMsg && (
                            <div className="mb-6 p-4 bg-green-50 text-green-700 rounded-2xl border border-green-100 flex items-center gap-2 font-bold text-sm animate-bounce">
                                <CheckCircle size={18} /> {successMsg}
                            </div>
                        )}

                        <form onSubmit={handleProcessSale} className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-black uppercase text-gray-400 mb-2 ml-1">Select Product</label>
                                <select
                                    className="w-full bg-gray-50 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 font-bold"
                                    onChange={(e) => setSelectedItem(inventory.find(i => i.id === e.target.value))}
                                    value={selectedItem?.id || ''}
                                    required
                                >
                                    <option value="">-- Choose Item from {activeBranch} --</option>
                                    {inventory.map(item => (
                                        <option key={item.id} value={item.id}>
                                            {item.product_name} (Stock: {item.current_stock})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {selectedItem && (
                                <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100 flex justify-between items-center text-gray-900">
                                    <div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase">Unit Price</p>
                                        <p className="text-xl font-black text-orange-600">₱{selectedItem.price_per_unit}</p>
                                    </div>
                                    <ArrowRight className="text-gray-300" size={28} />
                                    <div className="text-right">
                                        <p className="text-[10px] font-black text-gray-400 uppercase">Total Transaction</p>
                                        <p className="text-xl font-black text-gray-900">₱{(selectedItem.price_per_unit * qtySold).toFixed(2)}</p>
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-gray-400 mb-2 ml-1">Quantity Sold</label>
                                    <input
                                        type="number"
                                        min="1"
                                        className="w-full bg-gray-50 p-4 rounded-2xl outline-none font-black text-xl border border-transparent focus:border-orange-200"
                                        value={qtySold}
                                        onChange={(e) => setQtySold(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="flex items-end">
                                    <button
                                        type="submit"
                                        disabled={loading || !selectedItem}
                                        className="w-full p-4 bg-orange-600 hover:bg-orange-700 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-orange-900/20 transition-all active:scale-95 disabled:opacity-50"
                                    >
                                        {loading ? 'Processing...' : 'Complete Sale'}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>

                    {/* RIGHT: Stock Check (SLIMMER: 1/3) */}
                    <div className="lg:col-span-1 bg-gray-900 rounded-[2.5rem] p-8 text-white shadow-2xl h-fit">
                        <h2 className="text-lg font-black uppercase mb-6 flex items-center gap-2">
                            <AlertTriangle className="text-orange-500" size={20} /> Stock Check
                        </h2>
                        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                            {inventory.map(item => (
                                <div key={item.id} className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/10">
                                    <div className="truncate pr-2">
                                        <p className="font-bold text-xs truncate">{item.product_name}</p>
                                        <p className="text-[9px] text-gray-500 uppercase font-black">{item.sku}</p>
                                    </div>
                                    <div className="text-right min-w-[50px]">
                                        <p className={`font-black text-sm ${item.current_stock <= item.re_order_level ? 'text-red-500 animate-pulse' : 'text-green-500'}`}>
                                            {item.current_stock}
                                        </p>
                                    </div>
                                </div>
                            ))}
                            {inventory.length === 0 && (
                                <p className="text-center text-gray-600 text-xs py-4 font-bold uppercase tracking-widest">No Items Found</p>
                            )}
                        </div>
                    </div>

                </div>
            </main>
        </div>
    );
}