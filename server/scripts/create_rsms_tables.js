import { poolPromise } from '../db.js';

async function run() {
  try {
    const pool = await poolPromise;

    const createRsms = `
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='rsms' AND xtype='U')
BEGIN
  CREATE TABLE rsms (
    rsm_id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL,
    role_id INT NOT NULL,
    rsm_code NVARCHAR(50) NULL UNIQUE,
    rsm_name NVARCHAR(100) NOT NULL,
    email NVARCHAR(150) NULL UNIQUE,
    phone NVARCHAR(20) NULL,
    status NVARCHAR(20) DEFAULT 'active',
    is_active BIT DEFAULT 1,
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE(),
    CONSTRAINT FK_rsms_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT FK_rsms_role FOREIGN KEY (role_id) REFERENCES roles(roles_id)
  );
END`;

    console.log('Creating rsms table (if not exists)...');
    await pool.request().query(createRsms);
    console.log('rsms table ensured.');

    // No plant_rsms table - RSM is mapped to states via rsm_state_mapping

    console.log('Done.');
    process.exit(0);
  } catch (err) {
    console.error('Error creating tables:', err && err.message ? err.message : err);
    process.exit(1);
  }
}

run();
