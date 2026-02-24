import express from 'express';
const router = express.Router();
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { Op } from 'sequelize';
import { State, City, Pincode } from '../models/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Location data JSON path
const LOCATION_DATA_PATH = path.join(__dirname, '..', 'data', 'location_data.json');

// Helper to (re)load the JSON file on demand so uploads are immediately visible
function readLocationData() {
  try {
    const data = fs.readFileSync(LOCATION_DATA_PATH, 'utf8');
    return JSON.parse(data || '{}');
  } catch (err) {
    // If file missing or invalid, return empty structure
    return { states: [], cities: {}, pincodes: {} };
  }
}

// Helper: accept either state id (e.g. 'MH') or name ('Maharashtra')
function resolveStateId(query, LOCATION_DATA) {
  if (!query) return null;
  const q = String(query).trim().toLowerCase();
  // check id match
  const byId = (LOCATION_DATA.states || []).find(s => String(s.id).toLowerCase() === q);
  if (byId) return byId.id;
  // check name match
  const byName = (LOCATION_DATA.states || []).find(s => String(s.name).toLowerCase() === q);
  return byName ? byName.id : null;
}

// Helper: accept city id or name
function resolveCityKey(query, LOCATION_DATA) {
  if (!query) return null;
  const q = String(query).trim().toLowerCase();
  // try keys in cities (keys are state ids mapping to arrays of city objects)
  for (const stateId of Object.keys(LOCATION_DATA.cities || {})) {
    const cityObj = (LOCATION_DATA.cities[stateId] || []).find(c => String(c.id).toLowerCase() === q || String(c.name).toLowerCase() === q);
    if (cityObj) return cityObj.id;
  }
  // fallback: if query directly matches a pincode key
  if (LOCATION_DATA.pincodes && LOCATION_DATA.pincodes[query]) return query;
  return null;
}

// GET /states -> return array of { id, name }
router.get('/states', async (req, res) => {
  try {
    const rows = await State.findAll({
      attributes: ['Id', 'VALUE', 'DESCRIPTION'],
      order: [['VALUE', 'ASC']],
      raw: true,
    });

    const states = (rows || []).map((row) => ({
      id: row.Id,
      name: row.VALUE,
      description: row.DESCRIPTION || null,
    }));

    res.json(states);
  } catch (err) {
    try {
      const LOCATION_DATA = readLocationData();
      res.json(LOCATION_DATA.states || []);
    } catch {
      console.error('Get states error:', err && err.message ? err.message : err);
      res.status(500).json([]);
    }
  }
});

// GET /cities?state=<stateId|stateName>
router.get('/cities', async (req, res) => {
  try {
    const stateQuery = req.query.state;
    if (!stateQuery) return res.json([]);

    let stateId = null;
    let stateNames = [];
    const numericStateId = Number(stateQuery);

    if (!Number.isNaN(numericStateId)) {
      stateId = numericStateId;
      const state = await State.findOne({
        where: { Id: stateId },
        attributes: ['VALUE', 'DESCRIPTION'],
        raw: true,
      });
      if (state) {
        stateNames = [state.VALUE, state.DESCRIPTION].filter(Boolean).map((name) => String(name).trim());
      }
    } else {
      const state = await State.findOne({
        where: {
          [Op.or]: [
            { VALUE: String(stateQuery).trim() },
            { DESCRIPTION: String(stateQuery).trim() },
          ],
        },
        attributes: ['Id', 'VALUE', 'DESCRIPTION'],
        raw: true,
      });
      stateId = state ? state.Id : null;
      if (state) {
        stateNames = [state.VALUE, state.DESCRIPTION].filter(Boolean).map((name) => String(name).trim());
      } else {
        stateNames = [String(stateQuery).trim()];
      }
    }

    const cityWhere = {};
    if (stateId && stateNames.length > 0) {
      cityWhere[Op.or] = [{ StateId: stateId }, { StateName: { [Op.in]: stateNames } }];
    } else if (stateId) {
      cityWhere.StateId = stateId;
    } else if (stateNames.length > 0) {
      cityWhere.StateName = { [Op.in]: stateNames };
    } else {
      return res.json([]);
    }

    const cityRows = await City.findAll({
      where: cityWhere,
      attributes: ['Id', 'Value', 'Description', 'StateId', 'StateName'],
      order: [['Value', 'ASC']],
      raw: true,
    });

    const seen = new Set();
    const cities = [];
    for (const row of (cityRows || [])) {
      if (seen.has(row.Id)) continue;
      seen.add(row.Id);
      cities.push({
        id: row.Id,
        name: row.Value,
        description: row.Description || null,
        stateId: row.StateId,
        stateName: row.StateName || null,
      });
    }

    res.json(cities);
  } catch (err) {
    try {
      const LOCATION_DATA = readLocationData();
      const stateQuery = req.query.state;
      if (!stateQuery) return res.json([]);
      const stateId = resolveStateId(stateQuery, LOCATION_DATA);
      if (!stateId) return res.json([]);
      res.json(LOCATION_DATA.cities[stateId] || []);
    } catch {
      console.error('Get cities error:', err && err.message ? err.message : err);
      res.status(500).json([]);
    }
  }
});

// GET /pincodes?city=<cityId|cityName>
router.get('/pincodes', async (req, res) => {
  try {
    const cityQuery = req.query.city;
    if (!cityQuery) return res.json([]);

    let cityId = null;
    const numericCityId = Number(cityQuery);

    if (!Number.isNaN(numericCityId)) {
      cityId = numericCityId;
    } else {
      const city = await City.findOne({
        where: { Value: String(cityQuery).trim() },
        attributes: ['Id'],
        raw: true,
      });
      cityId = city ? city.Id : null;
    }

    if (!cityId) return res.json([]);

    const pincodeRows = await Pincode.findAll({
      where: { City_ID: cityId },
      attributes: ['Id', 'VALUE', 'DESCRIPTION', 'City_ID'],
      order: [['VALUE', 'ASC']],
      raw: true,
    });

    const pincodes = (pincodeRows || []).map((row) => ({
      id: row.Id,
      value: row.VALUE,
      description: row.DESCRIPTION || null,
      cityId: row.City_ID,
    }));

    res.json(pincodes);
  } catch (err) {
    try {
      const LOCATION_DATA = readLocationData();
      const cityQuery = req.query.city;
      if (!cityQuery) return res.json([]);
      const cityKey = resolveCityKey(cityQuery, LOCATION_DATA);
      if (!cityKey) return res.json([]);
      res.json(LOCATION_DATA.pincodes[cityKey] || []);
    } catch {
      console.error('Get pincodes error:', err && err.message ? err.message : err);
      res.status(500).json([]);
    }
  }
});

export default router;

