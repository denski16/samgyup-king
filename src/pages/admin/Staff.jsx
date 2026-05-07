import { useState, useEffect } from 'react';
import { supabase } from "../../supabaseClient";
import AdminSidebar from "../../components/AdminSidebar";
import {
    Users, UserPlus, Pencil, Trash2, X,
    Lock, Mail, Check, ShieldCheck, AlertCircle, Phone,
    PartyPopper, ArrowRight
} from 'lucide-react';
import bcrypt from 'bcryptjs';

export default function Staff() {
    const branchOptions = ['SUBIC', 'MINIMART', 'CASTILLEJOS', 'KSK VARIETY'];

    const [staff, setStaff] = useState([]);
    const [loading, setLoading] = useState(true);

    const [showModal, setShowModal] = useState(false);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    const [isEditing, setIsEditing] = useState(false);
    const [currentId, setCurrentId] = useState(null);
    const [managerPassword, setManagerPassword] = useState('');

    const initialForm = {
        first_name: '',
        last_name: '',
        role: 'Staff',
        branches: [],
        contact_number: '',
        status: 'Active',
        email: '',
        password: ''
    };
    const [formData, setFormData] = useState(initialForm);

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
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .neq('role', 'client')
            .order('last_name', { ascending: true });

        if (!error) setStaff(data || []);
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
        const { error } = await supabase.from('profiles').delete().eq('id', currentId);
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
            const { data: { user: adminUser } } = await supabase.auth.getUser();
            const { data: manager } = await supabase
                .from('profiles')
                .select('password')
                .eq('id', adminUser.id)
                .single();

            const isAuthorized = await bcrypt.compare(managerPassword, manager.password);
            if (!isAuthorized) {
                setLoading(false);
                setManagerPassword('');
                setShowAuthModal(false);
                setShowErrorModal(true);
                return;
            }

            if (isEditing) {
                let updateData = {
                    first_name: formData.first_name,
                    last_name: formData.last_name,
                    branches: formData.branches,
                    contact_number: formData.contact_number,
                    status: formData.status
                };

                if (formData.password) {
                    const salt = await bcrypt.genSalt(10);
                    updateData.password = await bcrypt.hash(formData.password, salt);
                }

                const { error } = await supabase.from('profiles').update(updateData).eq('id', currentId);
                if (error) throw error;

                setShowAuthModal(false);
                setShowModal(false);
                fetchStaff();

            } else {
                const { data: authData, error: authError } = await supabase.auth.signUp({
                    email: formData.email,
                    password: formData.password,
                });

                if (authError) throw authError;

                const salt = await bcrypt.genSalt(10);
                const hashedPassword = await bcrypt.hash(formData.password, salt);

                const { error: profileError } = await supabase.from('profiles').insert([{
                    id: authData.user.id,
                    email: formData.email,
                    first_name: formData.first_name,
                    last_name: formData.last_name,
                    role: 'Staff',
                    branches: formData.branches,
                    contact_number: formData.contact_number,
                    status: 'Active',
                    password: hashedPassword
                }]);

                if (profileError) throw profileError;

                setShowAuthModal(false);
                setShowModal(false);
                setShowSuccessModal(true);
                fetchStaff();
            }
        } catch (error) {
            alert(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen bg-gray-50 text-gray-900 font-sans">
            <AdminSidebar />

            {/* RESPONSIVE UPGRADE: pt-20 for menu clearance, p-4 on mobile */}
            <main className="flex-1 p-4 pt-20 md:p-8 w-full max-w-[100vw] overflow-x-hidden">

                {/* RESPONSIVE HEADER */}
                <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 md:mb-10 gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-gray-900 italic">
                            Team <span className="text-orange-600 font-black">King</span> Directory
                        </h1>
                        <p className="text-sm md:text-base text-gray-500 font-medium italic">Manage branch assignments and portal access.</p>
                    </div>
                    {/* Full width button on mobile */}
                    <button onClick={openAddModal} className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700 text-white px-6 py-4 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-orange-900/20 transition-all active:scale-95">
                        <UserPlus size={18} /> Register Staff
                    </button>
                </header>

                {/* RESPONSIVE TABLE CONTAINER */}
                <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden w-full">
                    <div className="overflow-x-auto custom-scrollbar w-full">
                        <table className="w-full text-left border-collapse min-w-[900px]">
                            <thead className="bg-gray-900 text-white text-[9px] md:text-[10px] uppercase tracking-[0.2em]">
                                <tr>
                                    <th className="p-4 md:p-6">Full Name</th>
                                    <th className="p-4 md:p-6">Role</th>
                                    <th className="p-4 md:p-6">Branches</th>
                                    <th className="p-4 md:p-6">Email / Login</th>
                                    <th className="p-4 md:p-6 text-center">Status</th>
                                    <th className="p-4 md:p-6 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-xs md:text-sm">
                                {loading ? (
                                    <tr><td colSpan="6" className="p-20 text-center text-gray-400 font-black animate-pulse uppercase tracking-widest">Scanning Network...</td></tr>
                                ) : (
                                    staff.map((member) => (
                                        <tr key={member.id} className="hover:bg-orange-50/20 transition-colors group">
                                            <td className="p-4 md:p-6">
                                                <p className="font-black text-gray-900 uppercase tracking-tight">{member.first_name} {member.last_name}</p>
                                                <p className="text-[9px] md:text-[10px] font-bold text-gray-400 uppercase">{member.contact_number || 'No Contact'}</p>
                                            </td>
                                            <td className="p-4 md:p-6">
                                                <span className={`text-[9px] md:text-[10px] font-black uppercase px-2 py-1 rounded border ${member.role?.toLowerCase() === 'admin' ? 'border-orange-500 text-orange-600 bg-orange-50' : 'border-gray-200 text-gray-500'}`}>
                                                    {member.role}
                                                </span>
                                            </td>
                                            <td className="p-4 md:p-6">
                                                <div className="flex flex-wrap gap-1">
                                                    {member.branches?.map(b => (
                                                        <span key={b} className="bg-gray-100 text-gray-600 px-2 py-1 rounded-md text-[8px] md:text-[9px] font-black uppercase border border-gray-200 whitespace-nowrap">{b}</span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="p-4 md:p-6 text-gray-500 font-bold">{member.email}</td>
                                            <td className="p-4 md:p-6 text-center">
                                                <span className={`px-3 py-1 rounded-full font-black text-[8px] md:text-[9px] uppercase tracking-wider ${member.status === 'Active' ? 'bg-green-500 text-white shadow-sm' : 'bg-gray-400 text-white'}`}>
                                                    {member.status}
                                                </span>
                                            </td>
                                            <td className="p-4 md:p-6 text-center">
                                                <div className="flex justify-center gap-2">
                                                    <button onClick={() => openEditModal(member)} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all shadow-sm"><Pencil size={14} /></button>
                                                    <button onClick={() => triggerDelete(member.id)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition-all shadow-sm"><Trash2 size={14} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>

            {/* --- SUCCESS MODAL --- */}
            {showSuccessModal && (
                <div className="fixed inset-0 z-[170] flex items-center justify-center bg-gray-950/50 backdrop-blur-md p-4">
                    <div className="bg-white rounded-[2.5rem] md:rounded-[3rem] p-8 md:p-12 w-full max-w-sm shadow-2xl text-center border border-gray-100 animate-in zoom-in duration-300">
                        <div className="w-16 h-16 md:w-20 md:h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Check size={40} />
                        </div>
                        <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight mb-2 text-gray-900">Staff Added!</h2>
                        <p className="text-gray-500 text-[10px] md:text-xs mb-8 font-bold italic">Member registered successfully.</p>
                        <button onClick={() => setShowSuccessModal(false)} className="w-full bg-orange-600 hover:bg-orange-700 text-white font-black uppercase tracking-widest py-4 rounded-2xl shadow-lg transition-all active:scale-95 text-xs">Got it</button>
                    </div>
                </div>
            )}

            {/* --- FORM MODAL --- */}
            {showModal && (
                <div className="fixed inset-0 z-[160] flex items-center justify-center bg-gray-900/60 backdrop-blur-md p-4">
                    <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-10 w-full max-w-xl shadow-2xl overflow-y-auto max-h-[95vh] custom-scrollbar">
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight flex items-center gap-2">
                                <Users className="text-orange-600" /> {isEditing ? 'Update User' : 'New Registration'}
                            </h2>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-900 transition-colors"><X size={24} /></button>
                        </div>

                        <form onSubmit={handlePreSubmit} className="space-y-6 md:space-y-8">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <input required placeholder="First Name" className="w-full bg-gray-50 p-4 rounded-xl md:rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 font-bold border border-transparent text-sm" value={formData.first_name} onChange={(e) => setFormData({ ...formData, first_name: e.target.value })} />
                                <input required placeholder="Last Name" className="w-full bg-gray-50 p-4 rounded-xl md:rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 font-bold border border-transparent text-sm" value={formData.last_name} onChange={(e) => setFormData({ ...formData, last_name: e.target.value })} />
                            </div>
                            <input placeholder="Contact Number" className="w-full bg-gray-50 p-4 rounded-xl md:rounded-2xl outline-none font-bold text-sm" value={formData.contact_number} onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })} />

                            <div className="space-y-4">
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-orange-600">Branch Assignments</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {branchOptions.map(branch => (
                                        <button key={branch} type="button" onClick={() => toggleBranch(branch)} className={`p-3 rounded-xl border-2 flex items-center justify-between transition-all ${formData.branches.includes(branch) ? 'bg-orange-50 border-orange-500 text-orange-700 font-black' : 'bg-white border-gray-100 text-gray-400 font-bold'}`}>
                                            <span className="text-[9px] uppercase">{branch}</span>
                                            {formData.branches.includes(branch) && <Check size={14} />}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-orange-600">Login Access</h3>
                                <input required type="email" placeholder="Email" className="w-full bg-gray-50 p-4 rounded-xl md:rounded-2xl outline-none font-bold text-sm" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                                <input type="password" placeholder={isEditing ? "New Password (Optional)" : "Password"} className="w-full bg-gray-50 p-4 rounded-xl md:rounded-2xl outline-none font-bold text-sm" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} />

                                {(formData.password.length > 0 || !isEditing) && (
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-4 bg-gray-50 rounded-2xl">
                                        <Requirement label="8+ Chars" met={strength.length} />
                                        <Requirement label="Upper" met={strength.upper} />
                                        <Requirement label="Num" met={strength.number} />
                                        <Requirement label="Spec" met={strength.special} />
                                    </div>
                                )}
                            </div>

                            <button type="submit" className="w-full p-5 bg-orange-600 hover:bg-orange-700 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl transition-all active:scale-95 text-xs">
                                {isEditing ? 'Update Profile' : 'Register Member'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* --- AUTH MODAL --- */}
            {showAuthModal && (
                <div className="fixed inset-0 z-[170] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 text-white">
                    <div className="bg-gray-900 rounded-[2rem] md:rounded-[2.5rem] p-8 md:p-10 w-full max-w-sm border border-white/10 text-center">
                        <ShieldCheck size={48} className="mx-auto mb-6 text-orange-500" />
                        <h2 className="text-lg md:text-xl font-black uppercase tracking-tight text-white mb-2">Authorization</h2>
                        <p className="text-gray-400 text-xs mb-8 italic">Verify manager password.</p>
                        <form onSubmit={handleFinalSubmit} className="space-y-4">
                            <input required autoFocus type="password" placeholder="Password" className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none font-bold text-white focus:border-orange-500 text-center" value={managerPassword} onChange={(e) => setManagerPassword(e.target.value)} />
                            <div className="flex gap-3">
                                <button type="button" onClick={() => setShowAuthModal(false)} className="flex-1 py-4 bg-white/5 rounded-xl font-bold uppercase text-[9px] text-white">Cancel</button>
                                <button type="submit" disabled={loading} className="flex-1 py-4 bg-orange-600 rounded-xl font-black uppercase text-[9px] text-white">
                                    {loading ? '...' : 'Verify'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* --- DELETE MODAL --- */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-[180] flex items-center justify-center bg-black/60 p-4 text-gray-900">
                    <div className="bg-white rounded-[2rem] p-8 w-full max-w-sm shadow-2xl text-center">
                        <Trash2 size={32} className="mx-auto mb-4 text-red-500" />
                        <h3 className="text-lg md:text-xl font-black mb-2">Remove Staff?</h3>
                        <p className="text-gray-500 mb-6 text-xs font-medium italic">Action cannot be undone.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setShowDeleteModal(false)} className="flex-1 py-3 bg-gray-100 font-bold rounded-xl text-gray-900 text-xs">Cancel</button>
                            <button onClick={confirmDelete} className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl text-xs">Remove</button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- ERROR MODAL --- */}
            {showErrorModal && (
                <div className="fixed inset-0 z-[190] flex items-center justify-center bg-black/60 p-4 text-gray-900">
                    <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] p-8 w-full max-w-sm shadow-2xl text-center border-t-8 border-red-500">
                        <AlertCircle size={32} className="mx-auto mb-4 text-red-600" />
                        <h3 className="text-lg md:text-xl font-black uppercase tracking-tight mb-2 text-red-600">Failed</h3>
                        <p className="text-gray-500 mb-6 text-xs font-bold italic">Incorrect password.</p>
                        <button onClick={() => { setShowErrorModal(false); setShowAuthModal(true); }} className="w-full py-4 bg-gray-900 text-white font-black uppercase text-xs tracking-widest rounded-xl">Retry</button>
                    </div>
                </div>
            )}
        </div>
    );
}

function Requirement({ label, met }) {
    return (
        <div className={`flex items-center gap-1.5 text-[8px] font-black uppercase ${met ? 'text-green-600' : 'text-gray-300'}`}>
            <Check size={10} className={met ? 'opacity-100' : 'opacity-20'} /> {label}
        </div>
    );
}