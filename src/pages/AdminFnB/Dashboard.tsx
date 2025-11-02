import React from 'react';

const Dashboard: React.FC = () => {
    return (
        <div className="p-6">
            <h1 className="text-2xl font-semibold mb-6">Food & Beverage Dashboard</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Dashboard content can be added here */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold mb-2">Welcome</h3>
                    <p className="text-gray-600">Food & Beverage Management Dashboard</p>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
