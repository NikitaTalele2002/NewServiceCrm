import React, { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import Navbar from "../navbar";


export default function Inventory_management() {
  const [showInventorySub, setShowInventorySub] = useState(false);

  const menuItemClass = ({ isActive }) =>
    `border-b-2 m-2 p-2 rounded cursor-pointer block ${
      isActive
        ? "bg-white font-bold text-black shadow"
        : "text-gray-800 hover:bg-gray-200"
    }`;

  const subMenuItemClass = ({ isActive }) =>
    `ml-6 border-l-2 pl-2 m-1 p-1 rounded block cursor-pointer ${
      isActive ? "bg-gray-300 font-semibold" : "text-gray-700 hover:bg-gray-200"
    }`;

  return (
    <div className="flex flex-col bg-gray-100 h-screen w-screen">
      {/* Navbar */}
      <Navbar />

      <div className="flex flex-row w-full pt-18">
        <aside className="w-1/5 bg-red-200 p-6 rounded m-3 shadow-md h-[calc(100vh-6rem)] overflow-y-auto">
          <ul>
            <NavLink to="rental-allocation" className={menuItemClass}>
              Rental Allocation
            </NavLink>

            <NavLink to="rental-return" className={menuItemClass}>
              Rental Return
            </NavLink>

            <NavLink to="technician-inventory" className={menuItemClass}>
              Technician Inventory
            </NavLink>

            <NavLink to="current-inventory" className={menuItemClass}>
              Current Inventory
            </NavLink>

            <li>
              <div
                onClick={() => setShowInventorySub(!showInventorySub)}
                className="border-b-2 m-2 p-2 rounded cursor-pointer block text-gray-800 hover:bg-gray-200">
                Order Request
              </div>
              {showInventorySub && (
                <ul>
                  <NavLink to="order-request" className={subMenuItemClass}>
                    Add Order
                  </NavLink>
                  <NavLink to="confirm-request" className={subMenuItemClass}>
                    Confirm Request
                  </NavLink>
                </ul>
              )}
            </li>

            <NavLink to="spare-part-return" className={menuItemClass}>
              Spare Part Return
            </NavLink>

            <NavLink to="generate-dcf" className={menuItemClass}>
              Create DCF
            </NavLink>
          </ul>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 m-3 border-4 border-gray-300 rounded bg-white shadow-md h-[calc(100vh-6rem)] overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

