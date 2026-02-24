import { sequelize,
  Product, SparePart, Customer, Technicians, Replacements, TATTracking, TATHolds,
  HappyCodes, ActionLog, Cartons, CustomersProducts, Calls, CallSpareUsage,
  CallTechnicianAssignment, CallCancellationRequests, SpareRequest, SpareRequestItem,
  ServiceInvoice, ServiceInvoiceItem, GoodsMovementItems, DefectSpares, SpareInventory,
  SAPDocumentItems
} from "../models/index.js";
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const remaining = [
  'Product','SparePart','Customer','Technicians','Replacements','TATTracking','TATHolds',
  'HappyCodes','ActionLog','Cartons','CustomersProducts','Calls','CallSpareUsage',
  'CallTechnicianAssignment','CallCancellationRequests','SpareRequest','SpareRequestItem',
  'ServiceInvoice','ServiceInvoiceItem','GoodsMovementItems','DefectSpares','SpareInventory','SAPDocumentItems'
];

const logPath = path.resolve(process.cwd(), 'sync_remaining_errors.log');
fs.writeFileSync(logPath, `Sync remaining models run at ${new Date().toISOString()}\n\n`);

const run = async () => {
  try {
    console.log('🔌 Testing DB connection...');
    await sequelize.authenticate();
    console.log('✅ Connected');

    for (const name of remaining) {
      const model = sequelize.models[name];
      if (!model) {
        const msg = `${name} - model not found\n`;
        console.log(msg.trim());
        fs.appendFileSync(logPath, msg);
        continue;
      }

      try {
        console.log(`⏳ Syncing ${name}...`);
        // Use force:false to avoid destructive drops; change to true if you want recreate
        await model.sync({ force: false, alter: false });
        const ok = `${name} - synced successfully\n`;
        console.log(ok.trim());
        fs.appendFileSync(logPath, ok);
      } catch (err) {
        const message = err.original?.message || err.message || String(err);
        const sql = err.original?.sql || '';
        const stack = err.stack || '';
        const out = [`${name} - FAILED`, `Error: ${message}`, `SQL: ${sql}`, `STACK: ${stack}`, '---\n'].join('\n');
        console.error(out);
        fs.appendFileSync(logPath, out + '\n');
      }
    }

    console.log('\n➡️  Finished. See sync_remaining_errors.log for details');
    process.exit(0);
  } catch (e) {
    console.error('Fatal error:', e.message || e);
    fs.appendFileSync(logPath, `Fatal: ${e.stack || e}\n`);
    process.exit(1);
  }
};

run();
