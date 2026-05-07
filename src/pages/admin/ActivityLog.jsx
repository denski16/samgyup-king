import { useState, useEffect } from 'react';
import { supabase } from "../../supabaseClient";
import AdminSidebar from "../../components/AdminSidebar";
import {
    Activity, Clock, ShoppingCart, Package,
    UserCheck, Store, ShieldCheck
} from 'lucide-react';

export default function ActivityLog() {
    const [logs, setLogs] = useState([]);
    const [staffProfiles, setStaffProfiles] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();

        // Optional Pro-Tip: Subscribe to real-time changes
        const subscription = supabase
            .channel('activity_channel')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity_logs' }, payload => {
                setLogs(current => [payload.new, ...current].slice(0, 50)); // Keep top 50
            })
            .subscribe();

        return () => supabase.removeChannel(subscription);
    }, []);

    async function fetchData() {
        setLoading(true);
        // 1. Fetch recent activity
        const { data: logData } = await supabase
            .from('activity_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);

        setLogs(logData || []);

        // 2. Fetch staff roster
        const { data: staffData } = await supabase
            .from('profiles')
            .select('*')
            .eq('role', 'Staff')
            .order('last_name', { ascending: true });

        setStaffProfiles(staffData || []);
        setLoading(false);
    }

    const getIconForAction = (type) => {
        if (type === 'SALE') return <ShoppingCart size={16} className="text-green-500" />;
        if (type === 'INVENTORY') return <Package size={16} className="text-blue-500" />;
        return <ShieldCheck size={16} className="text-orange-500" />;
    };

    return (
        <div className="flex min-h-screen bg-gray-50 text-gray-900 font-sans">
            <AdminSidebar />

            <main className="flex-1 p-8 overflow-y-auto">
                <header className="mb-10">
                    <h1 className="text-3xl font-black uppercase tracking-tight italic flex items-center gap-3">
                        <Activity className="text-orange-600" size={32} /> System <span className="text-orange-600">Radar</span>
                    </h1>
                    <p className="text-gray-500 font-medium italic mt-1">Live monitoring of staff actions and branch status.</p>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* LEFT COLUMN: LIVE ACTIVITY FEED */}
                    <div className="lg:col-span-2 bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden flex flex-col h-[75vh]">
                        <div className="p-8 border-b border-gray-100 bg-gray-50/50">
                            <h2 className="text-xl font-black uppercase tracking-tight">Real-Time Log</h2>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                            {loading && !logs.length ? (
                                <p className="text-center py-10 text-gray-400 font-black uppercase tracking-widest animate-pulse">Scanning Network...</p>
                            ) : logs.length === 0 ? (
                                <p className="text-center py-10 text-gray-400 font-bold italic">No activity recorded today.</p>
                            ) : logs.map((log) => (
                                <div key={log.id} className="p-4 rounded-2xl bg-gray-50 border border-transparent hover:border-orange-200 transition-colors flex items-start gap-4 group">
                                    <div className="mt-1 bg-white p-2 rounded-full shadow-sm border border-gray-100">
                                        {getIconForAction(log.action_type)}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start mb-1">
                                            <p className="font-black text-gray-900 uppercase text-sm tracking-tight">
                                                {log.staff_name} <span className="text-gray-400 font-bold mx-1">@</span> {log.branch}
                                            </p>
                                            <p className="text-[10px] text-gray-400 font-black flex items-center gap-1 uppercase">
                                                <Clock size={10} />
                                                {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                        <p className="text-gray-600 text-xs font-medium">{log.details}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* RIGHT COLUMN: STAFF STATUS */}
                    <div className="lg:col-span-1 bg-gray-900 rounded-[2.5rem] shadow-2xl p-8 flex flex-col h-[75vh]">
                        <h2 className="text-xl font-black uppercase tracking-tight text-white mb-6 flex items-center gap-2">
                            <UserCheck className="text-orange-500" size={20} /> Branch Rosters
                        </h2>

                        <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                            {staffProfiles.map(staff => (
                                <div key={staff.id} className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                                    <div className="flex justify-between items-center mb-2">
                                        <p className="font-black text-white uppercase tracking-tight text-sm">
                                            {staff.first_name} {staff.last_name}
                                        </p>
                                        <span className={`w-2 h-2 rounded-full ${staff.status === 'Active' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-gray-500'}`}></span>
                                    </div>
                                    <div className="flex flex-wrap gap-1 mt-2">
                                        {staff.branches?.map(b => (
                                            <span key={b} className="text-[8px] bg-white/10 text-gray-300 px-2 py-1 rounded-md uppercase font-black tracking-widest flex items-center gap-1">
                                                <Store size={8} /> {b}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
            </main>
        </div>
    );
}