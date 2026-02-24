import { poolPromise } from '../db.js';
const fetch = global.fetch || (await import('node-fetch')).default;

async function getLatLng(address){
  const apiKey = process.env.GOOGLE_GEOCODE_API_KEY;
  if(!apiKey) throw new Error('Missing GOOGLE_GEOCODE_API_KEY env var');
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;
  const res = await fetch(url);
  const data = await res.json();
  if(data.status === 'OK' && data.results.length) return data.results[0].geometry.location;
  return null;
}

async function addCenter(payload){
  const { CenterName, Address, City, State, PinCode, ContactPerson, Phone } = payload;
  const full = `${Address}, ${City}, ${State}, ${PinCode}`;
  const loc = await getLatLng(full);
  if(!loc) throw Object.assign(new Error('Could not geocode center address'), { status: 400 });

  const pool = await poolPromise;
  await pool.request()
    .input('CenterName', CenterName)
    .input('Address', Address)
    .input('City', City)
    .input('State', State)
    .input('PinCode', PinCode)
    .input('Latitude', loc.lat)
    .input('Longitude', loc.lng)
    .input('ContactPerson', ContactPerson)
    .input('Phone', Phone)
    .query(`
      INSERT INTO ServiceCenters (CenterName, Address, City, State, PinCode, Latitude, Longitude, ContactPerson, Phone)
      VALUES (@CenterName, @Address, @City, @State, @PinCode, @Latitude, @Longitude, @ContactPerson, @Phone)
    `);
  
  return { success: true };
}

async function getAllCenters(){
  const pool = await poolPromise;
  const result = await pool.request().query('SELECT * FROM ServiceCenters');
  return result.recordset || [];
}

async function assignTechnician(productId, technicianId){
  const pool = await poolPromise;
  await pool.request()
    .input('ProductId', productId)
    .input('TechnicianId', technicianId)
    .query(`UPDATE Products SET AssignedTechnicianId = @TechnicianId WHERE Id = @ProductId`);
  return { message: 'Technician assigned successfully' };
}

export default {
  addCenter,
  getAllCenters,
  assignTechnician
};
