import React, { useState, useEffect } from 'react';

const Dashboard = () => {
  const [totalSubmitted, setTotalSubmitted] = useState(2000);
  const [totalApproved, setTotalApproved] = useState(2000);

  // TODO: Fetch data from API
  // useEffect(() => {
  //   fetch('/api/monthly-claims')
  //     .then(res => res.json())
  //     .then(data => {
  //       setTotalSubmitted(data.submitted);
  //       setTotalApproved(data.approved);
  //     });
  // }, []);

  return (
    <div className="p-5 font-sans">
      <h1 className="text-red-600 text-3xl mb-5">Dashboard</h1>
      <div className="flex gap-5 justify-center">
        {/* Total Claim Submitted Card */}
        <div className="w-96 h-56 border-2 border-gray-900 rounded-lg flex flex-col justify-center items-center bg-white">
          <div className="text-6xl font-bold mb-2.5">
            {totalSubmitted}/-rs
          </div>
          <div className="text-3xl text-center">
            Total Claim Submitted<br />
            Last month
          </div>
        </div>

        {/* Total Claim Approved Card */}
        <div className="w-96 h-56 border-2 border-gray-900 rounded-lg flex flex-col justify-center items-center bg-white">
          <div className="text-6xl font-bold mb-2.5">
            {totalApproved}/-rs
          </div>
          <div className="text-3xl text-center">
            Total Claim Approved<br />
            Last month
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;