export default function Dashboard() {
    return (
        <div className="min-h-screen bg-gray-100 p-8">
            <div className="max-w-4xl mx-auto bg-white rounded-lg shadow p-6">
                <h1 className="text-3xl font-bold text-gray-800">Samgyup King Dashboard</h1>
                <p className="text-gray-600 mt-2">Authentication successful! Welcome back.</p>

                <div className="mt-6 p-4 bg-orange-50 border border-orange-200 rounded-md">
                    <p className="text-orange-700 font-medium">Sales and Menu management modules loading...</p>
                </div>
            </div>
        </div>
    );
}