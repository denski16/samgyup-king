import { useState, useEffect } from 'react';
import { supabase } from "../../supabaseClient";
import StaffSidebar from "../../components/StaffSidebar";
import {
    Package,
    AlertTriangle,
    Store,
    Edit2,
    X,
    CheckCircle
} from 'lucide-react';

export default function StaffInventory() {
    const [userBranches, setUserBranches] = useState([]);
    const [activeBranch, setActiveBranch] = useState('');
    const [staffName, setStaffName] = useState(''); // <-- ADDED: Tracker for who is logged in

    const [inventory, setInventory] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modal State for updating stock
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
            .eq('category', activeBranch) // 'category' holds the branch name
            .order('product_name', { ascending: true });

        setInventory(data || []);
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
            // --- NEW LOGGING BLOCK ---
            // This silently sends the action to the Admin Radar
            await supabase.from('activity_logs').insert([{
                staff_name: staffName || 'Unknown Staff',
                branch: activeBranch,
                action_type: 'INVENTORY',
                details: `Updated physical count of [${selectedItem.product_name}] from ${selectedItem.current_stock} to ${newStockCount}`
            }]);
            // -------------------------

            setSuccessMsg(`${selectedItem.product_name} updated successfully!`);
            setShowModal(false);
            fetchBranchInventory();
            setTimeout(() => setSuccessMsg(''), 3000);
        }
        setLoading(false);
    };

    return (
        <div className="flex min-h-screen bg-gray-50 text-gray-900 font-sans">
            <StaffSidebar />

            <main className="flex-1 p-8 overflow-y-auto">
                <header className="mb-8 flex justify-between items-end">
                    <div>
                        <h1 className="text-3xl font-black uppercase tracking-tight italic">
                            Branch <span className="text-orange-600">Inventory</span>
                        </h1>
                        <p className="text-gray-500 font-medium italic mt-1">
                            Monitor and update physical stock for {activeBranch || 'your branch'}.
                        </p>
                    </div>
                </header>

                {successMsg && (
                    <div className="mb-8 p-5 bg-green-50 text-green-700 rounded-2xl border border-green-100 flex items-center gap-3 font-black text-xs uppercase tracking-tight animate-in fade-in slide-in-from-top-2">
                        <CheckCircle size={20} /> {successMsg}
                    </div>
                )}

                {/* RESTRICTED Branch Selection */}
                {userBranches.length === 0 ? (
                    <div className="mb-8 p-4 bg-red-50 text-red-600 rounded-2xl border border-red-100 flex items-center gap-2 text-sm font-bold uppercase">
                        <AlertTriangle size={18} /> No branches assigned to your profile.
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

                {/* Inventory Table */}
                <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden min-w-[800px]">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-900 text-white text-[10px] uppercase tracking-[0.2em]">
                            <tr>
                                <th className="p-6">Product Item</th>
                                <th className="p-6">SKU / Code</th>
                                <th className="p-6 text-center">Current Stock</th>
                                <th className="p-6 text-center">Status</th>
                                <th className="p-6 text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-sm">
                            {loading && !inventory.length ? (
                                <tr><td colSpan="5" className="p-20 text-center text-gray-400 font-black animate-pulse uppercase tracking-widest">Loading Stock...</td></tr>
                            ) : inventory.length === 0 ? (
                                <tr><td colSpan="5" className="p-20 text-center text-gray-400 font-bold italic">No inventory found for {activeBranch}.</td></tr>
                            ) : inventory.map((item) => {
                                const isLowStock = item.current_stock <= (item.re_order_level || 5);
                                return (
                                    <tr key={item.id} className="hover:bg-orange-50/20 transition-colors group">
                                        <td className="p-6 font-black uppercase tracking-tight text-gray-900">
                                            {item.product_name}
                                        </td>
                                        <td className="p-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                            {item.sku || 'N/A'}
                                        </td>
                                        <td className="p-6 text-center">
                                            <span className={`text-xl font-black ${isLowStock ? 'text-red-500' : 'text-gray-900'}`}>
                                                {item.current_stock}
                                            </span>
                                        </td>
                                        <td className="p-6 text-center">
                                            {isLowStock ? (
                                                <span className="bg-red-50 text-red-600 px-3 py-1 rounded-md text-[9px] font-black uppercase border border-red-200 flex items-center justify-center gap-1 w-fit mx-auto animate-pulse">
                                                    <AlertTriangle size={10} /> Low Stock
                                                </span>
                                            ) : (
                                                <span className="bg-green-50 text-green-600 px-3 py-1 rounded-md text-[9px] font-black uppercase border border-green-200 w-fit mx-auto block">
                                                    Healthy
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-6 text-center">
                                            <button
                                                onClick={() => openUpdateModal(item)}
                                                className="p-3 bg-gray-50 text-gray-600 rounded-xl hover:bg-orange-600 hover:text-white transition-all mx-auto block group-hover:shadow-md"
                                                title="Update Physical Count"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </main>

            {/* --- UPDATE STOCK MODAL --- */}
            {showModal && selectedItem && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-gray-900/60 backdrop-blur-md p-4">
                    <div className="bg-white rounded-[2.5rem] p-10 w-full max-w-sm shadow-2xl">
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
                                <Package className="text-orange-500" /> Count <span className="text-orange-600">Update</span>
                            </h2>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-900"><X size={24} /></button>
                        </div>

                        <div className="mb-6 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Item</p>
                            <p className="font-black uppercase text-gray-900">{selectedItem.product_name}</p>
                            <p className="text-[10px] font-bold text-orange-600 uppercase mt-1">Branch: {activeBranch}</p>
                        </div>

                        <form onSubmit={handleUpdateStock} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-gray-400 ml-2 tracking-widest">New Physical Count</label>
                                <input
                                    required
                                    type="number"
                                    min="0"
                                    autoFocus
                                    className="w-full bg-gray-50 p-5 rounded-2xl outline-none font-black text-2xl border-2 border-transparent focus:border-orange-500 transition-all text-center"
                                    value={newStockCount}
                                    onChange={(e) => setNewStockCount(e.target.value)}
                                />
                            </div>

                            <button type="submit" disabled={loading} className="w-full p-5 bg-gray-900 hover:bg-black text-white font-black uppercase tracking-[0.2em] text-xs rounded-2xl shadow-xl transition-all active:scale-95">
                                {loading ? 'Updating...' : 'Save New Count'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}