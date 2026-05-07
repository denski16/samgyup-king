import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import Sidebar from '../components/Sidebar';
import { Plus, Package, AlertTriangle, Trash2, Pencil, X } from 'lucide-react';

export default function Inventory() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentId, setCurrentId] = useState(null);

    const initialFormState = {
        sku: '',
        product_name: '',
        cost_per_unit: 0.00,
        price_per_unit: 0.00,
        initial_quantity: 0,
        re_order_level: 5,
        current_stock: 0
    };

    const [formData, setFormData] = useState(initialFormState);

    useEffect(() => {
        fetchInventory();
    }, []);

    async function fetchInventory() {
        setLoading(true);
        const { data, error } = await supabase
            .from('inventory')
            .select('*')
            .order('product_name', { ascending: true });

        if (error) console.error('Error fetching inventory:', error);
        else setItems(data);
        setLoading(false);
    }

    // Opens modal for adding new item
    const openAddModal = () => {
        setIsEditing(false);
        setFormData(initialFormState);
        setShowModal(true);
    };

    // Opens modal with existing data for editing
    const openEditModal = (item) => {
        setIsEditing(true);
        setCurrentId(item.id);
        setFormData({
            sku: item.sku,
            product_name: item.product_name,
            cost_per_unit: item.cost_per_unit,
            price_per_unit: item.price_per_unit,
            initial_quantity: item.initial_quantity,
            re_order_level: item.re_order_level,
            current_stock: item.current_stock
        });
        setShowModal(true);
    };

    async function handleSubmit(e) {
        e.preventDefault();

        if (isEditing) {
            // UPDATE existing item
            const { error } = await supabase
                .from('inventory')
                .update(formData)
                .eq('id', currentId);

            if (error) alert(error.message);
            else finishTransaction();
        } else {
            // INSERT new item
            const { error } = await supabase
                .from('inventory')
                .insert([formData]);

            if (error) alert(error.message);
            else finishTransaction();
        }
    }

    const finishTransaction = () => {
        setShowModal(false);
        fetchInventory();
    };

    async function deleteItem(id) {
        if (confirm('Are you completely sure you want to delete this product?')) {
            await supabase.from('inventory').delete().eq('id', id);
            fetchInventory();
        }
    }

    return (
        <div className="flex min-h-screen bg-gray-50 font-sans text-gray-900">
            <Sidebar />

            <main className="flex-1 p-8 overflow-x-auto">
                <header className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-black tracking-tight uppercase">Inventory Stock</h1>
                        <p className="text-gray-500">Update stock levels and manage pricing.</p>
                    </div>
                    <button
                        onClick={openAddModal}
                        className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-orange-900/20 active:scale-95"
                    >
                        <Plus size={20} /> Add Product
                    </button>
                </header>

                {/* --- TABLE --- */}
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden min-w-[1000px]">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-900 text-white text-[10px] uppercase tracking-[0.2em]">
                            <tr>
                                <th className="p-5">SKU</th>
                                <th className="p-5">Product Name</th>
                                <th className="p-5">Cost / Unit</th>
                                <th className="p-5">Price / Unit</th>
                                <th className="p-5 text-center">Initial</th>
                                <th className="p-5 text-center">Re-Order</th>
                                <th className="p-5 text-center bg-gray-800">Current Stock</th>
                                <th className="p-5 text-center">Status</th>
                                <th className="p-5 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-sm">
                            {loading ? (
                                <tr><td colSpan="9" className="p-20 text-center text-gray-400 font-bold uppercase tracking-widest animate-pulse">Synchronizing...</td></tr>
                            ) : (
                                items.map((item) => (
                                    <tr key={item.id} className="hover:bg-orange-50/30 transition-colors group">
                                        <td className="p-5 font-mono text-xs text-gray-400 font-bold">{item.sku}</td>
                                        <td className="p-5 font-bold text-gray-800">{item.product_name}</td>
                                        <td className="p-5 font-medium text-gray-600">₱{Number(item.cost_per_unit).toFixed(2)}</td>
                                        <td className="p-5 font-black text-orange-600">₱{Number(item.price_per_unit).toFixed(2)}</td>
                                        <td className="p-5 text-center text-gray-400">{item.initial_quantity}</td>
                                        <td className="p-5 text-center text-red-500 font-bold">{item.re_order_level}</td>
                                        <td className="p-5 text-center font-mono font-black text-gray-900 bg-gray-50/50">{item.current_stock}</td>
                                        <td className="p-5 text-center">
                                            {Number(item.current_stock) <= Number(item.re_order_level) ? (
                                                <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 px-3 py-1 rounded-full font-black text-[10px] uppercase border border-red-200">
                                                    Low Stock
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-3 py-1 rounded-full font-black text-[10px] uppercase border border-green-200">
                                                    Healthy
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-5 text-center">
                                            <div className="flex justify-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => openEditModal(item)}
                                                    className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all"
                                                >
                                                    <Pencil size={16} />
                                                </button>
                                                <button
                                                    onClick={() => deleteItem(item.id)}
                                                    className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition-all"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </main>

            {/* --- MODAL (Handles Add & Edit) --- */}
            {showModal && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-gray-900/60 backdrop-blur-md p-4">
                    <div className="bg-white rounded-[2rem] p-8 w-full max-w-lg shadow-2xl overflow-hidden">
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-2xl font-black uppercase tracking-tight flex items-center gap-2">
                                <Package className="text-orange-600" /> {isEditing ? 'Update Product' : 'Catalog New Product'}
                            </h2>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-900 transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="grid grid-cols-3 gap-4">
                                <div className="col-span-1">
                                    <label className="block text-[10px] font-black uppercase text-gray-400 mb-2">SKU Code</label>
                                    <input
                                        required
                                        className="w-full bg-gray-50 border-none p-4 rounded-2xl focus:ring-2 focus:ring-orange-500 font-mono text-sm outline-none"
                                        value={formData.sku}
                                        onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-[10px] font-black uppercase text-gray-400 mb-2">Product Name</label>
                                    <input
                                        required
                                        className="w-full bg-gray-50 border-none p-4 rounded-2xl focus:ring-2 focus:ring-orange-500 text-sm font-bold outline-none"
                                        value={formData.product_name}
                                        onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-gray-400 mb-2">Cost (₱)</label>
                                    <input
                                        type="number" step="0.01" required
                                        className="w-full bg-gray-50 border-none p-4 rounded-2xl focus:ring-2 focus:ring-orange-500 text-sm outline-none"
                                        value={formData.cost_per_unit}
                                        onChange={(e) => setFormData({ ...formData, cost_per_unit: parseFloat(e.target.value) || 0 })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-gray-400 mb-2">Price (₱)</label>
                                    <input
                                        type="number" step="0.01" required
                                        className="w-full bg-gray-50 border-none p-4 rounded-2xl focus:ring-2 focus:ring-orange-500 text-sm outline-none font-bold text-orange-600"
                                        value={formData.price_per_unit}
                                        onChange={(e) => setFormData({ ...formData, price_per_unit: parseFloat(e.target.value) || 0 })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-gray-400 mb-2">Initial</label>
                                    <input
                                        type="number" required
                                        className="w-full bg-gray-50 border-none p-4 rounded-2xl focus:ring-2 focus:ring-orange-500 text-sm outline-none"
                                        value={formData.initial_quantity}
                                        onChange={(e) => setFormData({ ...formData, initial_quantity: parseInt(e.target.value) || 0 })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-gray-400 mb-2">Re-Order</label>
                                    <input
                                        type="number" required
                                        className="w-full bg-gray-50 border-none p-4 rounded-2xl focus:ring-2 focus:ring-orange-500 text-sm outline-none font-bold text-red-500"
                                        value={formData.re_order_level}
                                        onChange={(e) => setFormData({ ...formData, re_order_level: parseInt(e.target.value) || 0 })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-gray-400 mb-2">Stock</label>
                                    <input
                                        type="number" required
                                        className="w-full bg-gray-900 text-white border-none p-4 rounded-2xl focus:ring-2 focus:ring-orange-500 text-sm font-black outline-none"
                                        value={formData.current_stock}
                                        onChange={(e) => setFormData({ ...formData, current_stock: parseInt(e.target.value) || 0 })}
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="w-full p-5 bg-orange-600 hover:bg-orange-700 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-orange-900/20 transition-all active:scale-95 mt-4"
                            >
                                {isEditing ? 'Save Changes' : 'Commit Entry'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}