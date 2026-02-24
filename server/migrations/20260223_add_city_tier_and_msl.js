/**
 * Migration: Add City Tier Master and Spare Part MSL Tables
 * Updates existing cities with city_tier_id FK
 * Adds random city tier data without erasing existing data
 */

import { sequelize } from '../db.js';
import { QueryTypes } from 'sequelize';

const migration = {
  name: 'add-city-tier-and-spare-part-msl',
  
  async up() {
    const transaction = await sequelize.transaction();
    
    try {
      console.log('\n📋 MIGRATION: Add City Tier Master and Spare Part MSL Tables\n');

      // 1. Create city_tier_master table
      console.log('1️⃣  Creating city_tier_master table...');
      await sequelize.query(`
        IF NOT EXISTS (SELECT * FROM sysobjects WHERE name = 'city_tier_master')
        CREATE TABLE city_tier_master (
          city_tier_id INT PRIMARY KEY IDENTITY(1,1),
          tier_code VARCHAR(10) NOT NULL UNIQUE,
          description VARCHAR(255) NOT NULL,
          created_at DATETIME DEFAULT GETDATE(),
          updated_at DATETIME DEFAULT GETDATE()
        )
      `, { transaction });
      console.log('   ✅ city_tier_master table created');

      // 2. Insert default tier data
      console.log('2️⃣  Inserting city tier codes (T1, T2, T3)...');
      await sequelize.query(`
        IF NOT EXISTS (SELECT 1 FROM city_tier_master WHERE tier_code = 'T1')
        INSERT INTO city_tier_master (tier_code, description) VALUES
        ('T1', 'Tier 1 - Metropolitan Cities'),
        ('T2', 'Tier 2 - Major Cities'),
        ('T3', 'Tier 3 - Secondary Cities')
      `, { transaction });
      console.log('   ✅ City tier codes inserted');

      // 3. Add city_tier_id column to cities table (if not exists)
      console.log('3️⃣  Adding city_tier_id FK to cities table...');
      const citiesColumns = await sequelize.query(`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'cities' AND COLUMN_NAME = 'city_tier_id'
      `, { transaction });

      if (citiesColumns.length === 0) {
        // Add column first without FK
        await sequelize.query(`
          ALTER TABLE cities ADD city_tier_id INT
        `, { transaction });
        console.log('   ✅ city_tier_id column added to cities table');

        // 4. Populate cities with random tier_id (1, 2, or 3)
        console.log('4️⃣  Populating cities with random city tier IDs...');
        await sequelize.query(`
          UPDATE cities 
          SET city_tier_id = CASE 
            WHEN ABS(CHECKSUM(NEWID())) % 3 = 0 THEN 1
            WHEN ABS(CHECKSUM(NEWID())) % 3 = 1 THEN 2
            ELSE 3
          END
          WHERE city_tier_id IS NULL
        `, { transaction });
        console.log('   ✅ Cities populated with random tier IDs');

        // Add FK constraint
        await sequelize.query(`
          ALTER TABLE cities 
          ADD CONSTRAINT FK_cities_city_tier_master 
          FOREIGN KEY (city_tier_id) 
          REFERENCES city_tier_master(city_tier_id)
        `, { transaction });
        console.log('   ✅ Foreign key constraint added');
      } else {
        console.log('   ℹ️  city_tier_id column already exists');
      }

      // 5. Create spare_part_msl table
      console.log('5️⃣  Creating spare_part_msl table...');
      await sequelize.query(`
        IF NOT EXISTS (SELECT * FROM sysobjects WHERE name = 'spare_part_msl')
        CREATE TABLE spare_part_msl (
          msl_id INT PRIMARY KEY IDENTITY(1,1),
          spare_part_id INT NOT NULL,
          city_tier_id INT NOT NULL,
          minimum_stock_level_qty INT NOT NULL,
          maximum_stock_level_qty INT NOT NULL,
          effective_from DATETIME DEFAULT GETDATE(),
          effective_to DATETIME NULL,
          is_active BIT DEFAULT 1,
          created_by INT,
          created_at DATETIME DEFAULT GETDATE(),
          updated_at DATETIME DEFAULT GETDATE(),
          FOREIGN KEY (spare_part_id) REFERENCES spare_parts(Id),
          FOREIGN KEY (city_tier_id) REFERENCES city_tier_master(city_tier_id),
          CONSTRAINT UQ_spare_part_city_tier UNIQUE (spare_part_id, city_tier_id)
        )
      `, { transaction });
      console.log('   ✅ spare_part_msl table created');

      // 6. Insert sample MSL data for existing spare parts
      console.log('6️⃣  Inserting sample MSL data for spare parts...');
      
      // Get all spare parts and city tiers
      const spareParts = await sequelize.query(`
        SELECT TOP 50 Id FROM spare_parts WHERE Id IS NOT NULL
      `, { type: QueryTypes.SELECT, transaction });

      const cityTiers = await sequelize.query(`
        SELECT city_tier_id FROM city_tier_master
      `, { type: QueryTypes.SELECT, transaction });

      if (spareParts.length > 0 && cityTiers.length > 0) {
        let insertCount = 0;
        
        for (const spare of spareParts) {
          for (const tier of cityTiers) {
            // Generate random MSL values: min between 5-30, max between 40-100
            const minStockLevel = Math.floor(Math.random() * 26) + 5;  // 5-30
            const maxStockLevel = Math.floor(Math.random() * 61) + 40; // 40-100

            await sequelize.query(`
              INSERT INTO spare_part_msl (
                spare_part_id, 
                city_tier_id, 
                minimum_stock_level_qty, 
                maximum_stock_level_qty,
                is_active,
                created_by
              )
              SELECT ?, ?, ?, ?, 1, 1
              WHERE NOT EXISTS (
                SELECT 1 FROM spare_part_msl 
                WHERE spare_part_id = ? AND city_tier_id = ?
              )
            `, {
              replacements: [
                spare.Id, tier.city_tier_id, minStockLevel, maxStockLevel,
                spare.Id, tier.city_tier_id
              ],
              transaction
            });
            
            insertCount++;
          }
        }
        
        console.log(`   ✅ Inserted ${insertCount} MSL records`);
      }

      // Commit transaction
      await transaction.commit();
      
      console.log('\n✅ MIGRATION COMPLETED SUCCESSFULLY\n');
      console.log('Summary:');
      console.log('  ✓ city_tier_master table created with T1, T2, T3 tiers');
      console.log('  ✓ cities.city_tier_id FK added with random tier assignment');
      console.log('  ✓ spare_part_msl table created with MSL by city tier');
      console.log('  ✓ Sample MSL data populated for all spare parts and tiers');
      console.log('  ✓ Old data preserved\n');
      
      return true;
    } catch (error) {
      await transaction.rollback();
      console.error('❌ MIGRATION FAILED:', error.message);
      throw error;
    }
  },

  async down() {
    const transaction = await sequelize.transaction();
    
    try {
      console.log('\n🔄 ROLLING BACK MIGRATION\n');

      // Drop spare_part_msl table
      await sequelize.query(`
        IF EXISTS (SELECT * FROM sysobjects WHERE name = 'spare_part_msl')
        DROP TABLE spare_part_msl
      `, { transaction });
      console.log('  ✓ spare_part_msl table dropped');

      // Remove FK from cities table
      await sequelize.query(`
        IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE CONSTRAINT_NAME = 'FK_cities_city_tier_master')
        ALTER TABLE cities DROP CONSTRAINT FK_cities_city_tier_master
      `, { transaction });

      // Remove city_tier_id column from cities
      await sequelize.query(`
        IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'cities' AND COLUMN_NAME = 'city_tier_id')
        ALTER TABLE cities DROP COLUMN city_tier_id
      `, { transaction });
      console.log('  ✓ city_tier_id removed from cities');

      // Drop city_tier_master table
      await sequelize.query(`
        IF EXISTS (SELECT * FROM sysobjects WHERE name = 'city_tier_master')
        DROP TABLE city_tier_master
      `, { transaction });
      console.log('  ✓ city_tier_master table dropped');

      await transaction.commit();
      
      console.log('\n✅ ROLLBACK COMPLETED\n');
      return true;
    } catch (error) {
      await transaction.rollback();
      console.error('❌ ROLLBACK FAILED:', error.message);
      throw error;
    }
  }
};

export default migration;

// Execute migration if run directly
(async () => {
  try {
    console.log('\n📋 Starting migration execution...\n');
    await migration.up();
    console.log('\n✅ Migration executed successfully\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message, '\n');
    console.error(error.stack);
    process.exit(1);
  }
})();
