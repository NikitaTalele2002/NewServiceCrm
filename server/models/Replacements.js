import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const Replacements = sequelize.define(
    'Replacements',
    {
      replacements_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'replacements_id',
      },
      call_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'call_id',
        // FK removed - added via ALTER TABLE
      },
      customers_products_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'customers_products_id',
        // FK removed - added via ALTER TABLE
      },
      reason: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'reason',
      },
      status: {
        type: DataTypes.ENUM('pending', 'approved', 'rejected', 'completed', 'cancelled'),
        defaultValue: 'pending',
        field: 'status',
      },
      service_tag_no: {
        type: DataTypes.STRING(100),
        allowNull: true,
        field: 'service_tag_no',
      },
      requested_date: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: 'requested_date',
      },
      technician_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'technician_id',
        // FK removed - added via ALTER TABLE
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: 'created_at',
      },
      updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: 'updated_at',
      },
    },
    {
      tableName: 'replacements',
      timestamps: false,
    }
  );

  return Replacements;
};
