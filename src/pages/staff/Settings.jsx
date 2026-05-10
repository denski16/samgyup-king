import { useState, useEffect } from 'react';
import { supabase } from "../../supabaseClient";
import StaffSidebar from "../../components/StaffSidebar";
import {
    ShieldCheck,
    Lock,
    Check,
    X,
    RefreshCcw,
    AlertCircle,
    Store,
    Info,
    Eye,
    EyeOff
} from 'lucide-react';
import bcrypt from 'bcryptjs';

export default function StaffSettings() {
    const [loading, setLoading] = useState(false);
    const [showPassModal, setShowPassModal] = useState(false);
    const [staffProfile, setStaffProfile] = useState(null);

    // Visibility States
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);

    // Password Form State
    const [passwords, setPasswords] = useState({
        current: '',
        new: '',
        confirm: ''
    });

    const [status, setStatus] = useState({ type: '', msg: '' });

    // Strength Validation
    const validatePassword = (pass) => {
        return {
            length: pass.length >= 8,
            upper: /[A-Z]/.test(pass),
            number: /[0-9]/.test(pass),
            special: /[@$!%*?&]/.test(pass)
        };
    };

    const requirements = validatePassword(passwords.new);
    const isStrongEnough = Object.values(requirements).every(Boolean);
    const passwordsMatch = passwords.new === passwords.confirm && passwords.new !== '';

    useEffect(() => {
        fetchStaffProfile();
    }, []);

    async function fetchStaffProfile() {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
            setStaffProfile(data);
        }
    }

    const handleUpdatePassword = async (e) => {
        e.preventDefault();
        if (!isStrongEnough || !passwordsMatch) return;

        setLoading(true);
        setStatus({ type: '', msg: '' });

        try {
            // 1. Verify current password
            const isAuthorized = await bcrypt.compare(passwords.current, staffProfile.password);
            if (!isAuthorized) {
                setStatus({ type: 'error', msg: 'Current password is incorrect.' });
                setLoading(false);
                return;
            }

            // 2. Update Supabase Auth
            const { error: authError } = await supabase.auth.updateUser({ password: passwords.new });
            if (authError) throw authError;

            // 3. Update Profiles Table (Hashed)
            const salt = await bcrypt.genSalt(10);
            const newHashedPassword = await bcrypt.hash(passwords.new, salt);
            const { error: profileError } = await supabase
                .from('profiles')
                .update({ password: newHashedPassword })
                .eq('id', staffProfile.id);

            if (profileError) throw profileError;

            setStatus({ type: 'success', msg: 'Password updated successfully!' });
            setPasswords({ current: '', new: '', confirm: '' });
            setTimeout(() => setShowPassModal(false), 2000);
            fetchStaffProfile(); // Refresh local data
        } catch (error) {
            setStatus({ type: 'error', msg: error.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen bg-gray-50 text-gray-900 font-sans">
            <StaffSidebar />

            {/* RESPONSIVE UPGRADE: Keeps pt-24 until xl: breakpoint where sidebar docks */}
            <main className="flex-1 p-4 pt-24 md:p-6 md:pt-24 xl:p-8 overflow-y-auto w-full max-w-[100vw] overflow-x-hidden">
                <header className="mb-8 md:mb-10">
                    <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight">Profile <span className="text-orange-600">Settings</span></h1>
                    <p className="text-sm md:text-base text-gray-500 font-medium italic mt-1">Manage your security and view assigned locations.</p>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 max-w-5xl">

                    {/* SECURITY CARD */}
                    <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 xl:p-10 shadow-sm border border-gray-100 flex flex-col justify-between">
                        <section>
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-600 mb-6 flex items-center gap-2">
                                <ShieldCheck size={16} /> Security Credentials
                            </h3>
                            <div className="mb-8">
                                <p className="text-sm font-black text-gray-900 uppercase tracking-tight">Staff Account</p>
                                <p className="text-xs text-gray-500 font-medium italic mt-1">{staffProfile?.email}</p>
                            </div>
                            <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100 flex gap-3 mb-8">
                                <Info className="text-orange-600 shrink-0" size={18} />
                                <p className="text-[10px] text-orange-700 font-bold uppercase leading-relaxed">
                                    Updating your password here will sync your login for all branch portals.
                                </p>
                            </div>
                        </section>

                        <button
                            onClick={() => setShowPassModal(true)}
                            className="w-full md:w-fit px-8 py-4 bg-gray-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-orange-600 transition-all shadow-xl active:scale-95"
                        >
                            Change Password
                        </button>
                    </div>

                    {/* ASSIGNED BRANCHES CARD */}
                    <div className="bg-gray-900 rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 xl:p-10 shadow-2xl relative overflow-hidden flex flex-col justify-between">
                        <Store size={120} className="absolute -bottom-10 -right-10 text-white/5 rotate-12 pointer-events-none" />

                        <div>
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-500 mb-6 flex items-center gap-2 relative z-10">
                                <Store size={16} /> Assigned Branches
                            </h3>

                            <div className="flex flex-wrap gap-2 relative z-10">
                                {staffProfile?.branches?.length > 0 ? (
                                    staffProfile.branches.map((br) => (
                                        <span key={br} className="px-4 py-2 bg-white/10 border border-white/10 rounded-xl text-white font-black text-[10px] uppercase tracking-widest">
                                            {br}
                                        </span>
                                    ))
                                ) : (
                                    <p className="text-gray-500 text-xs italic">No branches currently assigned.</p>
                                )}
                            </div>
                        </div>

                        <div className="mt-12 pt-6 border-t border-white/5 relative z-10">
                            <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest flex items-center gap-2">
                                <RefreshCcw size={10} /> Shift Synchronization Active
                            </p>
                        </div>
                    </div>
                </div>

                {/* --- PASSWORD MODAL --- */}
                {showPassModal && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-gray-950/60 backdrop-blur-md p-4">
                        <div className="bg-white rounded-[2.5rem] p-6 md:p-10 w-full max-w-md shadow-2xl animate-in zoom-in duration-200 overflow-y-auto max-h-[90vh] custom-scrollbar">
                            <div className="flex justify-between items-center mb-8">
                                <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
                                    <Lock className="text-orange-600" /> Security Update
                                </h2>
                                <button onClick={() => setShowPassModal(false)} className="text-gray-400 hover:text-gray-900 transition-colors"><X size={24} /></button>
                            </div>

                            {status.msg && (
                                <div className={`mb-6 p-4 rounded-xl text-[10px] font-black uppercase flex items-center gap-3 ${status.type === 'success' ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                                    {status.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
                                    {status.msg}
                                </div>
                            )}

                            <form onSubmit={handleUpdatePassword} className="space-y-4">
                                {/* Current */}
                                <div className="relative">
                                    <label className="text-[9px] font-black text-gray-400 uppercase ml-1 tracking-widest">Current Password</label>
                                    <div className="relative mt-1">
                                        <input required type={showCurrent ? "text" : "password"} className="w-full bg-gray-50 p-4 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 font-bold text-sm pr-12 transition-all border border-transparent focus:bg-white focus:border-orange-200" value={passwords.current} onChange={(e) => setPasswords({ ...passwords, current: e.target.value })} />
                                        <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-orange-600 transition-colors">
                                            {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>

                                {/* New Password */}
                                <div>
                                    <label className="text-[9px] font-black text-gray-400 uppercase ml-1 tracking-widest">New Strong Password</label>
                                    <div className="relative mt-1">
                                        <input required type={showNew ? "text" : "password"} className="w-full bg-gray-50 p-4 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 font-bold text-sm pr-12 transition-all border border-transparent focus:bg-white focus:border-orange-200" value={passwords.new} onChange={(e) => setPasswords({ ...passwords, new: e.target.value })} />
                                        <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-orange-600 transition-colors">
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

                                <div className="pt-2">
                                    <label className="text-[9px] font-black text-gray-400 uppercase ml-1 tracking-widest">Confirm New Password</label>
                                    <input required type={showNew ? "text" : "password"} className="w-full mt-1 bg-gray-50 p-4 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 font-bold text-sm transition-all border border-transparent focus:bg-white focus:border-orange-200" value={passwords.confirm} onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })} />
                                    {passwords.confirm && !passwordsMatch && <p className="text-[9px] text-red-500 font-black uppercase mt-2 ml-1 tracking-widest animate-pulse">Passwords mismatch</p>}
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading || !isStrongEnough || !passwordsMatch}
                                    className="w-full py-5 bg-orange-600 hover:bg-orange-700 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl mt-6 transition-all active:scale-95 disabled:opacity-30 disabled:grayscale flex items-center justify-center"
                                >
                                    {loading ? <RefreshCcw className="animate-spin" size={20} /> : 'Update Security'}
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
        <div className={`flex items-center gap-2 text-[8px] font-black uppercase tracking-widest transition-colors ${met ? 'text-green-600' : 'text-gray-400'}`}>
            <Check size={12} className={`transition-opacity ${met ? 'opacity-100' : 'opacity-30'}`} /> {label}
        </div>
    );
}