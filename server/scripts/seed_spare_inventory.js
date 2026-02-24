import { sequelize, connectDB } from '../db.js';
// Ensure models are initialized
import('../models/index.js');

// Seed spare_inventory for service_centers (ASC) and plants (branches)
async function seed() {
  try {
    // ensure DB connection
    await connectDB();

    const SpareInventory = sequelize.models.SpareInventory;
    const SparePart = sequelize.models.SparePart;
    const ServiceCenter = sequelize.models.ServiceCenter;
    const Plant = sequelize.models.Plant;

    if (!SpareInventory) {
      console.error('SpareInventory model not available');
      process.exit(1);
    }

    // Fetch sample spares
    const spares = await SparePart.findAll({ attributes: ['Id'], limit: 5 });
    if (!spares || spares.length === 0) {
      console.error('No spare parts found to seed');
      process.exit(1);
    }

    const spareIds = spares.map(s => s.Id);

    // Fetch some service centers (ASC) - model uses `asc_id` as PK
    const scs = await ServiceCenter.findAll({ attributes: ['asc_id'], limit: 3 });
    const scIds = scs.map(s => s.asc_id);

    // Fetch some plants (branches)
    const plants = await Plant.findAll({ attributes: ['plant_id'], limit: 3 });
    const plantIds = plants.map(p => p.plant_id);

    const now = new Date();

    // Helper to upsert (find or create) inventory rows
    async function upsertInventory(spare_id, location_type, location_id, qty_good = 50, qty_defective = 0) {
      const where = { spare_id, location_type, location_id };
      const existing = await SpareInventory.findOne({ where });
      if (existing) {
        existing.qty_good = (existing.qty_good || 0) + qty_good;
        existing.qty_defective = (existing.qty_defective || 0) + qty_defective;
        existing.updated_at = now;
        await existing.save();
        return { action: 'updated', row: existing };
      }

      const created = await SpareInventory.create({
        spare_id,
        location_type,
        location_id,
        qty_good,
        qty_defective,
        created_at: now,
        updated_at: now
      });
      return { action: 'created', row: created };
    }

    const results = [];

    // Seed for service centers (ASC)
    for (const scId of scIds) {
      for (const spareId of spareIds) {
        const r = await upsertInventory(spareId, 'service_center', scId, Math.floor(Math.random() * 80) + 20, Math.floor(Math.random() * 5));
        results.push(r);
      }
    }

    // Seed for plants (branches)
    for (const plantId of plantIds) {
      for (const spareId of spareIds) {
        const r = await upsertInventory(spareId, 'branch', plantId, Math.floor(Math.random() * 60) + 10, Math.floor(Math.random() * 3));
        results.push(r);
      }
    }

    console.log(`Seeded ${results.length} spare inventory rows (created/updated).`);
    process.exit(0);
  } catch (err) {
    console.error('Error seeding spare inventory:', err);
    process.exit(1);
  }
}

seed();
