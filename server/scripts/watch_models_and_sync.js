const fs = require('fs');
const path = require('path');
const { sync } = require('../models');
const { sequelize } = require('../db');

const modelsDir = path.join(__dirname, '..', 'models');

let timer = null;
function scheduleSync() {
  if (timer) clearTimeout(timer);
  timer = setTimeout(async () => {
    console.log('[watch-sync] Detected model change — running sequelize.sync({ alter: true })');
    try {
      await sync({ alter: true });
      console.log('[watch-sync] Sync completed successfully');
    } catch (err) {
      console.error('[watch-sync] Sync failed:', err);
    }
  }, 500);
}

console.log('[watch-sync] Watching models directory:', modelsDir);

fs.watch(modelsDir, { recursive: true }, (eventType, filename) => {
  if (!filename) return;
  if (filename.endsWith('.js')) {
    console.log(`[watch-sync] ${eventType} detected on ${filename}`);
    scheduleSync();
  }
});

// Keep the process alive
process.stdin.resume();

