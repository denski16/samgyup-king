import Sidebar from '../components/Sidebar';

export default function Dashboard() {
    // Hard-coded data
    const products = [
        { name: 'Pork Samgyup', orders: 1240 },
        { name: 'Beef Samgyup', orders: 980 },
        { name: 'Kimchi Jjigae', orders: 450 },
        { name: 'Beef Enoki Roll', orders: 120 },
    ];

    return (
        <div className="flex min-h-screen bg-gray-100 font-sans">
            {/* External Sidebar Component */}
            <Sidebar />

            {/* Main Content Area */}
            <main className="flex-1 p-8 overflow-y-auto">
                <header className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Dashboard Overview</h1>
                        <p className="text-gray-500">Welcome back, Manager!</p>
                    </div>
                </header>

                {/* --- STAT CARDS --- */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-orange-500">
                        <p className="text-sm text-gray-500 uppercase font-bold">Total Sales Today</p>
                        <p className="text-2xl font-bold text-gray-900">₱45,200.00</p>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-green-500">
                        <p className="text-sm text-gray-500 uppercase font-bold">Active Tables</p>
                        <p className="text-2xl font-bold text-gray-900">12 / 20</p>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-blue-500">
                        <p className="text-sm text-gray-500 uppercase font-bold">Pending Orders</p>
                        <p className="text-2xl font-bold text-gray-900">8</p>
                    </div>
                </div>

                {/* --- GRAPHS SECTION --- */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Performance Graph */}
                    <div className="bg-white p-6 rounded-xl shadow-sm">
                        <h3 className="text-lg font-bold mb-6">Weekly Performance</h3>
                        <div className="flex items-end justify-around h-48 space-x-2">
                            {[60, 80, 45, 90, 100, 70, 85].map((height, i) => (
                                <div key={i} className="flex flex-col items-center w-full">
                                    <div style={{ height: `${height}%` }} className="w-full bg-orange-100 hover:bg-orange-500 transition-colors rounded-t-md"></div>
                                    <span className="text-xs text-gray-400 mt-2">Day {i + 1}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Product Insights */}
                    <div className="bg-white p-6 rounded-xl shadow-sm">
                        <h3 className="text-lg font-bold mb-4">Product Performance</h3>
                        <div className="space-y-6">
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-sm font-medium">⭐ Most Bought: {products[0].name}</span>
                                    <span className="text-sm font-bold">{products[0].orders}</span>
                                </div>
                                <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden">
                                    <div className="bg-orange-500 h-full w-full"></div>
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-sm font-medium">⚠️ Least Bought: {products[3].name}</span>
                                    <span className="text-sm font-bold">{products[3].orders}</span>
                                </div>
                                <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden">
                                    <div className="bg-red-400 h-full w-[15%]"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}