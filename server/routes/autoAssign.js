import express from "express";
const router = express.Router();
import { poolPromise } from "../db.js";

// NEAREST SERVICE CENTER 
async function findNearestCenter({ pincode, customerAddress, customer }) {
  const pool = await poolPromise;

  // Load all service centers
  const result = await pool.request().query("SELECT * FROM ServiceCenters");
  let centers = result.recordset || [];

  // Normalize all centers' pincode values (VERY IMPORTANT)
  centers = centers.map(c => ({
    ...c,
    PinCode: c.PinCode ? String(c.PinCode).trim() : null,
    City: c.City ? String(c.City).trim() : null,
    State: c.State ? String(c.State).trim() : null,
  }));

  // Extract customer info
  let pin = pincode || customer?.PinCode || customer?.Pin || null;
  let city = customer?.City || null;
  let state = customer?.State || null;

  if (pin) pin = String(pin).trim();

  // Extract from address if missing
  if (customerAddress) {
    const parts = customerAddress.split(",").map(s => s.trim());

    const pinMatch = customerAddress.match(/\b\d{6}\b/);
    if (!pin && pinMatch) pin = pinMatch[0];

    if (!city && parts.length >= 2) city = parts[parts.length - 2];
    if (!state && parts.length >= 1) state = parts[parts.length - 1];
  }

  if (!pin && !city && !state) {
    throw new Error("Customer location not available");
  }

  // 1) EXACT PINCODE MATCH
 
  if (pin) {
    const exactMatches = centers.filter(c => c.PinCode === pin);
    if (exactMatches.length > 0) {
      return { bestCenter: exactMatches[0], matchedBy: "Exact PinCode" };
    }
  }

  // ----------------------------------------------------------
  // 2) TRUE NEAREST NUMERIC PINCODE MATCH (FIXED)
  // ----------------------------------------------------------
  if (pin) {
    const pinNum = parseInt(pin, 10);

    // Get only valid numeric pincodes
    const numericCenters = centers.filter(
      c => c.PinCode && /^\d+$/.test(c.PinCode)
    );

    if (numericCenters.length > 0) {
      // Sort by difference → smallest first
      numericCenters.sort((a, b) => {
        const diffA = Math.abs(parseInt(a.PinCode) - pinNum);
        const diffB = Math.abs(parseInt(b.PinCode) - pinNum);
        return diffA - diffB;
      });

      return {
        bestCenter: numericCenters[0],
        matchedBy: "Nearest Numeric PinCode",
      };
    }
  }

  if (city) {
    const cityMatches = centers.filter(
      c => c.City && c.City.toLowerCase() === city.toLowerCase()
    );
    if (cityMatches.length > 0) {
      return { bestCenter: cityMatches[0], matchedBy: "City Match" };
    }
  }

  // ----------------------------------------------------------
  // 4) STATE MATCH
  // ----------------------------------------------------------
  if (state) {
    const stateMatches = centers.filter(
      c => c.State && c.State.toLowerCase() === state.toLowerCase()
    );
    if (stateMatches.length > 0) {
      return { bestCenter: stateMatches[0], matchedBy: "State Match" };
    }
  }

  // ----------------------------------------------------------
  // 5) LAST RESORT FALLBACK
  // ----------------------------------------------------------
  if (centers.length > 0) {
    return { bestCenter: centers[0], matchedBy: "Fallback First Center" };
  }

  throw new Error("No service centers registered in database");
}


// --------------------------------------------------
// ASSIGN SERVICE CENTER ROUTE
// --------------------------------------------------
router.post("/assign-service-centre", async (req, res) => {
  try {
    const { pincode, customerAddress, customer } = req.body;

    const { bestCenter, matchedBy } = await findNearestCenter({
      pincode,
      customerAddress,
      customer,
    });

    res.json({
      serviceCenter: bestCenter,
      matchedBy,
    });
  } catch (err) {
    res.status(500).json({ error: err.message || "Error assigning service center" });
  }
});

// Export the finder so other modules (complaints route) can reuse the logic
export { router as default, findNearestCenter };


