const https = require("https");

// Small helper delay
function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Fetch JSON utility
function fetchJson(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = new URL(url);
    options.headers = headers;

    https
      .get(options, (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            reject(new Error("Invalid JSON response"));
          }
        });
      })
      .on("error", reject);
  });
}

// Geocode using OpenStreetMap, fallback → Photon
async function getLatLng(address) {
  const sanitized = address.replace(/near|opp|opposite|behind/gi, "").trim();

  const nominatimUrl = `https://nominatim.openstreetmap.org/search?${new URLSearchParams({
    q: sanitized,
    format: "json",
    limit: 1,
  }).toString()}`;

  const headers = {
    "User-Agent": "CRM-System/1.0 (nikita-support@example.com)", // IMPORTANT
    "Accept-Language": "en",
  };

  // Try Nominatim
  try {
    await wait(1000); // avoid rate-limit
    const data = await fetchJson(nominatimUrl, headers);

    if (Array.isArray(data) && data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
  } catch (e) {
    console.log("Nominatim failed:", e.message);
  }

  // Fallback: Photon API (also free)
  const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(
    sanitized
  )}&limit=1`;

  try {
    const data = await fetchJson(photonUrl);

    if (data.features && data.features.length > 0) {
      const [lng, lat] = data.features[0].geometry.coordinates;
      return { lat, lng };
    }
  } catch (e) {
    console.log("Photon geocoder failed:", e.message);
  }

  throw new Error("Unable to geocode address: " + address);
}

// OSRM road distance
async function getRoadDistanceKm(fromAddress, toAddress) {
  const from = await getLatLng(fromAddress);
  const to = await getLatLng(toAddress);

  const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=false`;

  const headers = { "User-Agent": "CRM-System/1.0" };
  const data = await fetchJson(url, headers);

  if (data.routes && data.routes.length) {
    return data.routes[0].distance / 1000;
  }

  // fallback: Haversine
  const R = 6371;
  const toRad = (v) => (v * Math.PI) / 180;
  const dLat = to.lat - from.lat;
  const dLon = to.lng - from.lng;

  const a =
    Math.sin(toRad(dLat) / 2) ** 2 +
    Math.cos(toRad(from.lat)) *
      Math.cos(toRad(to.lat)) *
      Math.sin(toRad(dLon) / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Example test
(async () => {
  try {
    const serviceCenterAddress =
      "Shivaji Nagar, Near Central Park, Pune, Maharashtra 411005, India";

    const customerAddress =
      "Sector 27A, Pradhikaran, Nigdi, Pimpri-Chinchwad, Maharashtra 411044, India";

    const distance = await getRoadDistanceKm(
      serviceCenterAddress,
      customerAddress
    );

    console.log(
      `Distance between service center and customer: ${distance.toFixed(
        4
      )} km`
    );
  } catch (err) {
    console.error("Error:", err.message);
  }
})();

module.exports={getLatLng,get}