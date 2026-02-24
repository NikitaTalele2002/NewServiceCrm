#!/usr/bin/env node
// One-off helper to sync Sequelize models to the database.
// WARNING: This will alter database schema (run only after taking a DB backup).
import dotenv from 'dotenv';
dotenv.config();

import { sync } from '../models/index.js';

async function run() {
  try {
    console.log('Starting Sequelize sync({ alter: true }) — this may change your DB schema.');
    await sync({ alter: true, force: false });
    console.log('Sequelize sync completed. Review DB (SSMS) to confirm constraints.');
    process.exit(0);
  } catch (err) {
    console.error('Sequelize sync failed:', err && err.message ? err.message : err);
    process.exit(2);
  }
}

run();
