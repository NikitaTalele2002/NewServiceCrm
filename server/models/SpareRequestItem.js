import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const SpareRequestItem = sequelize.define(
    'SpareRequestItem',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'id',
      },
      request_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'request_id',
        // FK removed - added via ALTER TABLE
      },
      spare_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'spare_id',
        // FK removed - added via ALTER TABLE
      },
      requested_qty: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'requested_qty',
      },
      approved_qty: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0,
        field: 'approved_qty',
      },
      rejection_reason: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'rejection_reason',
      },
      unit_price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        field: 'unit_price',
      },
      line_price: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: true,
        field: 'line_price',
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
      tableName: 'spare_request_items',
      timestamps: false,
      underscored: true,
    }
  );

  return SpareRequestItem;
};
