import Sidebar from '../components/Sidebar';

export default function Settings() {
    return (
        <div className="flex min-h-screen bg-gray-50 text-gray-900 font-sans">
            <Sidebar />
            <main className="flex-1 p-8">
                <header className="mb-10">
                    <h1 className="text-3xl font-black uppercase tracking-tight">System Settings</h1>
                    <p className="text-gray-500 font-medium italic">Configure branch details and security preferences.</p>
                </header>

                <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-gray-100 max-w-2xl">
                    <div className="space-y-6">
                        <section>
                            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-orange-600 mb-4">Account Security</h3>
                            <p className="text-sm text-gray-500 mb-4 font-medium">Your account is currently protected by manager-level authorization.</p>
                            <button className="px-6 py-3 bg-gray-900 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-orange-600 transition-colors">
                                Update Manager Password
                            </button>
                        </section>

                        <div className="h-px bg-gray-100 w-full"></div>

                        <section>
                            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-orange-600 mb-4">System Info</h3>
                            <div className="text-xs font-bold text-gray-400 space-y-1 uppercase">
                                <p>Version: 2.0.1 (M4 Optimized)</p>
                                <p>Status: All Branches Connected</p>
                            </div>
                        </section>
                    </div>
                </div>
            </main>
        </div>
    );
}