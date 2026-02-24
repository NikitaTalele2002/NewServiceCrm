import { sequelize } from '../models/index.js';

const queries = {
  totalFks: `SELECT COUNT(*) AS total_fk FROM sys.foreign_keys WHERE name LIKE 'FK_%'`,
  listFks: `SELECT fk.name AS constraint_name, OBJECT_NAME(fk.parent_object_id) AS table_name, COL_NAME(fkc.parent_object_id, fkc.parent_column_id) AS column_name, OBJECT_NAME(fk.referenced_object_id) AS referenced_table, COL_NAME(fkc.referenced_object_id, fkc.referenced_column_id) AS referenced_column FROM sys.foreign_keys fk JOIN sys.foreign_key_columns fkc ON fk.object_id = fkc.constraint_object_id WHERE fk.name LIKE 'FK_%' ORDER BY fk.name`,
  usersIncoming: `SELECT fk.name AS constraint_name, OBJECT_NAME(fk.parent_object_id) AS referencing_table, COL_NAME(fkc.parent_object_id, fkc.parent_column_id) AS referencing_column FROM sys.foreign_keys fk JOIN sys.foreign_key_columns fkc ON fk.object_id = fkc.constraint_object_id WHERE OBJECT_NAME(fk.referenced_object_id) = 'users'`,
  usersOutgoing: `SELECT fk.name AS constraint_name, OBJECT_NAME(fk.parent_object_id) AS parent_table, COL_NAME(fkc.parent_object_id, fkc.parent_column_id) AS parent_column, OBJECT_NAME(fk.referenced_object_id) AS referenced_table, COL_NAME(fkc.referenced_object_id, fkc.referenced_column_id) AS referenced_column FROM sys.foreign_keys fk JOIN sys.foreign_key_columns fkc ON fk.object_id = fkc.constraint_object_id WHERE OBJECT_NAME(fk.parent_object_id) = 'users'`
};

(async () => {
  try {
    await sequelize.authenticate();
    console.log('Connected to DB');

    const [total] = await sequelize.query(queries.totalFks, { type: sequelize.QueryTypes.SELECT });
    console.log(`Total FK constraints (name LIKE 'FK_%'): ${total.total_fk}`);

    console.log('\n--- FKs (sample, first 100 rows) ---');
    const [rows] = await sequelize.query(queries.listFks, { raw: true });
    rows.slice(0, 100).forEach(r => console.log(`${r.constraint_name} : ${r.table_name}.${r.column_name} -> ${r.referenced_table}.${r.referenced_column}`));

    console.log('\n--- Users: incoming FKs (other tables referencing users) ---');
    const [inRows] = await sequelize.query(queries.usersIncoming, { raw: true });
    inRows.forEach(r => console.log(`${r.constraint_name} : ${r.referencing_table}.${r.referencing_column}`));
    console.log(`Incoming FK count: ${inRows.length}`);

    console.log('\n--- Users: outgoing FKs (constraints on users table) ---');
    const [outRows] = await sequelize.query(queries.usersOutgoing, { raw: true });
    outRows.forEach(r => console.log(`${r.constraint_name} : ${r.parent_table}.${r.parent_column} -> ${r.referenced_table}.${r.referenced_column}`));
    console.log(`Outgoing FK count: ${outRows.length}`);

    await sequelize.close();
    process.exit(0);
  } catch (err) {
    console.error('Error querying FKs:', err.message || err);
    console.error(err);
    process.exit(1);
  }
})();
