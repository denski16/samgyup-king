import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from "../../supabaseClient";
import {
    Search, ShoppingCart, Plus, Minus, Trash2, CheckCircle,
    CreditCard, ArrowLeft, Receipt, Store, AlertTriangle,
    Banknote, X, Filter, Package
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

export default function Cashier() {
    const navigate = useNavigate();
    const [userBranches, setUserBranches] = useState([]);
    const [activeBranch, setActiveBranch] = useState('');
    const [staffName, setStaffName] = useState('');

    const [inventory, setInventory] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState('ALL');

    const [loading, setLoading] = useState(true);
    const [isCheckingOut, setIsCheckingOut] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');

    const [cart, setCart] = useState([]);
    const [showUnitModal, setShowUnitModal] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);

    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [cashTendered, setCashTendered] = useState('');

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

            if (branches.length > 0) setActiveBranch(branches[0]);
            else setLoading(false);
        }
    }

    useEffect(() => {
        if (activeBranch) fetchInventory();
    }, [activeBranch]);

    async function fetchInventory() {
        setLoading(true);
        const { data } = await supabase
            .from('inventory')
            .select('*')
            .eq('branch', activeBranch)
            .order('category', { ascending: true })
            .order('product_name', { ascending: true });

        setInventory(data || []);
        setCart([]);
        setActiveCategory('ALL');
        setSearchQuery('');
        setLoading(false);
    }

    // --- SMART CART LOGIC ---
    const handleProductClick = (item) => {
        if (item.current_stock <= 0) return;

        // If it has ANY bulk or mid conversions, show the modal
        if (item.conversion_qty > 1 || item.mid_conversion_qty > 1) {
            setSelectedProduct(item);
            setShowUnitModal(true);
        } else {
            // Standard item, add immediately as base
            processAddToCart(item, 'base');
        }
    };

    const processAddToCart = (item, sellType) => {
        // 1. Multiplier mapping
        let multiplier = 1;
        if (sellType === 'bulk') multiplier = item.conversion_qty;
        if (sellType === 'mid') multiplier = item.mid_conversion_qty;

        const cartItemId = `${item.id}-${sellType}`;

        if (item.current_stock < multiplier) {
            alert(`Not enough stock! You need at least ${multiplier} ${item.base_unit || 'PC'} to sell this unit.`);
            return;
        }

        setCart((prev) => {
            const totalAllocated = prev
                .filter(i => i.id === item.id)
                .reduce((sum, i) => sum + (i.qty * i.multiplier), 0);

            if (totalAllocated + multiplier > item.current_stock) {
                alert(`Cannot add more! You only have ${item.current_stock} total base units in stock.`);
                return prev;
            }

            const existing = prev.find(i => i.cartItemId === cartItemId);
            if (existing) {
                return prev.map(i => i.cartItemId === cartItemId ? { ...i, qty: i.qty + 1 } : i);
            }

            // 2. Price Mapping
            let price = item.price_per_base || item.price_per_unit || 0;
            if (sellType === 'bulk') price = item.price_per_bulk || 0;
            if (sellType === 'mid') price = item.price_per_mid || 0;

            // 3. Unit Name Mapping
            let unitName = item.base_unit || item.unit || 'PC';
            if (sellType === 'bulk') unitName = item.bulk_unit;
            if (sellType === 'mid') unitName = item.mid_unit;

            return [...prev, {
                ...item,
                cartItemId,
                sell_type: sellType,
                cart_price: price,
                cart_unit: unitName,
                qty: 1,
                multiplier: multiplier
            }];
        });

        setShowUnitModal(false);
        setSelectedProduct(null);
    };

    const updateQty = (cartItemId, delta) => {
        setCart((prev) => {
            const itemToUpdate = prev.find(i => i.cartItemId === cartItemId);
            if (!itemToUpdate) return prev;

            const newQty = itemToUpdate.qty + delta;
            if (newQty <= 0) return prev.filter(i => i.cartItemId !== cartItemId);

            // Prevent increasing quantity beyond available physical stock
            if (delta > 0) {
                const totalAllocated = prev
                    .filter(i => i.id === itemToUpdate.id && i.cartItemId !== cartItemId)
                    .reduce((sum, i) => sum + (i.qty * i.multiplier), 0);

                if (totalAllocated + (newQty * itemToUpdate.multiplier) > itemToUpdate.current_stock) {
                    return prev;
                }
            }

            return prev.map(i => i.cartItemId === cartItemId ? { ...i, qty: newQty } : i);
        });
    };

    const removeFromCart = (cartItemId) => {
        setCart((prev) => prev.filter(item => item.cartItemId !== cartItemId));
    };

    const cartTotal = cart.reduce((sum, item) => sum + (item.cart_price * item.qty), 0);
    const cartItemsCount = cart.reduce((sum, item) => sum + item.qty, 0);

    // --- PAYMENT CALCULATIONS ---
    const cashAmount = parseFloat(cashTendered) || 0;
    const changeDue = cashAmount - cartTotal;
    const isPaymentValid = cashAmount >= cartTotal;

    // --- UPDATED CHECKOUT LOGIC WITH ERROR HANDLING ---
    const handleCheckout = async (e) => {
        e.preventDefault();
        if (cart.length === 0 || !isPaymentValid) return;
        setIsCheckingOut(true);

        try {
            const timestamp = new Date();

            // --- GENERATE TRANSACTION ID ---
            const dateString = timestamp.toISOString().split('T')[0].replace(/-/g, '');
            const randomString = Math.random().toString(36).substring(2, 6).toUpperCase();
            const transactionId = `TXN-${dateString}-${randomString}`;

            // 1. PROCESS SALES FIRST
            for (const item of cart) {
                const { error: salesError } = await supabase.from('sales').insert([{
                    transaction_id: transactionId,
                    inventory_id: item.id,
                    product_name: item.product_name,
                    branch: activeBranch,
                    quantity_sold: item.qty,
                    unit_sold: item.cart_unit,
                    total_price: item.cart_price * item.qty,
                    sale_date: timestamp
                }]);

                // If Supabase rejects the insert, halt immediately and throw error
                if (salesError) throw new Error(`Sales Database Error: ${salesError.message}`);
            }

            // 2. Group deductions by inventory ID for safe updates
            const inventoryUpdates = {};
            cart.forEach(item => {
                if (!inventoryUpdates[item.id]) {
                    inventoryUpdates[item.id] = { id: item.id, current_stock: item.current_stock, total_deduction: 0 };
                }
                inventoryUpdates[item.id].total_deduction += (item.qty * item.multiplier);
            });

            // 3. Process Inventory Updates safely
            for (const update of Object.values(inventoryUpdates)) {
                const newStock = update.current_stock - update.total_deduction;
                const { error: invError } = await supabase.from('inventory').update({ current_stock: newStock }).eq('id', update.id);

                if (invError) throw new Error(`Inventory Update Error: ${invError.message}`);
            }

            // 4. Log ONE single activity for the entire transaction
            const { error: logError } = await supabase.from('activity_logs').insert([{
                staff_name: staffName || 'Unknown Staff',
                branch: activeBranch,
                action_type: 'SALE',
                details: `Processed Transaction ${transactionId}: Sold ${cartItemsCount} items for ₱${cartTotal.toLocaleString()}`,
                created_at: timestamp
            }]);

            if (logError) console.error("Non-critical log error:", logError.message);

            setSuccessMsg(`Transaction ${transactionId} Successful! Change due: ₱${changeDue.toLocaleString()}`);
            setCart([]);
            setShowPaymentModal(false);
            setCashTendered('');
            fetchInventory();
            setTimeout(() => setSuccessMsg(''), 5000);

        } catch (error) {
            console.error("Checkout Failed:", error);
            alert(`🚨 Transaction Failed: ${error.message}\n\nNo stock was deducted.`);
        } finally {
            setIsCheckingOut(false);
        }
    };

    const uniqueCategories = ['ALL', ...Array.from(new Set(inventory.map(item => item.category || 'UNTAGGED'))).sort()];

    const filteredInventory = inventory.filter(item => {
        const matchesSearch =
            item.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (item.sku && item.sku.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (item.category && item.category.toLowerCase().includes(searchQuery.toLowerCase()));

        const matchesCategory = activeCategory === 'ALL' || (item.category || 'UNTAGGED') === activeCategory;
        return matchesSearch && matchesCategory;
    });

    return (
        <div className="flex flex-col h-[100dvh] bg-gray-50 text-gray-900 font-sans overflow-hidden">

            {/* Top Navigation Bar */}
            <header className="bg-white border-b border-gray-200 px-4 md:px-6 py-4 flex flex-col sm:flex-row items-center justify-between shrink-0 shadow-sm gap-4">
                <div className="flex items-center gap-4 w-full sm:w-auto">
                    <button onClick={() => navigate('/staff/dashboard')} className="p-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl transition-colors active:scale-95 flex items-center gap-2 font-bold text-xs uppercase tracking-widest shrink-0">
                        <ArrowLeft size={18} /> <span className="hidden md:inline">Dashboard</span>
                    </button>
                    <div className="h-8 w-px bg-gray-200 mx-2 hidden sm:block"></div>
                    <div className="flex-1">
                        <h1 className="text-lg md:text-xl font-black uppercase tracking-tight">POS <span className="text-orange-600">Terminal</span></h1>
                        <p className="text-[9px] md:text-[10px] text-gray-500 font-black tracking-widest uppercase">{activeBranch || 'Select Branch'}</p>
                    </div>
                </div>

                <div className="relative w-full sm:max-w-md">
                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search products..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-gray-100 pl-11 pr-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-orange-500/50 border border-transparent focus:bg-white focus:border-orange-200 font-bold text-sm transition-all shadow-inner"
                    />
                </div>
            </header>

            <main className="flex-1 flex flex-col md:flex-row p-3 md:p-4 lg:p-6 gap-4 md:gap-6 min-h-0 w-full max-w-[1600px] mx-auto">
                {/* LEFT: Menu & Branches */}
                <div className="flex-1 flex flex-col min-h-0 gap-3 md:gap-4 overflow-hidden">
                    <div className="flex flex-col sm:flex-row gap-2 md:gap-3 shrink-0">
                        {userBranches.length === 0 ? (
                            <div className="p-3 md:p-4 bg-red-50 text-red-600 rounded-2xl border border-red-100 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest shrink-0">
                                <AlertTriangle size={18} /> No branches assigned.
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 bg-gray-200/50 p-1.5 rounded-2xl w-full sm:w-fit overflow-x-auto custom-scrollbar shrink-0">
                                <Store size={14} className="text-gray-400 ml-2 md:ml-3 mr-1 shrink-0" />
                                {userBranches.map((br) => (
                                    <button key={br} onClick={() => setActiveBranch(br)}
                                        className={`px-4 md:px-5 py-2 md:py-2.5 rounded-xl text-[9px] md:text-[10px] font-black tracking-[0.2em] transition-all whitespace-nowrap flex-1 sm:flex-none ${activeBranch === br ? 'bg-white text-orange-600 shadow-md' : 'text-gray-500 hover:text-gray-900'}`}>
                                        {br}
                                    </button>
                                ))}
                            </div>
                        )}

                        {!loading && inventory.length > 0 && (
                            <div className="flex items-center gap-1.5 md:gap-2 bg-white border border-gray-200 p-1.5 rounded-2xl w-full sm:flex-1 overflow-x-auto custom-scrollbar">
                                <Filter size={14} className="text-orange-500 ml-2 md:ml-3 mr-1 shrink-0" />
                                {uniqueCategories.map(cat => (
                                    <button key={cat} onClick={() => setActiveCategory(cat)}
                                        className={`px-3 md:px-4 py-2 md:py-2.5 rounded-xl text-[9px] md:text-[10px] font-black tracking-widest uppercase whitespace-nowrap transition-all ${activeCategory === cat ? 'bg-gray-900 text-white shadow-md' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'}`}>
                                        {cat}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {successMsg && (
                        <div className="p-3 md:p-4 bg-green-50 text-green-700 rounded-2xl border border-green-100 flex items-center gap-3 font-black text-xs uppercase tracking-tight animate-in fade-in slide-in-from-top-2 shrink-0">
                            <CheckCircle size={20} /> {successMsg}
                        </div>
                    )}

                    {/* Product Grid */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 md:pr-2 pb-4">
                        {loading ? (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400 font-black uppercase tracking-widest text-xs animate-pulse">Loading Menu...</div>
                        ) : filteredInventory.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400 font-black uppercase tracking-widest text-xs">
                                {activeBranch ? 'No products found.' : 'Select a branch first.'}
                            </div>
                        ) : (
                            <div className="grid grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2 md:gap-3">
                                {filteredInventory.map((item) => {
                                    const isOutOfStock = item.current_stock <= 0;
                                    const hasBulk = item.conversion_qty > 1;
                                    const hasMid = item.mid_conversion_qty > 1;

                                    return (
                                        <button
                                            key={item.id}
                                            onClick={() => handleProductClick(item)}
                                            disabled={isOutOfStock}
                                            className={`p-2.5 md:p-3 rounded-xl md:rounded-2xl text-left transition-all active:scale-95 flex flex-col justify-between aspect-square border ${isOutOfStock ? 'bg-gray-100 border-gray-200 opacity-50 cursor-not-allowed grayscale' : 'bg-white border-gray-100 hover:border-orange-500 hover:shadow-xl hover:shadow-orange-900/10'}`}
                                        >
                                            <div>
                                                <div className="flex justify-between items-start mb-1 gap-1">
                                                    <p className="text-[6px] md:text-[7px] font-black tracking-widest uppercase text-gray-400 truncate">{item.category || 'UNTAGGED'}</p>
                                                    {(hasBulk || hasMid) && (
                                                        <span className="bg-blue-50 text-blue-600 border border-blue-100 px-1 py-0.5 rounded text-[5px] md:text-[6px] font-black uppercase tracking-widest shrink-0 shadow-sm">
                                                            Packs Avail
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="font-black text-[10px] md:text-xs lg:text-sm text-gray-900 uppercase leading-tight line-clamp-2 mb-1">{item.product_name}</p>
                                            </div>
                                            <div className="mt-1 md:mt-2">
                                                <p className="text-xs md:text-sm lg:text-base font-black text-orange-600 mb-0.5">₱{item.price_per_base || item.price_per_unit || 0}</p>
                                                <p className={`text-[6px] md:text-[7px] font-black tracking-widest uppercase ${item.current_stock <= (item.re_order_level || 5) ? 'text-red-500' : 'text-green-500'}`}>
                                                    {isOutOfStock ? 'OUT OF STOCK' : formatStock(item.current_stock, item.conversion_qty, item.bulk_unit, item.base_unit)}
                                                </p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT: Cart & Checkout */}
                <div className="w-full md:w-[320px] lg:w-[400px] bg-gray-900 text-white rounded-t-[2rem] md:rounded-[2rem] flex flex-col shadow-2xl overflow-hidden h-[45vh] md:h-full shrink-0 relative z-10 md:z-auto border-t md:border-none border-gray-800">
                    <div className="p-4 md:p-6 border-b border-white/10 flex justify-between items-center bg-gray-950/30 shrink-0">
                        <h2 className="text-sm md:text-base font-black uppercase tracking-widest flex items-center gap-2">
                            <ShoppingCart className="text-orange-500" size={18} /> Current Order
                        </h2>
                        <span className="bg-orange-600 text-white px-2 md:px-3 py-1 rounded-full text-[9px] md:text-[10px] font-black tracking-widest">{cartItemsCount} Items</span>
                    </div>

                    <div className="flex-1 overflow-y-auto p-3 md:p-4 lg:p-6 space-y-2 md:space-y-3 custom-scrollbar">
                        {cart.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-gray-600">
                                <Receipt size={40} md:size={48} className="mb-3 md:mb-4 opacity-20" />
                                <p className="text-[10px] md:text-xs font-black uppercase tracking-widest">Cart is empty</p>
                                <p className="text-[9px] md:text-[10px] mt-1 md:mt-2 font-medium italic text-center px-4">Tap items to add them to the order.</p>
                            </div>
                        ) : (
                            cart.map((item) => (
                                <div key={item.cartItemId} className="bg-white/5 p-3 md:p-4 rounded-xl md:rounded-2xl flex flex-col gap-2 md:gap-3">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-black text-xs md:text-sm uppercase leading-tight pr-2">{item.product_name}</p>
                                            <p className="text-[8px] md:text-[9px] font-black tracking-widest uppercase text-gray-400 mt-1 flex items-center gap-1.5">
                                                {item.cart_unit} <span className="opacity-50">|</span> ₱{item.cart_price}
                                            </p>
                                        </div>
                                        <button onClick={() => removeFromCart(item.cartItemId)} className="text-gray-500 hover:text-red-500 transition-colors p-1 shrink-0">
                                            <Trash2 size={14} md:size={16} />
                                        </button>
                                    </div>

                                    <div className="flex justify-between items-end mt-1">
                                        <p className="text-orange-500 font-black text-base md:text-lg">₱{(item.cart_price * item.qty).toLocaleString()}</p>
                                        <div className="flex items-center gap-1 md:gap-2 bg-gray-950 px-1.5 md:px-2 py-1 md:py-1.5 rounded-lg md:rounded-xl border border-white/10 shrink-0">
                                            <button onClick={() => updateQty(item.cartItemId, -1)} className="p-1 md:p-1.5 hover:bg-white/10 rounded-md transition-colors text-gray-400 hover:text-white">
                                                <Minus size={12} md:size={14} />
                                            </button>
                                            <span className="font-black text-xs md:text-sm w-5 md:w-6 text-center select-none">{item.qty}</span>
                                            <button onClick={() => updateQty(item.cartItemId, 1)} className="p-1 md:p-1.5 hover:bg-white/10 rounded-md transition-colors text-gray-400 hover:text-white active:scale-95">
                                                <Plus size={12} md:size={14} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="p-4 md:p-6 bg-gray-950 border-t border-white/5 shrink-0">
                        <div className="flex justify-between items-center mb-4 md:mb-6">
                            <p className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Amount</p>
                            <p className="text-2xl md:text-3xl font-black text-white tracking-tight">₱{cartTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                        </div>
                        <button onClick={() => setShowPaymentModal(true)} disabled={cart.length === 0 || isCheckingOut} className="w-full py-4 md:py-5 bg-orange-600 hover:bg-orange-700 text-white font-black uppercase tracking-[0.2em] text-[10px] md:text-xs rounded-[1rem] md:rounded-2xl shadow-xl transition-all active:scale-95 disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-2">
                            <CreditCard size={16} md:size={18} /> Proceed to Payment
                        </button>
                    </div>
                </div>
            </main>

            {/* --- UNIT SELECTION MODAL --- */}
            {showUnitModal && selectedProduct && (
                <div className="fixed inset-0 z-[210] flex items-center justify-center bg-gray-900/80 backdrop-blur-sm p-4 font-sans">
                    <div className="bg-white rounded-[2rem] p-6 w-full max-w-sm shadow-2xl animate-in zoom-in duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-base md:text-lg font-black uppercase tracking-tight flex items-center gap-2">
                                <Package className="text-orange-600" size={20} /> Select Unit
                            </h2>
                            <button onClick={() => { setShowUnitModal(false); setSelectedProduct(null); }} className="text-gray-400 hover:text-gray-900 bg-gray-100 p-2 rounded-full transition-colors">
                                <X size={16} />
                            </button>
                        </div>

                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 text-center">{selectedProduct.product_name}</p>

                        <div className="space-y-3">
                            {/* BASE TIER */}
                            <button onClick={() => processAddToCart(selectedProduct, 'base')} className="w-full p-4 border-2 border-gray-100 hover:border-gray-900 rounded-2xl flex justify-between items-center transition-all active:scale-95 group">
                                <div className="text-left">
                                    <p className="font-black text-gray-900 uppercase text-sm">{selectedProduct.base_unit || 'PC'}</p>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Base Unit</p>
                                </div>
                                <span className="font-black text-gray-900 text-lg group-hover:scale-110 transition-transform">₱{selectedProduct.price_per_base || selectedProduct.price_per_unit || 0}</span>
                            </button>

                            {/* MID TIER */}
                            {selectedProduct.mid_conversion_qty > 1 && (
                                <button onClick={() => processAddToCart(selectedProduct, 'mid')} className="w-full p-4 border-2 border-gray-100 hover:border-orange-500 rounded-2xl flex justify-between items-center transition-all active:scale-95 group bg-orange-50/30">
                                    <div className="text-left">
                                        <p className="font-black text-gray-900 uppercase text-sm">{selectedProduct.mid_unit}</p>
                                        <p className="text-[10px] font-bold text-orange-500 uppercase tracking-widest mt-0.5">Contains {selectedProduct.mid_conversion_qty} {selectedProduct.base_unit}</p>
                                    </div>
                                    <span className="font-black text-orange-600 text-lg group-hover:scale-110 transition-transform">₱{selectedProduct.price_per_mid}</span>
                                </button>
                            )}

                            {/* BULK TIER */}
                            {selectedProduct.conversion_qty > 1 && (
                                <button onClick={() => processAddToCart(selectedProduct, 'bulk')} className="w-full p-4 border-2 border-gray-100 hover:border-blue-500 rounded-2xl flex justify-between items-center transition-all active:scale-95 group bg-blue-50/30">
                                    <div className="text-left">
                                        <p className="font-black text-gray-900 uppercase text-sm">{selectedProduct.bulk_unit}</p>
                                        <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mt-0.5">Contains {selectedProduct.conversion_qty} {selectedProduct.base_unit}</p>
                                    </div>
                                    <span className="font-black text-blue-600 text-lg group-hover:scale-110 transition-transform">₱{selectedProduct.price_per_bulk}</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* --- PAYMENT MODAL --- */}
            {showPaymentModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-gray-900/80 backdrop-blur-sm p-4 text-gray-900 font-sans">
                    <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-10 w-full max-w-md shadow-2xl animate-in zoom-in duration-200">
                        <div className="flex justify-between items-center mb-6 md:mb-8">
                            <h2 className="text-lg md:text-xl font-black uppercase tracking-tight flex items-center gap-2">
                                <Banknote className="text-orange-600" size={20} md:size={24} /> Cash <span className="text-orange-600">Payment</span>
                            </h2>
                            <button onClick={() => { setShowPaymentModal(false); setCashTendered(''); }} className="text-gray-400 hover:text-gray-900 bg-gray-100 p-2 rounded-full transition-colors">
                                <X size={18} md:size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleCheckout} className="space-y-4 md:space-y-6">
                            <div className="p-4 md:p-6 bg-gray-900 rounded-[1.25rem] md:rounded-[1.5rem] text-center shadow-inner">
                                <p className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Due</p>
                                <p className="text-3xl md:text-4xl font-black text-white tracking-tight">₱{cartTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                            </div>

                            <div>
                                <label className="block text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Amount Tendered (Cash Given)</label>
                                <div className="relative">
                                    <span className="absolute left-5 md:left-6 top-1/2 -translate-y-1/2 text-xl md:text-2xl font-black text-gray-400">₱</span>
                                    <input type="number" min={cartTotal} step="0.01" autoFocus required value={cashTendered} onChange={(e) => setCashTendered(e.target.value)} className="w-full bg-gray-50 pl-12 md:pl-14 pr-4 md:pr-6 py-4 md:py-5 rounded-[1.25rem] md:rounded-[1.5rem] outline-none focus:ring-2 focus:ring-orange-500/50 border border-transparent focus:border-orange-200 font-black text-2xl md:text-3xl transition-all" placeholder="0.00" />
                                </div>
                                <div className="flex gap-2 mt-2 md:mt-3">
                                    <button type="button" onClick={() => setCashTendered(cartTotal.toString())} className="flex-1 py-2 md:py-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest text-gray-600 transition-colors">Exact</button>
                                    <button type="button" onClick={() => setCashTendered('500')} className="flex-1 py-2 md:py-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest text-gray-600 transition-colors">₱500</button>
                                    <button type="button" onClick={() => setCashTendered('1000')} className="flex-1 py-2 md:py-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest text-gray-600 transition-colors">₱1000</button>
                                </div>
                            </div>

                            <div className={`p-4 md:p-6 rounded-[1.25rem] md:rounded-[1.5rem] border transition-colors flex justify-between items-center ${cashAmount > 0 && isPaymentValid ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-100'}`}>
                                <p className={`text-[9px] md:text-[10px] font-black uppercase tracking-widest ${cashAmount > 0 && isPaymentValid ? 'text-green-700' : 'text-gray-400'}`}>Change Due</p>
                                <p className={`text-xl md:text-2xl font-black tracking-tight ${cashAmount > 0 && isPaymentValid ? 'text-green-600' : 'text-gray-400'}`}>
                                    ₱{cashAmount >= cartTotal ? changeDue.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '0.00'}
                                </p>
                            </div>

                            <button type="submit" disabled={!isPaymentValid || isCheckingOut} className="w-full py-4 md:py-6 bg-orange-600 hover:bg-orange-700 text-white font-black uppercase tracking-[0.2em] text-[10px] md:text-xs rounded-[1.25rem] md:rounded-[1.5rem] shadow-xl transition-all active:scale-95 disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-2">
                                {isCheckingOut ? 'Processing...' : <><CheckCircle size={16} md:size={18} /> Confirm Transaction</>}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}