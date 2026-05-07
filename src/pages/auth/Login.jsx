import { useState } from 'react';
import { supabase } from "../../supabaseClient";
import { useNavigate } from 'react-router-dom';
import { LogIn, Mail, Lock, AlertCircle } from 'lucide-react';
import logoImg from '../../assets/LOGO NO BG.png';

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
        <div className="min-h-screen flex items-center justify-center bg-gray-950 relative overflow-hidden font-sans">

            {/* Background Glows */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-600/10 rounded-full blur-[120px]" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-orange-900/10 rounded-full blur-[120px]" />

            <div className="w-full max-w-md px-6 z-10">
                <div className="bg-gray-900/50 backdrop-blur-2xl border border-white/5 rounded-[3rem] p-10 shadow-2xl">

                    {/* Logo Section */}
                    <div className="flex flex-col items-center mb-10">
                        <div className="w-20 h-20 rounded-full bg-white p-2 shadow-2xl mb-6">
                            <img
                                src={logoImg}
                                alt="Samgyup King Logo"
                                className="w-full h-full object-contain"
                            />
                        </div>
                        <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic">
                            Welcome <span className="text-orange-500 text-3xl">Back</span>
                        </h1>
                        <p className="text-gray-500 text-[10px] font-black mt-2 uppercase tracking-[0.3em]">
                            Sign in to your account
                        </p>
                    </div>

                    {/* Login Form */}
                    <form className="space-y-4" onSubmit={handleLogin}>

                        {errorMsg && (
                            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-center gap-3 text-red-400 text-xs animate-in fade-in slide-in-from-top-1">
                                <AlertCircle size={16} />
                                <p className="font-bold uppercase tracking-wide">{errorMsg}</p>
                            </div>
                        )}

                        <div className="space-y-3">
                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-orange-500 transition-colors" size={18} />
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-gray-600 focus:outline-none focus:border-orange-500/50 transition-all text-sm font-medium"
                                    placeholder="Email Address"
                                />
                            </div>

                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-orange-500 transition-colors" size={18} />
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-gray-600 focus:outline-none focus:border-orange-500/50 transition-all text-sm font-medium"
                                    placeholder="Password"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-orange-600 hover:bg-orange-500 text-white font-black uppercase tracking-widest py-5 rounded-2xl shadow-xl shadow-orange-900/20 transition-all active:scale-95 disabled:opacity-50 mt-6 flex items-center justify-center gap-3"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <span className="text-xs">Sign In</span>
                                    <LogIn size={18} />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Footer Links */}
                    <div className="mt-10 flex flex-col items-center gap-4">
                        <button
                            onClick={() => navigate('/')}
                            className="text-[9px] font-black text-gray-600 uppercase tracking-widest hover:text-orange-500 transition-colors"
                        >
                            Back to Home
                        </button>
                    </div>
                </div>
            </div>

            <p className="absolute bottom-8 left-1/2 -translate-x-1/2 text-[9px] font-black text-gray-800 uppercase tracking-[0.5em]">
                Samgyup King Philippines
            </p>
        </div>
    );
}