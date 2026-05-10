import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from "../../supabaseClient";
import {
    Search,
    ShoppingCart,
    Plus,
    Minus,
    Trash2,
    CheckCircle,
    CreditCard,
    ArrowLeft,
    Receipt,
    Store,
    AlertTriangle,
    Banknote,
    X,
    Filter
} from 'lucide-react';

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

    // POS Cart State
    const [cart, setCart] = useState([]);

    // Payment Modal State
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

    // --- CART LOGIC ---
    const addToCart = (item) => {
        if (item.current_stock <= 0) return;

        setCart((prev) => {
            const existing = prev.find(i => i.id === item.id);
            if (existing) {
                if (existing.qty >= item.current_stock) return prev;
                return prev.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i);
            }
            return [...prev, { ...item, qty: 1 }];
        });
    };

    const updateQty = (id, delta) => {
        setCart((prev) => prev.map(item => {
            if (item.id === id) {
                const newQty = item.qty + delta;
                if (newQty > item.current_stock) return item;
                if (newQty <= 0) return null;
                return { ...item, qty: newQty };
            }
            return item;
        }).filter(Boolean));
    };

    const removeFromCart = (id) => {
        setCart((prev) => prev.filter(item => item.id !== id));
    };

    const cartTotal = cart.reduce((sum, item) => sum + (item.price_per_unit * item.qty), 0);
    const cartItemsCount = cart.reduce((sum, item) => sum + item.qty, 0);

    // --- PAYMENT CALCULATIONS ---
    const cashAmount = parseFloat(cashTendered) || 0;
    const changeDue = cashAmount - cartTotal;
    const isPaymentValid = cashAmount >= cartTotal;

    // --- CHECKOUT LOGIC ---
    const handleCheckout = async (e) => {
        e.preventDefault();
        if (cart.length === 0 || !isPaymentValid) return;
        setIsCheckingOut(true);

        try {
            const timestamp = new Date();

            const checkoutPromises = cart.map(async (item) => {
                const newStock = item.current_stock - item.qty;

                await supabase.from('inventory')
                    .update({ current_stock: newStock })
                    .eq('id', item.id);

                await supabase.from('sales')
                    .insert([{
                        inventory_id: item.id,
                        product_name: item.product_name,
                        branch: activeBranch,
                        quantity_sold: item.qty,
                        total_price: item.price_per_unit * item.qty,
                        sale_date: timestamp
                    }]);

                await supabase.from('activity_logs').insert([{
                    staff_name: staffName || 'Unknown Staff',
                    branch: activeBranch,
                    action_type: 'SALE',
                    details: `POS Sale: ${item.qty}x ${item.product_name} [${item.unit || '-'}] (Total: ₱${(item.price_per_unit * item.qty).toLocaleString()})`,
                    created_at: timestamp
                }]);
            });

            await Promise.all(checkoutPromises);

            setSuccessMsg(`Successfully processed ${cartItemsCount} items! Change due: ₱${changeDue.toLocaleString()}`);
            setCart([]);
            setShowPaymentModal(false);
            setCashTendered('');
            fetchInventory();
            setTimeout(() => setSuccessMsg(''), 5000);

        } catch (error) {
            alert("Checkout Error: " + error.message);
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
        <div className="flex flex-col h-screen bg-gray-50 text-gray-900 font-sans overflow-hidden">

            {/* Top Navigation Bar */}
            <header className="bg-white border-b border-gray-200 px-4 md:px-6 py-4 flex flex-col sm:flex-row items-center justify-between shrink-0 shadow-sm gap-4">
                <div className="flex items-center gap-4 w-full sm:w-auto">
                    <button
                        onClick={() => navigate('/staff/dashboard')}
                        className="p-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl transition-colors active:scale-95 flex items-center gap-2 font-bold text-xs uppercase tracking-widest shrink-0"
                    >
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
                        {/* Branch Selection */}
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

                        {/* Category Filter Buttons */}
                        {!loading && inventory.length > 0 && (
                            <div className="flex items-center gap-1.5 md:gap-2 bg-white border border-gray-200 p-1.5 rounded-2xl w-full sm:flex-1 overflow-x-auto custom-scrollbar">
                                <Filter size={14} className="text-orange-500 ml-2 md:ml-3 mr-1 shrink-0" />
                                {uniqueCategories.map(cat => (
                                    <button
                                        key={cat}
                                        onClick={() => setActiveCategory(cat)}
                                        className={`px-3 md:px-4 py-2 md:py-2.5 rounded-xl text-[9px] md:text-[10px] font-black tracking-widest uppercase whitespace-nowrap transition-all ${activeCategory === cat
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

                    {successMsg && (
                        <div className="p-3 md:p-4 bg-green-50 text-green-700 rounded-2xl border border-green-100 flex items-center gap-3 font-black text-xs uppercase tracking-tight animate-in fade-in slide-in-from-top-2 shrink-0">
                            <CheckCircle size={20} /> {successMsg}
                        </div>
                    )}

                    {/* Product Grid - Updated for smaller items (more columns, smaller text/padding) */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 md:pr-2 pb-4">
                        {loading ? (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400 font-black uppercase tracking-widest text-xs animate-pulse">
                                Loading Menu...
                            </div>
                        ) : filteredInventory.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400 font-black uppercase tracking-widest text-xs">
                                {activeBranch ? 'No products found.' : 'Select a branch first.'}
                            </div>
                        ) : (
                            <div className="grid grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2 md:gap-3">
                                {filteredInventory.map((item) => {
                                    const isOutOfStock = item.current_stock <= 0;
                                    return (
                                        <button
                                            key={item.id}
                                            onClick={() => addToCart(item)}
                                            disabled={isOutOfStock}
                                            className={`p-2.5 md:p-3 rounded-xl md:rounded-2xl text-left transition-all active:scale-95 flex flex-col justify-between aspect-square border ${isOutOfStock ? 'bg-gray-100 border-gray-200 opacity-50 cursor-not-allowed grayscale' : 'bg-white border-gray-100 hover:border-orange-500 hover:shadow-xl hover:shadow-orange-900/10'}`}
                                        >
                                            <div>
                                                <div className="flex justify-between items-start mb-1 gap-1">
                                                    <p className="text-[6px] md:text-[7px] font-black tracking-widest uppercase text-gray-400 truncate">
                                                        {item.category || 'UNTAGGED'}
                                                    </p>
                                                    <span className="bg-gray-100 text-gray-600 px-1 py-0.5 rounded text-[6px] md:text-[7px] font-black uppercase tracking-widest shrink-0">
                                                        {item.unit || '-'}
                                                    </span>
                                                </div>
                                                <p className="font-black text-[10px] md:text-xs lg:text-sm text-gray-900 uppercase leading-tight line-clamp-2 mb-1">{item.product_name}</p>
                                            </div>
                                            <div className="mt-1 md:mt-2">
                                                <p className="text-sm md:text-base lg:text-lg font-black text-orange-600 mb-0.5">₱{item.price_per_unit}</p>
                                                <p className={`text-[7px] md:text-[8px] font-black tracking-widest uppercase ${item.current_stock <= (item.re_order_level || 5) ? 'text-red-500' : 'text-green-500'}`}>
                                                    {isOutOfStock ? 'OUT OF STOCK' : `Stock: ${item.current_stock}`}
                                                </p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT: Cart & Checkout - iPad widths adjusted */}
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
                                <div key={item.id} className="bg-white/5 p-3 md:p-4 rounded-xl md:rounded-2xl flex flex-col gap-2 md:gap-3">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-black text-xs md:text-sm uppercase leading-tight pr-2">{item.product_name}</p>
                                            <p className="text-[8px] md:text-[9px] font-black tracking-widest uppercase text-gray-400 mt-1">{item.unit || '-'}</p>
                                        </div>
                                        <button onClick={() => removeFromCart(item.id)} className="text-gray-500 hover:text-red-500 transition-colors p-1">
                                            <Trash2 size={14} md:size={16} />
                                        </button>
                                    </div>

                                    <div className="flex justify-between items-end">
                                        <p className="text-orange-500 font-black text-base md:text-lg">₱{(item.price_per_unit * item.qty).toLocaleString()}</p>

                                        <div className="flex items-center gap-1 md:gap-2 bg-gray-950 px-1.5 md:px-2 py-1 md:py-1.5 rounded-lg md:rounded-xl border border-white/10">
                                            <button onClick={() => updateQty(item.id, -1)} className="p-1 md:p-1.5 hover:bg-white/10 rounded-md transition-colors text-gray-400 hover:text-white">
                                                <Minus size={12} md:size={14} />
                                            </button>
                                            <span className="font-black text-xs md:text-sm w-5 md:w-6 text-center select-none">{item.qty}</span>
                                            <button
                                                onClick={() => updateQty(item.id, 1)}
                                                disabled={item.qty >= item.current_stock}
                                                className="p-1 md:p-1.5 hover:bg-white/10 rounded-md transition-colors text-gray-400 hover:text-white disabled:opacity-30"
                                            >
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

                        <button
                            onClick={() => setShowPaymentModal(true)}
                            disabled={cart.length === 0 || isCheckingOut}
                            className="w-full py-4 md:py-5 bg-orange-600 hover:bg-orange-700 text-white font-black uppercase tracking-[0.2em] text-[10px] md:text-xs rounded-[1rem] md:rounded-2xl shadow-xl transition-all active:scale-95 disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-2"
                        >
                            <CreditCard size={16} md:size={18} /> Proceed to Payment
                        </button>
                    </div>
                </div>
            </main>

            {/* --- PAYMENT MODAL --- */}
            {showPaymentModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-gray-900/80 backdrop-blur-sm p-4 text-gray-900 font-sans">
                    <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-10 w-full max-w-md shadow-2xl animate-in zoom-in duration-200">

                        <div className="flex justify-between items-center mb-6 md:mb-8">
                            <h2 className="text-lg md:text-xl font-black uppercase tracking-tight flex items-center gap-2">
                                <Banknote className="text-orange-600" size={20} md:size={24} /> Cash <span className="text-orange-600">Payment</span>
                            </h2>
                            <button
                                onClick={() => {
                                    setShowPaymentModal(false);
                                    setCashTendered('');
                                }}
                                className="text-gray-400 hover:text-gray-900 bg-gray-100 p-2 rounded-full transition-colors"
                            >
                                <X size={18} md:size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleCheckout} className="space-y-4 md:space-y-6">
                            {/* Total Due */}
                            <div className="p-4 md:p-6 bg-gray-900 rounded-[1.25rem] md:rounded-[1.5rem] text-center shadow-inner">
                                <p className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Due</p>
                                <p className="text-3xl md:text-4xl font-black text-white tracking-tight">₱{cartTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                            </div>

                            {/* Cash Input */}
                            <div>
                                <label className="block text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Amount Tendered (Cash Given)</label>
                                <div className="relative">
                                    <span className="absolute left-5 md:left-6 top-1/2 -translate-y-1/2 text-xl md:text-2xl font-black text-gray-400">₱</span>
                                    <input
                                        type="number"
                                        min={cartTotal}
                                        step="0.01"
                                        autoFocus
                                        required
                                        value={cashTendered}
                                        onChange={(e) => setCashTendered(e.target.value)}
                                        className="w-full bg-gray-50 pl-12 md:pl-14 pr-4 md:pr-6 py-4 md:py-5 rounded-[1.25rem] md:rounded-[1.5rem] outline-none focus:ring-2 focus:ring-orange-500/50 border border-transparent focus:border-orange-200 font-black text-2xl md:text-3xl transition-all"
                                        placeholder="0.00"
                                    />
                                </div>
                                {/* Quick Cash Buttons */}
                                <div className="flex gap-2 mt-2 md:mt-3">
                                    <button type="button" onClick={() => setCashTendered(cartTotal.toString())} className="flex-1 py-2 md:py-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest text-gray-600 transition-colors">Exact</button>
                                    <button type="button" onClick={() => setCashTendered('500')} className="flex-1 py-2 md:py-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest text-gray-600 transition-colors">₱500</button>
                                    <button type="button" onClick={() => setCashTendered('1000')} className="flex-1 py-2 md:py-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest text-gray-600 transition-colors">₱1000</button>
                                </div>
                            </div>

                            {/* Change Calculation */}
                            <div className={`p-4 md:p-6 rounded-[1.25rem] md:rounded-[1.5rem] border transition-colors flex justify-between items-center ${cashAmount > 0 && isPaymentValid ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-100'}`}>
                                <p className={`text-[9px] md:text-[10px] font-black uppercase tracking-widest ${cashAmount > 0 && isPaymentValid ? 'text-green-700' : 'text-gray-400'}`}>Change Due</p>
                                <p className={`text-xl md:text-2xl font-black tracking-tight ${cashAmount > 0 && isPaymentValid ? 'text-green-600' : 'text-gray-400'}`}>
                                    ₱{cashAmount >= cartTotal ? changeDue.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '0.00'}
                                </p>
                            </div>

                            <button
                                type="submit"
                                disabled={!isPaymentValid || isCheckingOut}
                                className="w-full py-4 md:py-6 bg-orange-600 hover:bg-orange-700 text-white font-black uppercase tracking-[0.2em] text-[10px] md:text-xs rounded-[1.25rem] md:rounded-[1.5rem] shadow-xl transition-all active:scale-95 disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-2"
                            >
                                {isCheckingOut ? 'Processing...' : <><CheckCircle size={16} md:size={18} /> Confirm Transaction</>}
                            </button>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
}