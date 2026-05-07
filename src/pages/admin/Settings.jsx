import { useState, useEffect } from 'react';
import { supabase } from "../../supabaseClient";
import AdminSidebar from "../../components/AdminSidebar";
import {
    ShieldCheck,
    Lock,
    Check,
    X,
    RefreshCcw,
    AlertCircle,
    Cpu,
    Info,
    Eye,
    EyeOff
} from 'lucide-react';
import bcrypt from 'bcryptjs';

export default function Settings() {
    const [loading, setLoading] = useState(false);
    const [showPassModal, setShowPassModal] = useState(false);
    const [adminProfile, setAdminProfile] = useState(null);

    // Visibility States
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);

    const [passwords, setPasswords] = useState({
        current: '',
        new: '',
        confirm: ''
    });

    const [status, setStatus] = useState({ type: '', msg: '' });

    const validatePassword = (pass) => {
        return {
            length: pass.length >= 8,
            upper: /[A-Z]/.test(pass),
            lower: /[a-z]/.test(pass),
            number: /[0-9]/.test(pass),
            special: /[@$!%*?&]/.test(pass)
        };
    };

    const requirements = validatePassword(passwords.new);
    const isStrongEnough = Object.values(requirements).every(Boolean);
    const passwordsMatch = passwords.new === passwords.confirm && passwords.new !== '';

    useEffect(() => {
        fetchAdminProfile();
    }, []);

    async function fetchAdminProfile() {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
            setAdminProfile(data);
        }
    }

    const handleUpdatePassword = async (e) => {
        e.preventDefault();
        if (!isStrongEnough || !passwordsMatch) return;

        setLoading(true);
        setStatus({ type: '', msg: '' });

        try {
            const isAuthorized = await bcrypt.compare(passwords.current, adminProfile.password);
            if (!isAuthorized) {
                setStatus({ type: 'error', msg: 'Current password is incorrect.' });
                setLoading(false);
                return;
            }

            const { error: authError } = await supabase.auth.updateUser({ password: passwords.new });
            if (authError) throw authError;

            const salt = await bcrypt.genSalt(10);
            const newHashedPassword = await bcrypt.hash(passwords.new, salt);
            const { error: profileError } = await supabase
                .from('profiles')
                .update({ password: newHashedPassword })
                .eq('id', adminProfile.id);

            if (profileError) throw profileError;

            setStatus({ type: 'success', msg: 'Security credentials updated!' });
            setPasswords({ current: '', new: '', confirm: '' });
            setTimeout(() => setShowPassModal(false), 2000);
        } catch (error) {
            setStatus({ type: 'error', msg: error.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen bg-gray-50 text-gray-900 font-sans">
            <AdminSidebar />

            <main className="flex-1 p-4 pt-20 md:p-8 w-full max-w-[100vw] overflow-x-hidden">
                <header className="mb-8 md:mb-10">
                    <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight">System Settings</h1>
                    <p className="text-sm md:text-base text-gray-500 font-medium italic">Configure security and system parameters.</p>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl">
                    {/* Security Card */}
                    <div className="bg-white rounded-[2.5rem] p-6 md:p-10 shadow-sm border border-gray-100 flex flex-col justify-between">
                        <section>
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-600 mb-6 flex items-center gap-2">
                                <ShieldCheck size={16} /> Account Security
                            </h3>
                            <div className="mb-8">
                                <p className="text-sm font-black text-gray-900 uppercase tracking-tight">Access Level: Manager</p>
                                <p className="text-xs text-gray-500 font-medium italic mt-1">{adminProfile?.email}</p>
                            </div>
                            <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex gap-3 mb-8">
                                <Info className="text-blue-600 shrink-0" size={18} />
                                <p className="text-[10px] text-blue-700 font-bold uppercase leading-relaxed">
                                    Enforced security protocols require 8+ characters with mixed casing, numbers, and symbols.
                                </p>
                            </div>
                        </section>

                        <button
                            onClick={() => setShowPassModal(true)}
                            className="w-full md:w-fit px-8 py-4 bg-gray-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-orange-600 transition-all shadow-xl shadow-gray-900/10"
                        >
                            Update Credentials
                        </button>
                    </div>

                    {/* System Info Card */}
                    <div className="bg-gray-900 rounded-[2.5rem] p-6 md:p-10 shadow-2xl relative overflow-hidden flex flex-col justify-between">
                        <Cpu size={120} className="absolute -bottom-10 -right-10 text-white/5 rotate-12" />
                        <section>
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-500 mb-6 flex items-center gap-2">
                                <RefreshCcw size={16} /> System Status
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Version</p>
                                    <p className="text-white font-black text-lg">2.0.5 (Secured)</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Database</p>
                                    <p className="text-green-500 font-black text-xs uppercase tracking-widest flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" /> Manila Central Node
                                    </p>
                                </div>
                            </div>
                        </section>
                    </div>
                </div>

                {/* --- SECURE PASSWORD MODAL --- */}
                {showPassModal && (
                    <div className="fixed inset-0 z-[160] flex items-center justify-center bg-gray-950/60 backdrop-blur-md p-4">
                        <div className="bg-white rounded-[2.5rem] p-6 md:p-10 w-full max-w-md shadow-2xl overflow-y-auto max-h-[90vh] custom-scrollbar">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-2 text-gray-900">
                                    <Lock className="text-orange-600" /> Secure Update
                                </h2>
                                <button onClick={() => setShowPassModal(false)} className="text-gray-400 hover:text-gray-900"><X size={24} /></button>
                            </div>

                            {status.msg && (
                                <div className={`mb-6 p-4 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 ${status.type === 'success' ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                                    {status.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
                                    {status.msg}
                                </div>
                            )}

                            <form onSubmit={handleUpdatePassword} className="space-y-4">
                                {/* Current Password */}
                                <div>
                                    <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Current Password</label>
                                    <div className="relative">
                                        <input
                                            required
                                            type={showCurrent ? "text" : "password"}
                                            placeholder="••••••••"
                                            className="w-full bg-gray-50 p-4 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 font-bold text-sm pr-12"
                                            value={passwords.current}
                                            onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowCurrent(!showCurrent)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-orange-500 transition-colors"
                                        >
                                            {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>

                                {/* New Password */}
                                <div>
                                    <label className="text-[9px] font-black text-gray-400 uppercase ml-1">New Strong Password</label>
                                    <div className="relative">
                                        <input
                                            required
                                            type={showNew ? "text" : "password"}
                                            placeholder="••••••••"
                                            className="w-full bg-gray-50 p-4 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 font-bold text-sm pr-12"
                                            value={passwords.new}
                                            onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowNew(!showNew)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-orange-500 transition-colors"
                                        >
                                            {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 mt-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                                        <Requirement label="8+ Chars" met={requirements.length} />
                                        <Requirement label="Uppercase" met={requirements.upper} />
                                        <Requirement label="Number" met={requirements.number} />
                                        <Requirement label="Symbol" met={requirements.special} />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Confirm New Password</label>
                                    <input
                                        required
                                        type={showNew ? "text" : "password"}
                                        placeholder="••••••••"
                                        className="w-full bg-gray-50 p-4 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 font-bold text-sm"
                                        value={passwords.confirm}
                                        onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                                    />
                                    {passwords.confirm && !passwordsMatch && <p className="text-[9px] text-red-500 font-black uppercase mt-1 ml-1">Passwords do not match</p>}
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading || !isStrongEnough || !passwordsMatch}
                                    className="w-full py-5 bg-orange-600 hover:bg-orange-700 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl mt-4 transition-all active:scale-95 disabled:opacity-30 disabled:grayscale"
                                >
                                    {loading ? <RefreshCcw className="animate-spin mx-auto" size={20} /> : 'Save New Credentials'}
                                </button>
                            </form>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}

function Requirement({ label, met }) {
    return (
        <div className={`flex items-center gap-2 text-[8px] font-black uppercase ${met ? 'text-green-600' : 'text-gray-300 transition-colors'}`}>
            <Check size={10} className={met ? 'opacity-100 scale-110' : 'opacity-20'} /> {label}
        </div>
    );
}