import { useNavigate } from 'react-router-dom';
import {
    ChevronRight,
    MapPin,
    Utensils,
    Flame,
    TrendingUp,
    Smartphone,
    Navigation
} from 'lucide-react';
import logoImg from '../assets/LOGO NO BG.png';

export default function Landing() {
    const navigate = useNavigate();

    const branchList = [
        { name: 'Subic Branch', loc: 'Subic Bay Freeport Zone' },
        { name: 'Castillejos Branch', loc: 'National Highway' }
    ];

    return (
        <div className="min-h-screen bg-gray-950 text-white font-sans selection:bg-orange-600/30">

            {/* --- TOP BAR --- */}
            <nav className="border-b border-white/5 sticky top-0 bg-gray-950/80 backdrop-blur-md z-[100]">
                <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <img src={logoImg} alt="Samgyup King" className="w-10 h-10" />
                        <span className="text-xl font-black uppercase tracking-tighter">
                            Samgyup<span className="text-orange-500">King</span>
                        </span>
                    </div>
                    <button
                        onClick={() => navigate('/login')}
                        className="text-[10px] font-black uppercase tracking-[0.2em] px-6 py-3 border border-white/10 rounded-full hover:bg-white hover:text-gray-950 transition-all"
                    >
                        Login
                    </button>
                </div>
            </nav>

            {/* --- HERO SECTION --- */}
            <header className="relative max-w-7xl mx-auto px-6 py-20 lg:py-32 grid lg:grid-cols-2 gap-16 items-center overflow-hidden">
                <div className="absolute top-0 left-0 w-64 h-64 bg-orange-600/10 rounded-full blur-[120px] -z-10"></div>

                <div className="space-y-8">
                    <div className="inline-block px-4 py-1.5 bg-orange-600 text-white text-[10px] font-black uppercase tracking-[0.3em] rounded-full shadow-lg shadow-orange-900/20">
                        Unlimited Grill
                    </div>
                    <h1 className="text-6xl lg:text-8xl font-black uppercase tracking-tighter leading-[0.9]">
                        The Real <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600">SAMGYUP King</span> <br />
                        is Here.
                    </h1>
                    <p className="text-lg text-gray-400 font-medium max-w-md leading-relaxed">
                        Join us for an authentic Korean BBQ experience. High-quality meats, fresh side dishes, and the best grill atmosphere in the region.
                    </p>
                    <div className="flex gap-4">
                        <a href="#branches" className="bg-white text-gray-950 px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center gap-3 hover:bg-orange-500 hover:text-white transition-all">
                            Our Branches <Navigation size={16} />
                        </a>
                    </div>
                </div>

                <div className="relative">
                    <div className="aspect-square rounded-[3rem] bg-gray-900/50 border border-white/10 shadow-2xl flex items-center justify-center overflow-hidden group">
                        <img
                            src={logoImg}
                            alt="Samgyup King Branding"
                            className="w-3/4 h-3/4 object-contain group-hover:scale-110 transition-transform duration-700 drop-shadow-[0_0_30px_rgba(255,255,255,0.05)]"
                        />
                    </div>

                    <div className="absolute -bottom-6 -right-6 bg-gray-900 p-6 rounded-3xl shadow-2xl border border-white/5 flex items-center gap-4">
                        <div className="w-12 h-12 bg-orange-600/20 text-orange-500 rounded-2xl flex items-center justify-center">
                            <Flame fill="currentColor" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Meat Quality</p>
                            <p className="text-sm font-black uppercase">100% Premium</p>
                        </div>
                    </div>
                </div>
            </header>

            {/* --- FEATURES SECTION --- */}
            <section className="bg-white/[0.02] py-24 px-6 border-y border-white/5">
                <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-12">
                    <Feature
                        icon={<Utensils className="text-orange-500" />}
                        title="Premium Meats"
                        desc="Only the finest cuts of pork and beef, sliced fresh daily for the perfect grill."
                    />
                    <Feature
                        icon={<TrendingUp className="text-orange-500" />}
                        title="Unlimited Sides"
                        desc="From classic Kimchi to our secret specialty sides, the refills never stop."
                    />
                    <Feature
                        icon={<Smartphone className="text-orange-500" />}
                        title="Easy Access"
                        desc="Visit any of our convenient locations across Subic and Olongapo City."
                    />
                </div>
            </section>

            {/* --- LOCATIONS SECTION --- */}
            <section id="branches" className="max-w-7xl mx-auto px-6 py-32">
                <div className="text-center mb-20">
                    <h2 className="text-xs font-black uppercase tracking-[0.4em] text-orange-500 mb-4 text-center">Find Your Table</h2>
                    <h3 className="text-5xl font-black uppercase tracking-tight text-center">Our Locations</h3>
                </div>

                {/* Adjusted grid for better spacing with 2 items */}
                <div className="grid sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
                    {branchList.map((branch) => (
                        <div key={branch.name} className="p-8 bg-gray-900/40 border border-white/5 rounded-[2.5rem] hover:border-orange-600/50 transition-all group">
                            <MapPin className="text-gray-600 group-hover:text-orange-500 mb-6 transition-colors" size={32} />
                            <h4 className="text-xl font-black uppercase tracking-tight mb-2">{branch.name}</h4>
                            <p className="text-sm text-gray-500 font-medium mb-8 leading-snug">{branch.loc}</p>
                            <button className="w-full py-4 bg-white/5 group-hover:bg-orange-600 group-hover:text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] transition-all border border-white/5">
                                View Directions
                            </button>
                        </div>
                    ))}
                </div>
            </section>

            {/* --- DARK FOOTER --- */}
            <footer className="bg-black text-white py-20 px-6 text-center border-t border-white/5">
                <div className="max-w-xl mx-auto space-y-8">
                    <img src={logoImg} alt="Logo" className="w-16 h-16 mx-auto opacity-80" />
                    <h2 className="text-4xl font-black uppercase tracking-tighter">Taste the Crown.</h2>
                    <p className="text-gray-500 font-medium italic">Experience the gold standard of Samgyupan in Central Luzon.</p>

                    <div className="pt-10 flex flex-col md:flex-row justify-center gap-10 border-t border-white/5">
                        <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-orange-500">Contact Us</p>
                            <p className="font-bold text-gray-300">hello@samgyupking.ph</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-orange-500">Operations</p>
                            <p className="font-bold text-gray-300">10:00 AM - 10:00 PM</p>
                        </div>
                    </div>
                </div>
                <div className="mt-20 text-[9px] font-black uppercase tracking-[0.4em] text-gray-700">
                    © 2026 Samgyup King
                </div>
            </footer>
        </div>
    );
}

function Feature({ icon, title, desc }) {
    return (
        <div className="space-y-4">
            <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 shadow-inner">
                {icon}
            </div>
            <h4 className="text-xl font-black uppercase tracking-tight">{title}</h4>
            <p className="text-sm text-gray-400 font-medium leading-relaxed">{desc}</p>
        </div>
    );
}