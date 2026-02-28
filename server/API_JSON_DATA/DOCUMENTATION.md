# New Service CRM - Technician API (Request & Response)

This folder contains a complete mapping of the Technician APIs found in the server. Each file documents the request format (Method, URL, Body) and the actual JSON structure returned by the server.

## API Documentation Mapping

### 🔐 Authentication
- [JSON Data](api/auth_login.json) | [JS Router](api/mobile-api/authApi.js) - Functional login calling `authService`.

### 📞 Technician Calls
- [JSON Data](api/get_assigned_calls.json) | [JS Router](api/mobile-api/technicianCallsApi.js) - Functional router calling `complaintService`.

### 🏗️ Spare Requests
- [JSON Data](api/get_spare_parts_list.json) | [JS Router](api/mobile-api/spareRequestsApi.js) - Functional router calling `technicianSpareRequestService`.

### 📦 Spare Returns
- [JSON Data](api/get_spare_returns_list.json) | [JS Router](api/mobile-api/spareReturnRequestApi.js) - Functional router calling `spareReturnRequestService`.

### 📊 Tracking (TAT & Spares)
- [JSON Data](api/post_spare_consumption.json) | [JS Router](api/mobile-api/technicianTrackingApi.js) - Functional router calling `callSpareUsageService`.

### 📦 Inventory
- [JSON Data](api/get_current_inventory.json) | [JS Router](api/mobile-api/inventoryApi.js) - Functional router with optimized inventory queries.

### 👤 Technician
- [JS Router](api/mobile-api/technicianApi.js) - Functional profile management.

---

## Technical Note
The Javascript files in `api/*.js` are **Functional Express Routers**. They contain real logic that imports `models/index.js` and `services/*.js` to return clean JSON responses. This is the code intended to be used by the Mobile App.
