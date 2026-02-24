import React from 'react';

export default function CC_Navbar() {
  return (
    <header className="bg-blue-600 text-black py-3 px-4 rounded-md shadow">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <h2 className="text-lg font-semibold">Call Centre - Service Registration</h2>
        <nav className="space-x-4">
          <a href="/call-centre/service-registration" className="text-black hover:underline">Home</a>
          <a href="/call-centre/search" className="text-black hover:underline">Search</a>
        </nav>
      </div>
    </header>
  );
}



