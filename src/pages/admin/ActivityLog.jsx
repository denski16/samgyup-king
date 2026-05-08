import { useState, useEffect } from 'react';
import { supabase } from "../../supabaseClient";
import AdminSidebar from "../../components/AdminSidebar";
import {
    Activity,
    Clock,
    ShoppingCart,
    Package,
    UserCheck,
    Store,
    ShieldCheck,
    RefreshCcw
} from 'lucide-react';

export default function ActivityLog() {
    const [logs, setLogs] = useState([]);
    const [staffProfiles, setStaffProfiles] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();

        // 1. Listen for new Activity Logs (Sales, Inventory updates, etc.)
        const logSubscription = supabase
            .channel('activity_channel')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'activity_logs'
            }, payload => {
                // Add the new log to the top of the list
                setLogs(current => [payload.new, ...current].slice(0, 100));
            })
            .subscribe();

        // 2. Listen for Profile changes (Login/Logout via duty_status)
        const profileSubscription = supabase
            .channel('profiles_channel')
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'profiles'
            }, payload => {
                // Update the specific staff member in the roster state
                setStaffProfiles(current => current.map(staff =>
                    staff.id === payload.new.id ? payload.new : staff
                ));
            })
            .subscribe();

        // Cleanup subscriptions on unmount
        return () => {
            supabase.removeChannel(logSubscription);
            supabase.removeChannel(profileSubscription);
        };
    }, []);

    async function fetchData() {
        setLoading(true);
        try {
            // Fetch logs
            const { data: logData } = await supabase
                .from('activity_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(100);
            setLogs(logData || []);

            // Fetch staff
            const { data: staffData } = await supabase
                .from('profiles')
                .select('*')
                .neq('role', 'client')
                .order('last_name', { ascending: true });
            setStaffProfiles(staffData || []);
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    }

    const getIconForAction = (type) => {
        if (type === 'SALE') return <ShoppingCart size={16} className="text-green-500" />;
        if (type === 'INVENTORY') return <Package size={16} className="text-blue-500" />;
        return <ShieldCheck size={16} className="text-orange-500" />;
    };

    const formatLogDate = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        if (date.toDateString() === now.toDateString()) {
            return `Today, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        }
        const yesterday = new Date();
        yesterday.setDate(now.getDate() - 1);
        if (date.toDateString() === yesterday.toDateString()) {
            return `Yesterday, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        }
        return date.toLocaleDateString('en-PH', {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    };

    const activeBranches = Array.from(new Set(staffProfiles.flatMap(staff => staff.branches || []))).sort();

    return (
        <div className="flex min-h-screen bg-gray-50 text-gray-900 font-sans">
            <AdminSidebar />

            <main className="flex-1 p-4 pt-20 md:p-8 overflow-y-auto max-w-[100vw]">
                <header className="mb-8 md:mb-10">
                    <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight italic flex items-center gap-3 text-gray-900">
                        <Activity className="text-orange-600" size={32} /> Activity <span className="text-orange-600">Logs</span>
                    </h1>
                    <p className="text-sm md:text-base text-gray-500 font-medium italic mt-1">Live monitoring of staff actions and branch status.</p>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
                    {/* LEFT COLUMN: LIVE ACTIVITY FEED */}
                    <div className="lg:col-span-2 bg-white rounded-[2rem] md:rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden flex flex-col h-[60vh] md:h-[75vh]">
                        <div className="p-6 md:p-8 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center shrink-0">
                            <h2 className="text-lg md:text-xl font-black uppercase tracking-tight">Real-Time Log</h2>
                            <span className="animate-pulse flex items-center gap-2 text-[10px] font-black text-green-600 uppercase">
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div> Live
                            </span>
                        </div>

                        <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-2 custom-scrollbar">
                            {loading && !logs.length ? (
                                <div className="flex flex-col items-center justify-center h-full gap-4">
                                    <RefreshCcw className="animate-spin text-orange-500" size={24} />
                                    <p className="text-gray-400 font-black uppercase tracking-widest text-[10px]">Scanning Network...</p>
                                </div>
                            ) : logs.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                                    <Activity size={48} className="opacity-10 mb-4" />
                                    <p className="font-bold italic">No activity recorded recently.</p>
                                </div>
                            ) : logs.map((log) => (
                                <div key={log.id} className="p-4 rounded-xl md:rounded-2xl bg-gray-50 border border-transparent hover:border-orange-200 transition-all flex items-start gap-3 md:gap-4 group">
                                    <div className="mt-1 bg-white p-2 rounded-full shadow-sm border border-gray-100 flex-shrink-0">
                                        {getIconForAction(log.action_type)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-1 gap-1">
                                            <p className="font-black text-gray-900 uppercase text-xs md:text-sm tracking-tight truncate">
                                                {log.staff_name} <span className="text-gray-400 font-bold mx-1">@</span> {log.branch}
                                            </p>
                                            <p className="text-[9px] md:text-[10px] text-gray-400 font-black flex items-center gap-1 uppercase whitespace-nowrap">
                                                <Clock size={10} />
                                                {formatLogDate(log.created_at)}
                                            </p>
                                        </div>
                                        <p className="text-gray-600 text-[11px] md:text-xs font-medium leading-relaxed">
                                            {log.details}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* RIGHT COLUMN: STAFF STATUS */}
                    <div className="lg:col-span-1 bg-gray-900 rounded-[2rem] md:rounded-[2.5rem] shadow-2xl p-6 md:p-8 flex flex-col h-[50vh] md:h-[75vh]">
                        <h2 className="text-lg md:text-xl font-black uppercase tracking-tight text-white mb-6 flex items-center gap-2 shrink-0">
                            <UserCheck className="text-orange-500" size={20} /> Branch Rosters
                        </h2>

                        <div className="flex-1 overflow-y-auto space-y-6 pr-2 custom-scrollbar">
                            {activeBranches.map(branch => {
                                const staffInBranch = staffProfiles.filter(s => s.branches?.includes(branch));
                                if (staffInBranch.length === 0) return null;

                                return (
                                    <div key={branch} className="space-y-3">
                                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2 border-b border-white/10 pb-2">
                                            <Store size={12} className="text-orange-500" /> {branch}
                                        </h3>
                                        <div className="space-y-2">
                                            {staffInBranch.map(staff => {
                                                // Check for On Duty status
                                                const isOnDuty = staff.duty_status?.toUpperCase() === 'ON DUTY';
                                                return (
                                                    <div key={staff.id} className="p-3 rounded-xl bg-white/5 border border-white/5 flex justify-between items-center transition-colors hover:bg-white/10">
                                                        <div className="flex items-center gap-3 min-w-0 pr-2">
                                                            <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 font-bold text-[10px] uppercase shrink-0 border border-gray-700">
                                                                {staff.first_name?.charAt(0)}{staff.last_name?.charAt(0)}
                                                            </div>
                                                            <p className="font-black text-white uppercase tracking-tight text-xs truncate">
                                                                {staff.first_name} {staff.last_name}
                                                            </p>
                                                        </div>
                                                        {isOnDuty ? (
                                                            <span className="bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-1 rounded-md text-[8px] font-black tracking-widest uppercase flex items-center gap-1.5 shrink-0 shadow-[0_0_10px_rgba(34,197,94,0.1)]">
                                                                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_5px_rgba(34,197,94,0.8)]"></div>
                                                                On Duty
                                                            </span>
                                                        ) : (
                                                            <span className="text-gray-600 bg-gray-950 px-2 py-1 rounded-md text-[8px] font-black tracking-widest uppercase shrink-0 border border-white/5">
                                                                Off Duty
                                                            </span>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}