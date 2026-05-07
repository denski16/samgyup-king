import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { LogIn, Mail, Lock, AlertCircle } from 'lucide-react';
import logoImg from '../assets/LOGO NO BG.png';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg('');

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            setErrorMsg(error.message);
        } else {
            navigate('/dashboard');
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0f0f0f] relative overflow-hidden">

            {/* Decorative Background Elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-600/20 rounded-full blur-[120px]" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-red-600/10 rounded-full blur-[120px]" />

            <div className="w-full max-w-md px-6 z-10">
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-10 shadow-2xl">

                    {/* Logo Section */}
                    <div className="flex flex-col items-center mb-10">
                        <div className="w-24 h-24 rounded-full bg-white p-2 shadow-xl mb-4 border-4 border-orange-500/30">
                            <img
                                src={logoImg}
                                alt="Samgyup King Logo"
                                className="w-full h-full object-contain"
                            />
                        </div>
                        <h1 className="text-3xl font-black text-white tracking-tighter uppercase italic">
                            Samgyup <span className="text-orange-500">King</span>
                        </h1>
                        <p className="text-gray-400 text-sm font-medium mt-1 uppercase tracking-widest">
                            Management Portal
                        </p>
                    </div>

                    {/* Login Form */}
                    <form className="space-y-5" onSubmit={handleLogin}>

                        {errorMsg && (
                            <div className="bg-red-500/10 border border-red-500/50 rounded-2xl p-4 flex items-center gap-3 text-red-400 text-sm animate-shake">
                                <AlertCircle size={18} />
                                <p className="font-bold uppercase tracking-tight">{errorMsg}</p>
                            </div>
                        )}

                        <div className="space-y-4">
                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-orange-500 transition-colors" size={20} />
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all text-sm font-medium"
                                    placeholder="Email Address"
                                />
                            </div>

                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-orange-500 transition-colors" size={20} />
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all text-sm font-medium"
                                    placeholder="Password"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white font-black uppercase tracking-[0.15em] py-4 rounded-2xl shadow-lg shadow-orange-900/30 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 mt-4 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <LogIn size={20} />
                                    <span>LOGIN</span>
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 text-center">
                        <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">
                            Strictly for Authorized Personnel
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}