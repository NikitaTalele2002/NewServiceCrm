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

// Protect service-center routes: only allow authenticated users with role 'service_center'
router.use(authenticateToken, requireRole('service_center'));

router.post("/add", async (req, res) => {
  try {
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
        INSERT INTO ServiceCenters (CenterName, Address, City, State, PinCode, Latitude, Longitude, ContactPerson, Phone)
        VALUES (@CenterName, @Address, @City, @State, @PinCode, @Latitude, @Longitude, @ContactPerson, @Phone)
      `);

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Failed to add center" });
  }
});


router.get("/all", async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query("SELECT * FROM ServiceCenters");
    res.json(result.recordset || []);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch centers" });
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

