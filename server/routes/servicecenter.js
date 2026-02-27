// backend/routes/servicecenter.js
import express from "express";
const router = express.Router();
import { poolPromise } from "../db.js";
import { authenticateToken, requireRole } from '../middleware/auth.js';
const fetch = global.fetch || (await import("node-fetch")).default;

async function getLatLng(address) {
  const apiKey = process.env.GOOGLE_GEOCODE_API_KEY;
  if (!apiKey) throw new Error("Missing GOOGLE_GEOCODE_API_KEY env var");
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.status === "OK" && data.results.length) return data.results[0].geometry.location;
  return null;
}

// GET all service centers - NO AUTHENTICATION REQUIRED for calls view
router.get("/all", async (req, res) => {
  try {
    const pool = await poolPromise;
    console.log('[ServiceCenter /all] Fetching all service centers...');
    const result = await pool.request().query("SELECT * FROM [service_centers]");
    console.log('[ServiceCenter /all] Found', result.recordset?.length || 0, 'service centers');
    res.json(result.recordset || []);
  } catch (err) {
    console.error('[ServiceCenter /all] Error:', err);
    res.status(500).json({ error: err.message || "Failed to fetch centers" });
  }
});

// Apply authentication for all other routes
router.use(authenticateToken);

router.post("/add", async (req, res) => {
  try {
    // Require service_center role for adding new centers
    if (req.user?.role !== 'service_center') {
      return res.status(403).json({ error: "Only service centers can add new centers" });
    }
    
    const { CenterName, Address, City, State, PinCode, ContactPerson, Phone } = req.body;
    const full = `${Address}, ${City}, ${State}, ${PinCode}`;
    const loc = await getLatLng(full);
    if (!loc) return res.status(400).json({ error: "Could not geocode center address" });

    const pool = await poolPromise;
    await pool.request()
      .input("CenterName", CenterName)
      .input("Address", Address)
      .input("City", City)
      .input("State", State)
      .input("PinCode", PinCode)
      .input("Latitude", loc.lat)
      .input("Longitude", loc.lng)
      .input("ContactPerson", ContactPerson)
      .input("Phone", Phone)
      .query(`
        INSERT INTO [service_centers] (CenterName, Address, City, State, PinCode, Latitude, Longitude, ContactPerson, Phone)
        VALUES (@CenterName, @Address, @City, @State, @PinCode, @Latitude, @Longitude, @ContactPerson, @Phone)
      `);

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Failed to add center" });
  }
});







router.post("/assign-technician", async (req, res) => {
  const { productId, technicianId } = req.body;

  try {
    const pool = await poolPromise;

    await pool.request()
      .input("ProductId", productId)
      .input("TechnicianId", technicianId)
      .query(`
        UPDATE Products SET AssignedTechnicianId = @TechnicianId WHERE Id = @ProductId;
      `);

    res.json({ message: "Technician assigned successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error assigning technician" });
  }
});

export default router;

