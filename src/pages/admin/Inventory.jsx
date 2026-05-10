import { useState, useEffect } from 'react';
import { supabase } from "../../supabaseClient";
import AdminSidebar from "../../components/AdminSidebar";
import {
    Plus, Package, Trash2, Pencil, X, MapPin,
    AlertTriangle, Search, Filter, Info, Banknote
} from 'lucide-react';

// --- HELPER FUNCTION: FORMAT STOCK ---
function formatStock(currentStock, conversionQty, bulkUnit, baseUnit) {
    if (!conversionQty || conversionQty <= 1) {
        return `${currentStock} ${baseUnit || 'PC'}`;
    }

    const bulks = Math.floor(currentStock / conversionQty);
    const leftover = currentStock % conversionQty;

    if (bulks > 0 && leftover > 0) return `${bulks} ${bulkUnit} & ${leftover} ${baseUnit}`;
    if (bulks > 0) return `${bulks} ${bulkUnit}`;
    return `${currentStock} ${baseUnit}`;
}

export default function Inventory() {
    const branches = ['SUBIC', 'MINIMART', 'CASTILLEJOS', 'KSK VARIETY'];
    const [activeBranch, setActiveBranch] = useState('SUBIC');

    const [items, setItems] = useState([]);
    const [activeCategory, setActiveCategory] = useState('ALL');

    const [loading, setLoading] = useState(true);
    const [adminName, setAdminName] = useState('Admin');

    const [showModal, setShowModal] = useState(false);
    const [showQuickEditModal, setShowQuickEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    const [isEditing, setIsEditing] = useState(false);
    const [currentId, setCurrentId] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    // --- INITIAL STATE ---
    const initialFormState = {
        sku: '',
        product_name: '',
        branch: 'SUBIC',
        category: '',
        base_unit: 'PC',
        price_per_base: 0,
        mid_unit: '',
        mid_conversion_qty: 0,
        price_per_mid: 0,
        bulk_unit: '',
        conversion_qty: 1,
        price_per_bulk: 0,
        cost_per_unit: 0,
        initial_quantity: 0,
        re_order_level: 5,
        current_stock: 0
    };
    const [formData, setFormData] = useState(initialFormState);

    useEffect(() => {
        async function fetchAdminName() {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('first_name, last_name')
                    .eq('id', user.id)
                    .single();

                if (profile) setAdminName(`${profile.first_name || ''} ${profile.last_name || ''} (Admin)`.trim());
            }
        }
        fetchAdminName();
    }, []);

    useEffect(() => {
        fetchInventory();
    }, [activeBranch]);

    async function fetchInventory() {
        setLoading(true);
        const { data } = await supabase
            .from('inventory')
            .select('*')
            .eq('branch', activeBranch)
            .order('category', { ascending: true })
            .order('product_name', { ascending: true });

        setItems(data || []);
        setActiveCategory('ALL');
        setLoading(false);
    }

    const uniqueCategories = ['ALL', ...Array.from(new Set(items.map(item => item.category || 'UNTAGGED'))).sort()];

    const filteredItems = items.filter(item => {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
            item.product_name?.toLowerCase().includes(query) ||
            item.sku?.toLowerCase().includes(query) ||
            item.category?.toLowerCase().includes(query);
        const matchesCategory = activeCategory === 'ALL' || (item.category || 'UNTAGGED') === activeCategory;
        return matchesSearch && matchesCategory;
    });

    const criticalCount = items.filter(item => Number(item.current_stock) <= Number(item.re_order_level)).length;

    const openAddModal = () => {
        setIsEditing(false);
        setFormData({ ...initialFormState, branch: activeBranch });
        setShowModal(true);
    };

    const openEditModal = (item) => {
        setIsEditing(true);
        setCurrentId(item.id);
        setFormData({
            ...initialFormState,
            ...item,
            base_unit: item.base_unit || item.unit || 'PC',
            price_per_base: item.price_per_base || item.price_per_unit || 0,
        });
        setShowModal(true);
    };

    // --- NEW: QUICK EDIT MODAL TRIGGER ---
    const openQuickEditModal = (item) => {
        setCurrentId(item.id);
        setFormData({
            ...initialFormState,
            ...item,
            base_unit: item.base_unit || item.unit || 'PC',
            price_per_base: item.price_per_base || item.price_per_unit || 0,
        });
        setShowQuickEditModal(true);
    };

    const triggerDelete = (id) => {
        setCurrentId(id);
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        const itemToDelete = items.find(i => i.id === currentId);
        const { error } = await supabase.from('inventory').delete().eq('id', currentId);

        if (!error) {
            if (itemToDelete) {
                await supabase.from('activity_logs').insert([{
                    staff_name: adminName || 'Admin',
                    branch: activeBranch,
                    action_type: 'INVENTORY',
                    details: `Admin deleted product: [${itemToDelete.product_name}]`,
                    created_at: new Date()
                }]);
            }
            fetchInventory();
        }
        setShowDeleteModal(false);
    };

    // --- SUBMIT FOR QUICK EDIT ONLY ---
    async function handleQuickEditSubmit(e) {
        e.preventDefault();
        try {
            const dataToSubmit = {
                cost_per_unit: formData.cost_per_unit,
                price_per_base: formData.price_per_base,
                price_per_mid: formData.price_per_mid,
                price_per_bulk: formData.price_per_bulk,
                current_stock: formData.current_stock,
                re_order_level: formData.re_order_level,
            };

            const { error: updateError } = await supabase.from('inventory').update(dataToSubmit).eq('id', currentId);
            if (updateError) throw new Error(`Update Error: ${updateError.message}`);

            await supabase.from('activity_logs').insert([{
                staff_name: adminName || 'Admin',
                branch: formData.branch || activeBranch,
                action_type: 'INVENTORY',
                details: `Admin quick-edited pricing & stock for: [${formData.product_name}]. New Stock: ${formData.current_stock}`,
                created_at: new Date()
            }]);

            setShowQuickEditModal(false);
            fetchInventory();

        } catch (error) {
            console.error("Quick Edit Failed:", error);
            alert(`🚨 Database Error: ${error.message}`);
        }
    }

    // --- FULL FORM SUBMIT ---
    async function handleSubmit(e) {
        e.preventDefault();
        try {
            let actionDetails = '';
            const dataToSubmit = { ...formData };
            if (!dataToSubmit.sku) dataToSubmit.sku = null;
            if (!dataToSubmit.mid_unit) dataToSubmit.mid_unit = null;
            if (!dataToSubmit.bulk_unit) dataToSubmit.bulk_unit = null;
            if (!dataToSubmit.mid_conversion_qty) dataToSubmit.mid_conversion_qty = 1;
            if (!dataToSubmit.conversion_qty) dataToSubmit.conversion_qty = 1;

            if (isEditing) {
                const { error: updateError } = await supabase.from('inventory').update(dataToSubmit).eq('id', currentId);
                if (updateError) throw new Error(`Update Error: ${updateError.message}`);
                actionDetails = `Admin fully updated product: [${formData.product_name}]`;
            } else {
                const { error: insertError } = await supabase.from('inventory').insert([dataToSubmit]);
                if (insertError) throw new Error(`Insert Error: ${insertError.message}`);
                actionDetails = `Admin added new product: [${formData.product_name}]`;
            }

            const { error: logError } = await supabase.from('activity_logs').insert([{
                staff_name: adminName || 'Admin',
                branch: formData.branch || activeBranch,
                action_type: 'INVENTORY',
                details: actionDetails,
                created_at: new Date()
            }]);

            if (logError) console.warn("Log error:", logError.message);

            setShowModal(false);
            fetchInventory();

        } catch (error) {
            console.error("Product Save Failed:", error);
            alert(`🚨 Database Error: ${error.message}`);
        }
    }

    return (
        <div className="flex min-h-screen bg-gray-50 text-gray-900 font-sans">
            <AdminSidebar />

            <main className="flex-1 p-4 pt-24 md:p-6 md:pt-24 xl:p-8 w-full max-w-[100vw] overflow-x-hidden">
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 md:mb-8 gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-gray-900">Inventory</h1>
                        <div className="flex items-center gap-2 md:gap-4 mt-1">
                            <p className="text-gray-500 font-bold tracking-widest text-[9px] md:text-[10px] uppercase">{activeBranch} BRANCH</p>
                            {criticalCount > 0 && (
                                <span className="bg-red-600 text-white px-2 py-0.5 md:px-3 md:py-1 rounded-lg text-[8px] md:text-[9px] font-black uppercase flex items-center gap-1">
                                    <AlertTriangle size={12} /> {criticalCount} Critical
                                </span>
                            )}
                        </div>
                    </div>
                    <button onClick={openAddModal} className="w-full md:w-auto justify-center bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-2xl font-black text-[10px] md:text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg transition-all active:scale-95">
                        <Plus size={20} /> Add Product
                    </button>
                </header>

                <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4 mb-4">
                    <div className="flex gap-1 md:gap-2 bg-gray-200/50 p-1.5 rounded-2xl overflow-x-auto custom-scrollbar flex-1 lg:flex-none">
                        {branches.map((br) => (
                            <button key={br} onClick={() => setActiveBranch(br)}
                                className={`px-4 md:px-6 py-2 md:py-2.5 rounded-xl text-[9px] md:text-[10px] font-black tracking-widest transition-all whitespace-nowrap flex-1 md:flex-none text-center ${activeBranch === br ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}>
                                {br}
                            </button>
                        ))}
                    </div>

                    <div className="relative flex-1 lg:max-w-sm">
                        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search product, SKU, or category..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-11 pr-10 py-3.5 bg-white border border-gray-200 rounded-2xl text-xs md:text-sm font-bold outline-none focus:ring-2 focus:ring-orange-500 transition-all shadow-sm placeholder:text-gray-400"
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                <X size={14} />
                            </button>
                        )}
                    </div>
                </div>

                {!loading && items.length > 0 && (
                    <div className="flex items-center gap-2 bg-white border border-gray-200 p-1.5 rounded-2xl w-full mb-6 overflow-x-auto custom-scrollbar shadow-sm">
                        <Filter size={14} className="text-orange-500 ml-3 mr-1 shrink-0" />
                        {uniqueCategories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setActiveCategory(cat)}
                                className={`px-4 py-2.5 rounded-xl text-[9px] md:text-[10px] font-black tracking-widest uppercase whitespace-nowrap transition-all ${activeCategory === cat ? 'bg-gray-900 text-white shadow-md' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'}`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                )}

                <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden w-full">
                    <div className="overflow-x-auto custom-scrollbar w-full">
                        <table className="w-full text-left border-collapse min-w-[1100px]">
                            <thead className="bg-gray-900 text-white text-[9px] md:text-[10px] uppercase tracking-[0.2em]">
                                <tr>
                                    <th className="p-4 md:p-5">SKU</th>
                                    <th className="p-4 md:p-5">Product Name</th>
                                    <th className="p-4 md:p-5 text-center">Category</th>
                                    <th className="p-4 md:p-5">Pricing Tiers</th>
                                    <th className="p-4 md:p-5 text-center bg-gray-800">Current Stock</th>
                                    <th className="p-4 md:p-5 text-center">Re-Order</th>
                                    <th className="p-4 md:p-5 text-center">Status</th>
                                    <th className="p-4 md:p-5 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-xs md:text-sm">
                                {loading ? (
                                    <tr><td colSpan="8" className="p-10 md:p-20 text-center text-gray-400 font-bold animate-pulse uppercase tracking-[0.3em] text-xs">Syncing...</td></tr>
                                ) : filteredItems.length === 0 ? (
                                    <tr><td colSpan="8" className="p-10 md:p-20 text-center text-gray-400 font-bold uppercase tracking-[0.3em] text-xs">No items found</td></tr>
                                ) : (
                                    filteredItems.map((item) => {
                                        const isCritical = Number(item.current_stock) <= Number(item.re_order_level);
                                        const hasMid = item.mid_conversion_qty > 1;
                                        const hasBulk = item.conversion_qty > 1;

                                        return (
                                            <tr key={item.id} className="hover:bg-orange-50/20 transition-colors">
                                                <td className="p-4 md:p-5 font-mono text-[10px] md:text-xs text-gray-400 font-bold">{item.sku || '---'}</td>
                                                <td className="p-4 md:p-5 font-black uppercase text-gray-800">{item.product_name}</td>
                                                <td className="p-4 md:p-5 text-center font-bold uppercase text-gray-500 text-[10px] tracking-widest">{item.category || 'UNTAGGED'}</td>

                                                {/* PRICING COLUMN */}
                                                <td className="p-4 md:p-5">
                                                    <div className="flex flex-col gap-1">
                                                        <span className="font-black text-gray-900">₱{Number(item.price_per_base).toLocaleString()} <span className="text-gray-400 font-bold text-[9px] uppercase">/ {item.base_unit || 'PC'}</span></span>
                                                        {hasMid && (
                                                            <span className="font-black text-orange-600 text-[10px]">₱{Number(item.price_per_mid).toLocaleString()} <span className="text-orange-400 font-bold text-[8px] uppercase">/ {item.mid_unit}</span></span>
                                                        )}
                                                        {hasBulk && (
                                                            <span className="font-black text-blue-600 text-[10px]">₱{Number(item.price_per_bulk).toLocaleString()} <span className="text-blue-400 font-bold text-[8px] uppercase">/ {item.bulk_unit}</span></span>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* STOCK COLUMN */}
                                                <td className={`p-4 md:p-5 text-center ${isCritical ? 'bg-red-50' : 'bg-gray-50/50'}`}>
                                                    <div className="flex flex-col items-center justify-center">
                                                        <span className={`font-black uppercase tracking-tight ${isCritical ? 'text-red-600 animate-pulse' : 'text-gray-900'}`}>
                                                            {formatStock(item.current_stock, item.conversion_qty, item.bulk_unit, item.base_unit)}
                                                        </span>
                                                        {(hasBulk || hasMid) && (
                                                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                                                                {item.current_stock} {item.base_unit} Total
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>

                                                <td className="p-4 md:p-5 text-center text-gray-400 font-bold">{item.re_order_level} {item.base_unit}</td>
                                                <td className="p-4 md:p-5 text-center">
                                                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full font-black text-[8px] md:text-[9px] uppercase tracking-wider ${isCritical ? 'bg-red-600 text-white' : 'bg-green-500 text-white'}`}>
                                                        {isCritical ? 'Critical' : 'Good'}
                                                    </span>
                                                </td>
                                                <td className="p-4 md:p-5 text-center">
                                                    <div className="flex justify-center gap-2">
                                                        {/* NEW: QUICK EDIT BUTTON */}
                                                        <button onClick={() => openQuickEditModal(item)} className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-600 hover:text-white transition-all" title="Quick Edit Prices & Stock">
                                                            <Banknote size={14} />
                                                        </button>

                                                        {/* FULL EDIT BUTTON */}
                                                        <button onClick={() => openEditModal(item)} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all" title="Full Product Edit">
                                                            <Pencil size={14} />
                                                        </button>

                                                        {/* DELETE BUTTON */}
                                                        <button onClick={() => triggerDelete(item.id)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition-all" title="Delete Product">
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>

            {/* --- NEW: QUICK EDIT MODAL --- */}
            {showQuickEditModal && (
                <div className="fixed inset-0 z-[160] flex items-center justify-center bg-gray-900/60 backdrop-blur-md p-4">
                    <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto text-gray-900 custom-scrollbar">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight flex items-center gap-2">
                                    <Banknote className="text-green-600" /> Quick Edit
                                </h2>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                                    {formData.product_name}
                                </p>
                            </div>
                            <button onClick={() => setShowQuickEditModal(false)} className="text-gray-400 hover:text-gray-900"><X size={24} /></button>
                        </div>

                        <form onSubmit={handleQuickEditSubmit} className="space-y-5">
                            {/* Prices Block */}
                            <div className="p-4 md:p-5 bg-gray-50 rounded-2xl border border-gray-200">
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-900 mb-4">Update Pricing</h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                                    <div>
                                        <label className="block text-[9px] font-black text-gray-500 uppercase mb-1 ml-1">Supplier Cost</label>
                                        <input type="number" step="0.01" className="w-full bg-white p-3 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-green-500 border border-gray-100" value={formData.cost_per_unit} onChange={(e) => setFormData({ ...formData, cost_per_unit: parseFloat(e.target.value) || 0 })} />
                                    </div>
                                    <div>
                                        <label className="block text-[9px] font-black text-gray-500 uppercase mb-1 ml-1">Base Price <span className="lowercase text-gray-400">({formData.base_unit})</span></label>
                                        <input required type="number" step="0.01" className="w-full bg-white p-3 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-green-500 border border-gray-100" value={formData.price_per_base} onChange={(e) => setFormData({ ...formData, price_per_base: parseFloat(e.target.value) || 0 })} />
                                    </div>

                                    {/* Only show if a Mid Tier is configured */}
                                    {formData.mid_conversion_qty > 1 && (
                                        <div>
                                            <label className="block text-[9px] font-black text-orange-500 uppercase mb-1 ml-1">Mid Price <span className="lowercase text-orange-300">({formData.mid_unit})</span></label>
                                            <input type="number" step="0.01" className="w-full bg-white p-3 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-orange-500 border border-orange-50" value={formData.price_per_mid} onChange={(e) => setFormData({ ...formData, price_per_mid: parseFloat(e.target.value) || 0 })} />
                                        </div>
                                    )}

                                    {/* Only show if a Bulk Tier is configured */}
                                    {formData.conversion_qty > 1 && (
                                        <div>
                                            <label className="block text-[9px] font-black text-blue-500 uppercase mb-1 ml-1">Bulk Price <span className="lowercase text-blue-300">({formData.bulk_unit})</span></label>
                                            <input type="number" step="0.01" className="w-full bg-white p-3 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500 border border-blue-50" value={formData.price_per_bulk} onChange={(e) => setFormData({ ...formData, price_per_bulk: parseFloat(e.target.value) || 0 })} />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Stock Block */}
                            <div className="p-4 md:p-5 bg-gray-50 rounded-2xl border border-gray-200">
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-900 mb-4">Update Stock Level</h3>
                                <div className="grid grid-cols-2 gap-3 md:gap-4">
                                    <div>
                                        <label className="block text-[9px] font-black text-gray-500 uppercase mb-1 ml-1">Current Quantity <span className="lowercase text-gray-400">(in {formData.base_unit})</span></label>
                                        <input type="number" className="w-full bg-white p-3 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-green-500 border border-gray-100" value={formData.current_stock} onChange={(e) => setFormData({ ...formData, current_stock: parseInt(e.target.value) || 0 })} />
                                    </div>
                                    <div>
                                        <label className="block text-[9px] font-black text-gray-500 uppercase mb-1 ml-1">Re-Order Alert <span className="lowercase text-gray-400">(in {formData.base_unit})</span></label>
                                        <input type="number" className="w-full bg-white p-3 rounded-xl text-xs font-bold text-red-500 outline-none focus:ring-2 focus:ring-green-500 border border-gray-100" value={formData.re_order_level} onChange={(e) => setFormData({ ...formData, re_order_level: parseInt(e.target.value) || 0 })} />
                                    </div>
                                </div>
                            </div>

                            <button type="submit" className="w-full p-4 md:p-5 bg-green-600 hover:bg-green-700 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl mt-6 transition-all active:scale-95 text-[10px] md:text-xs">
                                Confirm Quick Edit
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* --- ADD / FULL EDIT MODAL --- */}
            {showModal && (
                <div className="fixed inset-0 z-[160] flex items-center justify-center bg-gray-900/60 backdrop-blur-md p-4">
                    <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 w-full max-w-3xl shadow-2xl max-h-[90vh] overflow-y-auto text-gray-900 custom-scrollbar">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight flex items-center gap-2">
                                <Package className="text-orange-600" /> {isEditing ? 'Edit Product Structure' : 'New Product'}
                            </h2>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-900"><X size={24} /></button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            {/* Row 1: Identification */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                                <div>
                                    <label className="block text-[9px] md:text-[10px] font-black text-gray-400 uppercase mb-1 ml-1">SKU</label>
                                    <input className="w-full bg-gray-50 p-3.5 md:p-4 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 text-xs md:text-sm font-mono uppercase" placeholder="OPTIONAL" value={formData.sku || ''} onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })} />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-[9px] md:text-[10px] font-black text-gray-400 uppercase mb-1 ml-1">Product Name</label>
                                    <input required className="w-full bg-gray-50 p-3.5 md:p-4 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 text-xs md:text-sm font-black uppercase" placeholder="e.g., JUMBO EGGS" value={formData.product_name} onChange={(e) => setFormData({ ...formData, product_name: e.target.value.toUpperCase() })} />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                                <div>
                                    <label className="block text-[9px] md:text-[10px] font-black text-gray-400 uppercase mb-1 ml-1">Category</label>
                                    <input required className="w-full bg-gray-50 p-3.5 md:p-4 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 text-xs md:text-sm font-bold uppercase" placeholder="e.g., POULTRY" value={formData.category || ''} onChange={(e) => setFormData({ ...formData, category: e.target.value.toUpperCase() })} />
                                </div>
                                <div>
                                    <label className="block text-[9px] md:text-[10px] font-black text-gray-400 uppercase mb-1 ml-1">Supplier Cost (Total)</label>
                                    <input type="number" step="0.01" className="w-full bg-gray-50 p-3.5 md:p-4 rounded-xl text-xs md:text-sm font-bold outline-none focus:ring-2 focus:ring-orange-500" value={formData.cost_per_unit} onChange={(e) => setFormData({ ...formData, cost_per_unit: parseFloat(e.target.value) || 0 })} />
                                </div>
                            </div>

                            {/* TIER 1: BASE */}
                            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200">
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-900 mb-3 flex items-center gap-2">Tier 1: Base Unit (Required)</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[9px] font-black text-gray-500 uppercase mb-1 ml-1">Unit Name</label>
                                        <input required className="w-full bg-white p-3 rounded-xl outline-none focus:ring-2 focus:ring-gray-900 text-xs font-bold uppercase border border-gray-100" placeholder="e.g., 1PC" value={formData.base_unit || ''} onChange={(e) => setFormData({ ...formData, base_unit: e.target.value.toUpperCase() })} />
                                    </div>
                                    <div>
                                        <label className="block text-[9px] font-black text-gray-500 uppercase mb-1 ml-1">Selling Price</label>
                                        <input required type="number" step="0.01" className="w-full bg-white p-3 rounded-xl text-gray-900 font-black text-xs outline-none focus:ring-2 focus:ring-gray-900 border border-gray-100" value={formData.price_per_base} onChange={(e) => setFormData({ ...formData, price_per_base: parseFloat(e.target.value) || 0 })} />
                                    </div>
                                </div>
                            </div>

                            {/* TIER 2: MID */}
                            <div className="p-4 bg-orange-50/50 rounded-2xl border border-orange-100">
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-orange-600 mb-3 flex items-center gap-2">Tier 2: Mid Unit (Optional - e.g., "3pcs")</h3>
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-[9px] font-black text-orange-500 uppercase mb-1 ml-1">Unit Name</label>
                                        <input className="w-full bg-white p-3 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 text-xs font-bold uppercase border border-orange-50" placeholder="e.g., 3PCS" value={formData.mid_unit || ''} onChange={(e) => setFormData({ ...formData, mid_unit: e.target.value.toUpperCase() })} />
                                    </div>
                                    <div>
                                        <label className="block text-[9px] font-black text-orange-500 uppercase mb-1 ml-1">Items Inside</label>
                                        <input type="number" min="0" className="w-full bg-white p-3 rounded-xl text-orange-700 font-black text-xs outline-none focus:ring-2 focus:ring-orange-500 border border-orange-50" value={formData.mid_conversion_qty} onChange={(e) => setFormData({ ...formData, mid_conversion_qty: parseInt(e.target.value) || 0 })} />
                                    </div>
                                    <div>
                                        <label className="block text-[9px] font-black text-orange-500 uppercase mb-1 ml-1">Selling Price</label>
                                        <input type="number" step="0.01" className="w-full bg-white p-3 rounded-xl text-orange-700 font-black text-xs outline-none focus:ring-2 focus:ring-orange-500 border border-orange-50" value={formData.price_per_mid} onChange={(e) => setFormData({ ...formData, price_per_mid: parseFloat(e.target.value) || 0 })} />
                                    </div>
                                </div>
                            </div>

                            {/* TIER 3: BULK */}
                            <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-3 flex items-center gap-2">Tier 3: Bulk Unit (Optional - e.g., "Tray", "Sack")</h3>
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-[9px] font-black text-blue-500 uppercase mb-1 ml-1">Unit Name</label>
                                        <input className="w-full bg-white p-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-xs font-bold uppercase border border-blue-50" placeholder="e.g., TRAY" value={formData.bulk_unit || ''} onChange={(e) => setFormData({ ...formData, bulk_unit: e.target.value.toUpperCase() })} />
                                    </div>
                                    <div>
                                        <label className="block text-[9px] font-black text-blue-500 uppercase mb-1 ml-1">Items Inside</label>
                                        <input type="number" min="1" className="w-full bg-white p-3 rounded-xl text-blue-700 font-black text-xs outline-none focus:ring-2 focus:ring-blue-500 border border-blue-50" value={formData.conversion_qty} onChange={(e) => setFormData({ ...formData, conversion_qty: parseInt(e.target.value) || 1 })} />
                                    </div>
                                    <div>
                                        <label className="block text-[9px] font-black text-blue-500 uppercase mb-1 ml-1">Selling Price</label>
                                        <input type="number" step="0.01" className="w-full bg-white p-3 rounded-xl text-blue-700 font-black text-xs outline-none focus:ring-2 focus:ring-blue-500 border border-blue-50" value={formData.price_per_bulk} onChange={(e) => setFormData({ ...formData, price_per_bulk: parseFloat(e.target.value) || 0 })} />
                                    </div>
                                </div>
                            </div>

                            {/* Stock Levels */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
                                {!isEditing && (
                                    <div>
                                        <label className="block text-[9px] md:text-[10px] font-black text-gray-400 uppercase mb-1 ml-1">Initial Stock <span className="lowercase text-gray-300">(in {formData.base_unit || 'base'})</span></label>
                                        <input type="number" className="w-full bg-gray-50 p-3.5 md:p-4 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 text-xs md:text-sm font-bold" value={formData.initial_quantity} onChange={(e) => setFormData({ ...formData, initial_quantity: parseInt(e.target.value) || 0, current_stock: parseInt(e.target.value) || 0 })} />
                                    </div>
                                )}
                                <div>
                                    <label className="block text-[9px] md:text-[10px] font-black text-gray-400 uppercase mb-1 ml-1">Re-order Level <span className="lowercase text-gray-300">(in {formData.base_unit || 'base'})</span></label>
                                    <input type="number" className="w-full bg-gray-50 p-3.5 md:p-4 rounded-xl text-red-500 font-black text-xs md:text-sm outline-none focus:ring-2 focus:ring-red-500" value={formData.re_order_level} onChange={(e) => setFormData({ ...formData, re_order_level: parseInt(e.target.value) || 0 })} />
                                </div>
                                <div>
                                    <label className="block text-[9px] md:text-[10px] font-black text-gray-400 uppercase mb-1 ml-1">Current Stock <span className="lowercase text-gray-300">(in {formData.base_unit || 'base'})</span></label>
                                    <input type="number" className="w-full bg-gray-100 p-3.5 md:p-4 rounded-xl font-black text-xs md:text-sm outline-none focus:ring-2 focus:ring-gray-400" value={formData.current_stock} onChange={(e) => setFormData({ ...formData, current_stock: parseInt(e.target.value) || 0 })} />
                                </div>
                            </div>

                            <button type="submit" className="w-full p-4 md:p-5 bg-gray-900 hover:bg-black text-white font-black uppercase tracking-widest rounded-2xl shadow-xl mt-6 transition-all active:scale-95 text-[10px] md:text-xs">
                                {isEditing ? 'Save Full Changes' : 'Confirm Product'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}