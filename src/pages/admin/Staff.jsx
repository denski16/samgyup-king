import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import Sidebar from '../components/Sidebar';
import {
    Users, UserPlus, Pencil, Trash2, X,
    Lock, Mail, Check, ShieldCheck, AlertCircle, Phone
} from 'lucide-react';
import bcrypt from 'bcryptjs';

export default function Staff() {
    const branchOptions = ['SUBIC', 'MINIMART', 'CASTILLEJOS', 'KSK VARIETY'];

    const [staff, setStaff] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modal Visibility States
    const [showModal, setShowModal] = useState(false);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showErrorModal, setShowErrorModal] = useState(false);

    const [isEditing, setIsEditing] = useState(false);
    const [currentId, setCurrentId] = useState(null);
    const [managerPassword, setManagerPassword] = useState('');

    const initialForm = {
        first_name: '',
        last_name: '',
        role: 'Staff',
        branches: [],
        contact_number: '', // The number is back
        status: 'Active',
        email: '',
        password: ''
    };
    const [formData, setFormData] = useState(initialForm);

    // --- PASSWORD STRENGTH CHECKER ---
    const validatePassword = (pass) => {
        return {
            length: pass.length >= 8,
            upper: /[A-Z]/.test(pass),
            number: /[0-9]/.test(pass),
            special: /[@$!%*?&]/.test(pass)
        };
    };

    const strength = validatePassword(formData.password);
    const isPassStrong = Object.values(strength).every(Boolean);

    useEffect(() => { fetchStaff(); }, []);

    async function fetchStaff() {
        setLoading(true);
        const { data } = await supabase.from('staff').select('*').order('last_name', { ascending: true });
        setStaff(data || []);
        setLoading(false);
    }

    const toggleBranch = (branch) => {
        const currentBranches = [...formData.branches];
        if (currentBranches.includes(branch)) {
            setFormData({ ...formData, branches: currentBranches.filter(b => b !== branch) });
        } else {
            setFormData({ ...formData, branches: [...currentBranches, branch] });
        }
    };

    const openAddModal = () => {
        setIsEditing(false);
        setFormData(initialForm);
        setManagerPassword('');
        setShowModal(true);
    };

    const openEditModal = (member) => {
        setIsEditing(true);
        setCurrentId(member.id);
        setFormData({ ...member, password: '' });
        setManagerPassword('');
        setShowModal(true);
    };

    const triggerDelete = (id) => {
        setCurrentId(id);
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        const { error } = await supabase.from('staff').delete().eq('id', currentId);
        if (error) alert(error.message);
        setShowDeleteModal(false);
        fetchStaff();
    };

    const handlePreSubmit = (e) => {
        e.preventDefault();
        if (!isEditing || formData.password.length > 0) {
            if (!isPassStrong) return;
        }
        if (formData.branches.length === 0) {
            alert("Please select at least one branch assignment.");
            return;
        }
        setShowAuthModal(true);
    };

    const handleFinalSubmit = async (e) => {
        e.preventDefault();
        if (!managerPassword) return;

        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("No active session found.");

            const { data: manager } = await supabase
                .from('staff')
                .select('password')
                .eq('email', user.email)
                .maybeSingle();

            if (!manager) throw new Error("Manager profile not found in Staff table.");

            const isAuthorized = await bcrypt.compare(managerPassword, manager.password);

            if (!isAuthorized) {
                setLoading(false);
                setManagerPassword('');
                setShowAuthModal(false);
                setShowErrorModal(true); // Custom error modal triggers here
                return;
            }

            // Duplicate Email Check
            const { data: existingStaff } = await supabase
                .from('staff')
                .select('id, email')
                .eq('email', formData.email)
                .maybeSingle();

            if (existingStaff && (!isEditing || existingStaff.id !== currentId)) {
                alert(`The email "${formData.email}" is already used by another staff.`);
                setLoading(false);
                setShowAuthModal(false);
                return;
            }

            let submissionData = { ...formData };
            if (formData.password) {
                const salt = await bcrypt.genSalt(10);
                submissionData.password = await bcrypt.hash(formData.password, salt);
            } else if (isEditing) {
                delete submissionData.password;
            }

            const { error } = isEditing
                ? await supabase.from('staff').update(submissionData).eq('id', currentId)
                : await supabase.from('staff').insert([submissionData]);

            if (error) throw error;

            setShowAuthModal(false);
            setShowModal(false);
            fetchStaff();
        } catch (error) {
            alert(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen bg-gray-50 text-gray-900 font-sans">
            <Sidebar />
            <main className="flex-1 p-8 overflow-x-auto">
                <header className="flex justify-between items-start mb-10">
                    <div>
                        <h1 className="text-3xl font-black uppercase tracking-tight text-gray-900">Staff Management</h1>
                        <p className="text-gray-500 font-medium italic">Manage multiple branch assignments and login access.</p>
                    </div>
                    <button onClick={openAddModal} className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-4 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center gap-2 shadow-xl shadow-orange-900/20 transition-all active:scale-95">
                        <UserPlus size={18} /> Add Staff Member
                    </button>
                </header>

                <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden min-w-[1000px]">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-900 text-white text-[10px] uppercase tracking-[0.2em]">
                            <tr>
                                <th className="p-6">Full Name</th>
                                <th className="p-6">Branches</th>
                                <th className="p-6">Email / Login</th>
                                <th className="p-6 text-center">Status</th>
                                <th className="p-6 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-sm">
                            {loading && !staff.length ? (
                                <tr><td colSpan="5" className="p-20 text-center text-gray-400 font-black animate-pulse uppercase tracking-[0.3em]">Loading Team Data...</td></tr>
                            ) : staff.map((member) => (
                                <tr key={member.id} className="hover:bg-orange-50/20 transition-colors group">
                                    <td className="p-6">
                                        <p className="font-black text-gray-900 uppercase tracking-tight">{member.first_name} {member.last_name}</p>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase">{member.contact_number || 'No Contact'}</p>
                                    </td>
                                    <td className="p-6">
                                        <div className="flex flex-wrap gap-1">
                                            {member.branches?.map(b => (
                                                <span key={b} className="bg-gray-100 text-gray-600 px-2 py-1 rounded-md text-[9px] font-black uppercase border border-gray-200">{b}</span>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="p-6 text-gray-500 font-bold">
                                        <div className="flex items-center gap-2">
                                            <Mail size={14} className="text-orange-500" /> {member.email || 'No Access'}
                                        </div>
                                    </td>
                                    <td className="p-6 text-center">
                                        <span className={`px-3 py-1 rounded-full font-black text-[9px] uppercase tracking-wider ${member.status === 'Active' ? 'bg-green-500 text-white' : 'bg-gray-400 text-white'}`}>
                                            {member.status}
                                        </span>
                                    </td>
                                    <td className="p-6 text-center">
                                        <div className="flex justify-center gap-2">
                                            <button onClick={() => openEditModal(member)} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all"><Pencil size={14} /></button>
                                            <button onClick={() => triggerDelete(member.id)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition-all"><Trash2 size={14} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </main>

            {/* --- MAIN STAFF FORM MODAL --- */}
            {showModal && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-gray-900/60 backdrop-blur-md p-4 text-gray-900">
                    <div className="bg-white rounded-[2.5rem] p-10 w-full max-w-xl shadow-2xl overflow-y-auto max-h-[95vh]">
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-2xl font-black uppercase tracking-tight flex items-center gap-2">
                                <Users className="text-orange-600" /> {isEditing ? 'Edit Profile' : 'New Staff'}
                            </h2>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-900"><X size={24} /></button>
                        </div>

                        <form onSubmit={handlePreSubmit} className="space-y-8">
                            {/* Personal Info */}
                            <section className="space-y-4">
                                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-orange-600 border-b border-orange-100 pb-2">Personal Information</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <input required placeholder="First Name" className="w-full bg-gray-50 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 font-bold border border-transparent" value={formData.first_name} onChange={(e) => setFormData({ ...formData, first_name: e.target.value })} />
                                    <input required placeholder="Last Name" className="w-full bg-gray-50 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 font-bold border border-transparent" value={formData.last_name} onChange={(e) => setFormData({ ...formData, last_name: e.target.value })} />
                                </div>
                                <div className="relative">
                                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                                    <input placeholder="Contact Number" className="w-full bg-gray-50 pl-12 p-4 rounded-2xl outline-none font-bold" value={formData.contact_number} onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })} />
                                </div>
                            </section>

                            {/* Branch Selection */}
                            <section className="space-y-4">
                                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-orange-600 border-b border-orange-100 pb-2">Branch Assignments</h3>
                                <div className="grid grid-cols-2 gap-2">
                                    {branchOptions.map(branch => (
                                        <button key={branch} type="button" onClick={() => toggleBranch(branch)} className={`p-3 rounded-xl border-2 flex items-center justify-between transition-all ${formData.branches.includes(branch) ? 'bg-orange-50 border-orange-500 text-orange-700 font-black' : 'bg-white border-gray-100 text-gray-400 font-bold'}`}>
                                            <span className="text-[10px] uppercase tracking-widest">{branch}</span>
                                            {formData.branches.includes(branch) && <Check size={14} />}
                                        </button>
                                    ))}
                                </div>
                            </section>

                            <section className="space-y-4">
                                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-orange-600 border-b border-orange-100 pb-2">Staff Login Access</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <input required type="email" placeholder="Email Address" className="w-full bg-gray-50 p-4 rounded-2xl outline-none font-bold" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                                    <input type="password" placeholder={isEditing ? "New Password" : "Password"} className="w-full bg-gray-50 p-4 rounded-2xl outline-none font-bold" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} />
                                </div>

                                {/* Password Requirements Checklist */}
                                {(formData.password.length > 0 || !isEditing) && (
                                    <div className="grid grid-cols-2 gap-y-2 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                        <Requirement label="8+ Characters" met={strength.length} />
                                        <Requirement label="1 Uppercase" met={strength.upper} />
                                        <Requirement label="1 Number" met={strength.number} />
                                        <Requirement label="1 Symbol (@$!%*?&)" met={strength.special} />
                                    </div>
                                )}
                            </section>

                            <button type="submit" className="w-full p-5 bg-orange-600 hover:bg-orange-700 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl transition-all active:scale-95">
                                {isEditing ? 'Review Changes' : 'Complete Registration'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* --- POPUP AUTHORIZATION MODAL --- */}
            {showAuthModal && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 text-white">
                    <div className="bg-gray-900 rounded-[2.5rem] p-10 w-full max-w-sm shadow-2xl border border-white/10 text-center animate-in zoom-in duration-200">
                        <div className="w-16 h-16 bg-orange-600/20 text-orange-500 rounded-full flex items-center justify-center mx-auto mb-6">
                            <ShieldCheck size={32} />
                        </div>
                        <h2 className="text-xl font-black uppercase tracking-tight mb-2 text-white">Manager Approval</h2>
                        <p className="text-gray-400 text-sm mb-8">Enter your login password to authorize this database change.</p>

                        <form onSubmit={handleFinalSubmit} className="space-y-4">
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={18} />
                                <input required autoFocus type="password" placeholder="Manager Password" className="w-full bg-white/5 border border-white/10 pl-12 p-4 rounded-2xl outline-none font-bold text-white focus:border-orange-500 transition-all placeholder:text-gray-600" value={managerPassword} onChange={(e) => setManagerPassword(e.target.value)} />
                            </div>
                            <div className="flex gap-3">
                                <button type="button" onClick={() => setShowAuthModal(false)} className="flex-1 py-4 bg-white/5 hover:bg-white/10 rounded-xl font-bold uppercase text-[10px] tracking-widest transition-colors text-white">Cancel</button>
                                <button type="submit" disabled={loading} className="flex-1 py-4 bg-orange-600 hover:bg-orange-700 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-orange-900/20 disabled:bg-gray-700 text-white">
                                    {loading ? 'Verifying...' : 'Authorize'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* --- ERROR MODAL (Access Denied) --- */}
            {showErrorModal && (
                <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 text-gray-900">
                    <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-sm shadow-2xl text-center border-t-8 border-red-500 animate-in zoom-in duration-200">
                        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertCircle size={32} />
                        </div>
                        <h3 className="text-xl font-black uppercase tracking-tight mb-2 text-red-600">Access Denied</h3>
                        <p className="text-gray-500 mb-6 text-sm font-bold italic">The manager password you entered is incorrect. This change has been blocked for security.</p>
                        <button onClick={() => { setShowErrorModal(false); setShowAuthModal(true); }} className="w-full py-4 bg-gray-900 text-white font-black uppercase text-xs tracking-widest rounded-xl hover:bg-gray-800 transition-all">
                            Try Again
                        </button>
                    </div>
                </div>
            )}

            {/* --- DELETE MODAL --- */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/60 p-4 text-gray-900">
                    <div className="bg-white rounded-[2rem] p-8 w-full max-w-sm shadow-2xl text-center">
                        <Trash2 size={32} className="mx-auto mb-4 text-red-500" />
                        <h3 className="text-xl font-black mb-2 text-gray-900">Remove Record?</h3>
                        <p className="text-gray-500 mb-6 text-sm font-medium italic">This will permanently remove the staff member from the system.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setShowDeleteModal(false)} className="flex-1 py-3 bg-gray-100 font-bold rounded-xl text-gray-900">Cancel</button>
                            <button onClick={confirmDelete} className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl">Yes, Remove</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function Requirement({ label, met }) {
    return (
        <div className={`flex items-center gap-2 text-[9px] font-black uppercase tracking-tighter ${met ? 'text-green-600' : 'text-gray-300'}`}>
            <div className={`w-3 h-3 rounded-full flex items-center justify-center ${met ? 'bg-green-100' : 'bg-gray-100'}`}>
                {met && <Check size={8} strokeWidth={4} />}
            </div>
            {label}
        </div>
    );
}