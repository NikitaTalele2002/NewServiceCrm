// src/pages/call_centre/CallCenterLayout.jsx
import React from "react";
import { Outlet } from "react-router-dom";

export default function CallCenterLayout() {
  return (
    <div className="min-h-screen w-screen bg-gray-50">
      <main className="p-4">
        <Outlet />
      </main>
    </div>
  );
}
