import { sequelize } from '../models/index.js';

const queries = [
  `ALTER TABLE [ProductModels] ALTER COLUMN [Product] INT NULL`,
  `ALTER TABLE [ProductModels] ADD CONSTRAINT [FK_ProductModels_products_Product] FOREIGN KEY ([Product]) REFERENCES [products]([product_id]) ON DELETE NO ACTION ON UPDATE NO ACTION`,
  `ALTER TABLE [customers] ALTER COLUMN [pincode] INT NULL`,
  `ALTER TABLE [customers] ADD CONSTRAINT [FK_customers_Pincodes_pincode] FOREIGN KEY ([pincode]) REFERENCES [Pincodes]([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION`
];

const run = async () => {
  try {
    console.log('Connecting to DB...');
    await sequelize.authenticate();
    console.log('Connected');

    for (let i = 0; i < queries.length; i++) {
      const q = queries[i];
      try {
        console.log('Running:', q.split('\n')[0]);
        await sequelize.query(q);
        console.log('OK');
      } catch (err) {
        console.error('Error executing query:', err.original?.message || err.message || String(err));
      }
    }

    console.log('Done');
    process.exit(0);
  } catch (err) {
    console.error('Fatal:', err);
    process.exit(1);
  }
};

run();
