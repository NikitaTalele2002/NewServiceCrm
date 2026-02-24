// API Base URL - configure here
const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000/api";
const CUSTOMER_API_BASE = `${API_BASE}/customers`;
const PRODUCT_API_BASE = `${API_BASE}/products`;
const COMPLAINTS_API_BASE = `${API_BASE}/complaints`;
const LOCATION_API_BASE = `${API_BASE}/location`;

//  CREATE CUSTOMER
export async function createCustomer(form) {
  const res = await fetch(`${CUSTOMER_API_BASE}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(form),
  });

  
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Customer creation failed: ${errorText}`);
  }

  return res.json();
}


//  SEARCH CUSTOMERS
export async function searchCustomers(payload) {
  const res = await fetch("http://localhost:5000/api/customers/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error("Search error");

  return await res.json();
}


//  GET ALL PRODUCTS
export async function getProducts() {
  const res = await fetch(`${PRODUCT_API_BASE}`);
  if (!res.ok) throw new Error("Failed to load products");
  return res.json();
}

//  GET PRODUCTS BY PHONE
export async function getProductsByPhone(phone) {
  const res = await fetch(`${PRODUCT_API_BASE}/by-phone/${phone}`);
  if (!res.ok) throw new Error("Failed to fetch products");
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

//  REGISTER PRODUCT
export async function registerProduct(data) {
  const res = await fetch(`${PRODUCT_API_BASE}/add`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.log("ERROR:", res.status, res.statusText, errorText);
    throw new Error("Product registration failed");
  }

  return res.json();
}

//  REGISTER COMPLAINT

export async function createComplaint(data) {
  const res = await fetch(`${COMPLAINTS_API_BASE}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Complaint creation failed: ${errorText}`);
  }

  return res.json();
}

//  GET LOCATION DATA (from Database Master)
export async function getStates() {
  try {
    const res = await fetch(`${API_BASE}/admin/master-data?type=state`);
    if (!res.ok) throw new Error("Failed to fetch states");
    const data = await res.json();
    // Return array of states with { Id, name: VALUE, description: DESCRIPTION }
    return (data.rows || []).map(s => ({
      id: s.Id,
      name: s.VALUE,
      description: s.DESCRIPTION
    }));
  } catch (err) {
    console.error("Get states error:", err);
    return [];
  }
}

export async function getCities(stateId = null) {
  try {
    let url = `${API_BASE}/admin/master-data?type=city`;
    if (stateId) {
      url += `&stateId=${encodeURIComponent(stateId)}`;
    }
    const res = await fetch(url);
    let mappedRows = [];

    if (res.ok) {
      const data = await res.json();
      mappedRows = (data.rows || []).map(c => ({
        id: c.Id,
        name: c.Value || c.VALUE || '',
        description: c.Description || c.DESCRIPTION || null,
        stateId: c.StateId || c.Parent_I || c.Parent_Id || c.PARENT_I || null
      }));
    }

    if (mappedRows.length > 0) {
      return mappedRows;
    }

    const fallbackRes = await fetch(`${API_BASE}/location/cities?state=${encodeURIComponent(stateId || '')}`);
    if (!fallbackRes.ok) throw new Error("Failed to fetch cities");
    const fallbackData = await fallbackRes.json();

    return (Array.isArray(fallbackData) ? fallbackData : []).map(c => ({
      id: c.Id || c.id,
      name: c.Value || c.VALUE || c.name || '',
      description: c.Description || c.DESCRIPTION || c.description || null,
      stateId: c.StateId || c.Parent_I || c.Parent_Id || c.PARENT_I || c.stateId || null
    }));
  } catch (err) {
    console.error("Get cities error:", err);
    return [];
  }
}

export async function getPincodes(cityId = null) {
  try {
    // Pass cityId to API for backend filtering
    let url = `${API_BASE}/admin/master-data?type=pincode`;
    if (cityId) {
      url += `&cityId=${encodeURIComponent(cityId)}`;
    }
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch pincodes");
    const data = await res.json();
    // return array of pincode objects with value and cityId fields
    return (data.rows || []).map(r => ({
      value: r.VALUE || r.Value || String(r),
      cityId: r.City_ID || r.cityId || null
    }));
  } catch (err) {
    console.error('Get pincodes error:', err);
    return [];
  }
}


//  GET COMPLAINTS
export async function getComplaints() {
  const res = await fetch(`${COMPLAINTS_API_BASE}/list`);
  if (!res.ok) throw new Error("Failed to load complaint list");
  return res.json();
}

//  ASSIGN TECHNICIAN TO COMPLAINT
export async function assignTechnician(complaintId, technicianId) {
  const res = await fetch(`${COMPLAINTS_API_BASE}/assign-technician`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ complaintId, technicianId }),
  });

  if (!res.ok) throw new Error("Failed to assign technician");
  return res.json();
}

//  UPDATE COMPLAINT STATUS

export async function updateComplaintStatus(complaintId, status) {
  const res = await fetch(`${COMPLAINTS_API_BASE}/${complaintId}/status`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });

  if (!res.ok) throw new Error("Failed to update complaint status");
  return res.json();
}








