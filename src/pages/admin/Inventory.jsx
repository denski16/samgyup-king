import { useState, useEffect } from 'react';
import { supabase } from "../../supabaseClient";
import AdminSidebar from "../../components/AdminSidebar";
import {
    Plus, Package, Trash2, Pencil, X, MapPin,
    AlertTriangle, Search, Filter
} from 'lucide-react';

export default function Inventory() {
    // Branches for the tabs
    const branches = ['SUBIC', 'MINIMART', 'CASTILLEJOS', 'KSK VARIETY'];
    const [activeBranch, setActiveBranch] = useState('SUBIC');

    const [items, setItems] = useState([]);

    // --- NEW: Category Filter State ---
    const [activeCategory, setActiveCategory] = useState('ALL');

    const [loading, setLoading] = useState(true);
    const [adminName, setAdminName] = useState('Admin');

    const [showModal, setShowModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    const [isEditing, setIsEditing] = useState(false);
    const [currentId, setCurrentId] = useState(null);

    const [searchQuery, setSearchQuery] = useState('');

    // Updated initial state with branch, category, and unit
    const initialFormState = {
        sku: '',
        product_name: '',
        branch: 'SUBIC',
        category: '',
        unit: '',
        cost_per_unit: 0,
        price_per_unit: 0,
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

                if (profile) {
                    setAdminName(`${profile.first_name || ''} ${profile.last_name || ''} (Admin)`.trim());
                }
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
            .eq('branch', activeBranch) // Filter by the new branch column
            .order('category', { ascending: true }) // Group by category
            .order('product_name', { ascending: true });

        setItems(data || []);
        setActiveCategory('ALL'); // Reset category when switching branches
        setLoading(false);
    }

    // --- DYNAMIC CATEGORIES LIST ---
    const uniqueCategories = ['ALL', ...Array.from(new Set(items.map(item => item.category || 'UNTAGGED'))).sort()];

    // --- FILTER LOGIC ---
    const filteredItems = items.filter(item => {
        // 1. Search filter
        const query = searchQuery.toLowerCase();
        const matchesSearch =
            item.product_name?.toLowerCase().includes(query) ||
            item.sku?.toLowerCase().includes(query) ||
            item.category?.toLowerCase().includes(query);

        // 2. Category filter
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
        setFormData({ ...item });
        setShowModal(true);
    };

    const triggerDelete = (id) => {
        setCurrentId(id);
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        const itemToDelete = items.find(i => i.id === currentId);
        const { error } = await supabase.from('inventory').delete().eq('id', currentId);

        if (error) {
            alert("Error deleting item: " + error.message);
        } else {
            if (itemToDelete) {
                await supabase.from('activity_logs').insert([{
                    staff_name: adminName || 'Admin',
                    branch: activeBranch,
                    action_type: 'INVENTORY',
                    details: `Admin deleted product: [${itemToDelete.product_name}] (SKU: ${itemToDelete.sku || 'N/A'})`,
                    created_at: new Date()
                }]);
            }
            fetchInventory();
        }
        setShowDeleteModal(false);
    };

    async function handleSubmit(e) {
        e.preventDefault();
        let actionDetails = '';

        if (isEditing) {
            const { error } = await supabase.from('inventory').update(formData).eq('id', currentId);
            if (error) {
                alert("Error updating item: " + error.message);
                return;
            }
            actionDetails = `Admin updated product: [${formData.product_name}]. New Stock: ${formData.current_stock}`;
        } else {
            const { error } = await supabase.from('inventory').insert([formData]);
            if (error) {
                alert("Error adding item: " + error.message);
                return;
            }
            actionDetails = `Admin added new product: [${formData.product_name}] with initial stock of ${formData.current_stock}`;
        }

        await supabase.from('activity_logs').insert([{
            staff_name: adminName || 'Admin',
            branch: formData.branch || activeBranch,
            action_type: 'INVENTORY',
            details: actionDetails,
            created_at: new Date()
        }]);

        setShowModal(false);
        fetchInventory();
    }

    return (
        <div className="flex min-h-screen bg-gray-50 text-gray-900 font-sans">
            <AdminSidebar />

            {/* RESPONSIVE UPGRADE: Keeps pt-24 until xl: breakpoint where sidebar docks */}
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

                {/* --- FILTERS ROW: Branches + Search --- */}
                <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4 mb-4">
                    {/* BRANCH TABS */}
                    <div className="flex gap-1 md:gap-2 bg-gray-200/50 p-1.5 rounded-2xl overflow-x-auto custom-scrollbar flex-1 lg:flex-none">
                        {branches.map((br) => (
                            <button key={br} onClick={() => setActiveBranch(br)}
                                className={`px-4 md:px-6 py-2 md:py-2.5 rounded-xl text-[9px] md:text-[10px] font-black tracking-widest transition-all whitespace-nowrap flex-1 md:flex-none text-center ${activeBranch === br ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}>
                                {br}
                            </button>
                        ))}
                    </div>

                    {/* SEARCH INPUT */}
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

                {/* --- NEW: CATEGORY TABS --- */}
                {!loading && items.length > 0 && (
                    <div className="flex items-center gap-2 bg-white border border-gray-200 p-1.5 rounded-2xl w-full mb-6 overflow-x-auto custom-scrollbar shadow-sm">
                        <Filter size={14} className="text-orange-500 ml-3 mr-1 shrink-0" />
                        {uniqueCategories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setActiveCategory(cat)}
                                className={`px-4 py-2.5 rounded-xl text-[9px] md:text-[10px] font-black tracking-widest uppercase whitespace-nowrap transition-all ${activeCategory === cat
                                    ? 'bg-gray-900 text-white shadow-md'
                                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                                    }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                )}

                {/* --- TABLE --- */}
                <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden w-full">
                    <div className="overflow-x-auto custom-scrollbar w-full">
                        <table className="w-full text-left border-collapse min-w-[1100px]">
                            <thead className="bg-gray-900 text-white text-[9px] md:text-[10px] uppercase tracking-[0.2em]">
                                <tr>
                                    <th className="p-4 md:p-5">SKU</th>
                                    <th className="p-4 md:p-5">Product Name</th>
                                    <th className="p-4 md:p-5 text-center">Category</th>
                                    <th className="p-4 md:p-5 text-center">Unit</th>
                                    <th className="p-4 md:p-5">Cost</th>
                                    <th className="p-4 md:p-5">Price</th>
                                    <th className="p-4 md:p-5 text-center bg-gray-800">Current Stock</th>
                                    <th className="p-4 md:p-5 text-center">Re-Order</th>
                                    <th className="p-4 md:p-5 text-center">Status</th>
                                    <th className="p-4 md:p-5 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-xs md:text-sm">
                                {loading ? (
                                    <tr><td colSpan="10" className="p-10 md:p-20 text-center text-gray-400 font-bold animate-pulse uppercase tracking-[0.3em] text-xs">Syncing...</td></tr>
                                ) : filteredItems.length === 0 ? (
                                    <tr><td colSpan="10" className="p-10 md:p-20 text-center text-gray-400 font-bold uppercase tracking-[0.3em] text-xs">No items found</td></tr>
                                ) : (
                                    filteredItems.map((item) => {
                                        const isCritical = Number(item.current_stock) <= Number(item.re_order_level);
                                        return (
                                            <tr key={item.id} className="hover:bg-orange-50/20 transition-colors">
                                                <td className="p-4 md:p-5 font-mono text-[10px] md:text-xs text-gray-400 font-bold">{item.sku || '---'}</td>
                                                <td className="p-4 md:p-5 font-black uppercase text-gray-800">{item.product_name}</td>
                                                <td className="p-4 md:p-5 text-center font-bold uppercase text-gray-500 text-[10px] tracking-widest">{item.category || 'UNTAGGED'}</td>
                                                <td className="p-4 md:p-5 text-center font-bold uppercase text-gray-500 text-[10px] tracking-widest">{item.unit || '-'}</td>
                                                <td className="p-4 md:p-5 text-gray-600 font-bold">₱{Number(item.cost_per_unit).toLocaleString()}</td>
                                                <td className="p-4 md:p-5 font-black text-orange-600">₱{Number(item.price_per_unit).toLocaleString()}</td>
                                                <td className={`p-4 md:p-5 text-center font-black ${isCritical ? 'bg-red-50 text-red-600 animate-pulse' : 'bg-gray-50/50'}`}>{item.current_stock}</td>
                                                <td className="p-4 md:p-5 text-center text-gray-400 font-bold">{item.re_order_level}</td>
                                                <td className="p-4 md:p-5 text-center">
                                                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full font-black text-[8px] md:text-[9px] uppercase tracking-wider ${isCritical ? 'bg-red-600 text-white' : 'bg-green-500 text-white'}`}>
                                                        {isCritical ? 'Critical' : 'Good'}
                                                    </span>
                                                </td>
                                                <td className="p-4 md:p-5 text-center">
                                                    <div className="flex justify-center gap-2">
                                                        <button onClick={() => openEditModal(item)} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all">
                                                            <Pencil size={14} />
                                                        </button>
                                                        <button onClick={() => triggerDelete(item.id)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition-all">
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

            {/* --- ADD / EDIT MODAL --- */}
            {showModal && (
                <div className="fixed inset-0 z-[160] flex items-center justify-center bg-gray-900/60 backdrop-blur-md p-4">
                    <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-10 w-full max-w-xl shadow-2xl max-h-[90vh] overflow-y-auto text-gray-900 custom-scrollbar">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight flex items-center gap-2">
                                <Package className="text-orange-600" /> {isEditing ? 'Edit Item' : 'New Stock'}
                            </h2>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-900"><X size={24} /></button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="p-3 md:p-4 bg-orange-50 rounded-2xl border border-orange-100 mb-2 flex justify-between items-center">
                                <div>
                                    <p className="text-[9px] md:text-[10px] font-black text-orange-400 uppercase mb-1">Assigned Branch</p>
                                    <p className="text-xs md:text-sm font-bold text-orange-700 uppercase">{formData.branch}</p>
                                </div>
                                <MapPin className="text-orange-300" size={24} />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
                                <div className="sm:col-span-1">
                                    <label className="block text-[9px] md:text-[10px] font-black text-gray-400 uppercase mb-1 ml-1">SKU</label>
                                    <input className="w-full bg-gray-50 p-3 md:p-4 rounded-xl md:rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 text-xs md:text-sm font-mono uppercase" placeholder="OPTIONAL" value={formData.sku || ''} onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })} />
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="block text-[9px] md:text-[10px] font-black text-gray-400 uppercase mb-1 ml-1">Product Name</label>
                                    <input required className="w-full bg-gray-50 p-3 md:p-4 rounded-xl md:rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 text-xs md:text-sm font-black uppercase" placeholder="e.g., MEGA SARDINES GREEN" value={formData.product_name} onChange={(e) => setFormData({ ...formData, product_name: e.target.value.toUpperCase() })} />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                                <div>
                                    <label className="block text-[9px] md:text-[10px] font-black text-gray-400 uppercase mb-1 ml-1">Category</label>
                                    <input required className="w-full bg-gray-50 p-3 md:p-4 rounded-xl md:rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 text-xs md:text-sm font-bold uppercase" placeholder="e.g., CANNED GOODS" value={formData.category || ''} onChange={(e) => setFormData({ ...formData, category: e.target.value.toUpperCase() })} />
                                </div>
                                <div>
                                    <label className="block text-[9px] md:text-[10px] font-black text-gray-400 uppercase mb-1 ml-1">Unit</label>
                                    <input required className="w-full bg-gray-50 p-3 md:p-4 rounded-xl md:rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 text-xs md:text-sm font-bold uppercase" placeholder="e.g., PC, KILO, SACK" value={formData.unit || ''} onChange={(e) => setFormData({ ...formData, unit: e.target.value.toUpperCase() })} />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 border-t border-gray-100 pt-4 mt-2">
                                <div>
                                    <label className="block text-[9px] md:text-[10px] font-black text-gray-400 uppercase mb-1 ml-1">Supplier Cost</label>
                                    <input type="number" step="0.01" className="w-full bg-gray-50 p-3 md:p-4 rounded-xl md:rounded-2xl text-xs md:text-sm font-bold outline-none focus:ring-2 focus:ring-orange-500" value={formData.cost_per_unit} onChange={(e) => setFormData({ ...formData, cost_per_unit: parseFloat(e.target.value) || 0 })} />
                                </div>
                                <div>
                                    <label className="block text-[9px] md:text-[10px] font-black text-orange-600 uppercase mb-1 ml-1">Selling Price</label>
                                    <input required type="number" step="0.01" className="w-full bg-orange-50/50 p-3 md:p-4 rounded-xl md:rounded-2xl text-orange-600 font-black text-xs md:text-sm outline-none focus:ring-2 focus:ring-orange-500 border border-orange-100" value={formData.price_per_unit} onChange={(e) => setFormData({ ...formData, price_per_unit: parseFloat(e.target.value) || 0 })} />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
                                {!isEditing && (
                                    <div><label className="block text-[9px] md:text-[10px] font-black text-gray-400 uppercase mb-1 ml-1">Initial Stock</label><input type="number" className="w-full bg-gray-50 p-3 md:p-4 rounded-xl md:rounded-2xl text-xs md:text-sm font-bold outline-none focus:ring-2 focus:ring-orange-500" value={formData.initial_quantity} onChange={(e) => setFormData({ ...formData, initial_quantity: parseInt(e.target.value) || 0, current_stock: parseInt(e.target.value) || 0 })} /></div>
                                )}
                                <div><label className="block text-[9px] md:text-[10px] font-black text-gray-400 uppercase mb-1 ml-1">Re-order Level</label><input type="number" className="w-full bg-gray-50 p-3 md:p-4 rounded-xl md:rounded-2xl text-red-500 font-black text-xs md:text-sm outline-none focus:ring-2 focus:ring-red-500" value={formData.re_order_level} onChange={(e) => setFormData({ ...formData, re_order_level: parseInt(e.target.value) || 0 })} /></div>
                                <div><label className="block text-[9px] md:text-[10px] font-black text-gray-400 uppercase mb-1 ml-1">Current Stock</label><input type="number" className="w-full bg-gray-100 p-3 md:p-4 rounded-xl md:rounded-2xl font-black text-xs md:text-sm outline-none focus:ring-2 focus:ring-gray-400" value={formData.current_stock} onChange={(e) => setFormData({ ...formData, current_stock: parseInt(e.target.value) || 0 })} /></div>
                            </div>

                            <button type="submit" className="w-full p-4 md:p-5 bg-orange-600 hover:bg-orange-700 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl mt-6 transition-all active:scale-95 text-[10px]">
                                {isEditing ? 'Save Changes' : 'Confirm Stock'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* DELETE MODAL */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 text-gray-900">
                    <div className="bg-white rounded-[2rem] p-6 md:p-8 w-full max-w-sm shadow-2xl text-center">
                        <div className="w-14 h-14 md:w-16 md:h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Trash2 size={28} />
                        </div>
                        <h3 className="text-lg md:text-xl font-black uppercase mb-2">Delete Product?</h3>
                        <p className="text-gray-500 mb-6 text-[10px] md:text-xs font-bold leading-relaxed uppercase">This action cannot be undone. Are you sure you want to remove this item from the inventory?</p>
                        <div className="flex gap-2 md:gap-3">
                            <button onClick={() => setShowDeleteModal(false)} className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 font-black uppercase text-[10px] rounded-xl transition-colors">Cancel</button>
                            <button onClick={confirmDelete} className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-black uppercase text-[10px] rounded-xl shadow-lg shadow-red-900/20">Yes, Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}