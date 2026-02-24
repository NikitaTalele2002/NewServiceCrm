import React from "react";
// import Navbar from "../service_center/navbar"; 
// Using the same navbar

export default function DashboardSC() {
  // Dummy data for demonstration (will replace with API data later)
  const dashboardData = {
    totalCallsToday: 45,
    pendingComplaints: 12,
    resolvedToday: 28,
    escalations: 3,
    avgCallTime: "2m 14s",
    agentPerformance: "4.2 / 5",
  };

  return (
    <div className="flex flex-col bg-gray-100 min-h-screen w-full ">
      {/* <Navbar /> */}

      <div className="pt-20 px-6 overflow-auto">
        <div className="w-full bg-white rounded shadow-md p-6">
          <h1 className="text-blue-500 text-2xl font-bold mb-6 pb-2 border-b-2 border-blue-500">
            Service Centre Dashboard
          </h1>

          {/* Dashboard Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">

            <div className="border border-gray-300 rounded p-4 bg-gray-50 shadow">
              <h2 className="text-lg font-semibold mb-2">Calls Today</h2>
              <p className="text-gray-600">{dashboardData.totalCallsToday}</p>
            </div>

            <div className="border border-gray-300 rounded p-4 bg-gray-50 shadow">
              <h2 className="text-lg font-semibold mb-2">Pending Complaints</h2>
              <p className="text-gray-600">{dashboardData.pendingComplaints}</p>
            </div>

            <div className="border border-gray-300 rounded p-4 bg-gray-50 shadow">
              <h2 className="text-lg font-semibold mb-2">Resolved Today</h2>
              <p className="text-gray-600">{dashboardData.resolvedToday}</p>
            </div>

            <div className="border border-gray-300 rounded p-4 bg-gray-50 shadow">
              <h2 className="text-lg font-semibold mb-2">Escalations</h2>
              <p className="text-gray-600">{dashboardData.escalations}</p>
            </div>

            <div className="border border-gray-300 rounded p-4 bg-gray-50 shadow">
              <h2 className="text-lg font-semibold mb-2">Avg Call Time</h2>
              <p className="text-gray-600">{dashboardData.avgCallTime}</p>
            </div>

            <div className="border border-gray-300 rounded p-4 bg-gray-50 shadow">
              <h2 className="text-lg font-semibold mb-2">Agent Performance</h2>
              <p className="text-gray-600">{dashboardData.agentPerformance}</p>
            </div>

          </div>

          {/* Extra content for checking scrolling */}
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="border border-gray-300 p-4 rounded bg-white shadow" >
                <h3 className="font-semibold text-gray-800">
                  Additional Insights {i}
                </h3>
                <p className="text-gray-600">
                  Scroll down to experience the sticky navbar behavior.
                </p>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}
