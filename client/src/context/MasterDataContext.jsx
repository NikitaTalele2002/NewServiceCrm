// src/context/MasterDataContext.jsx
import React, { createContext, useContext, useEffect, useState } from "react";

const MasterDataContext = createContext();

export function MasterDataProvider({ children }) {
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [pincodes, setPincodes] = useState([]);

  async function fetchStates() {
    try {
      const res = await fetch("http://localhost:5000/api/admin/master-data?type=state");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const js = await res.json();
      setStates(js.rows || []);
    } catch (err) {
      // Silently fail - master data endpoints may not be available
      setStates([]);
    }
  }

  async function fetchCities() {
    try {
      const res = await fetch("http://localhost:5000/api/admin/master-data?type=city");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const js = await res.json();
      setCities(js.rows || []);
    } catch (err) {
      // Silently fail - master data endpoints may not be available
      setCities([]);
    }
  }

  async function fetchPincodes() {
    try {
      const res = await fetch("http://localhost:5000/api/admin/master-data?type=pincode");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const js = await res.json();
      setPincodes(js.rows || []);
    } catch (err) {
      // Silently fail - master data endpoints may not be available
      setPincodes([]);
    }
  }

  useEffect(() => {
    // Do not auto-fetch master data on mount to avoid unnecessary server load.
    // Consumers can call fetchStates/fetchCities/fetchPincodes when needed.
  }, []);

  return (
    <MasterDataContext.Provider value={{ states, cities, pincodes }}>
      {children}
    </MasterDataContext.Provider>
  );
}

export function useMasterData() {
  return useContext(MasterDataContext);
}


