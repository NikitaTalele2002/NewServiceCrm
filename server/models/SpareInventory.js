import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const SpareInventory = sequelize.define(
    'SpareInventory',
    {
      spare_inventory_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'spare_inventory_id',
      },
      spare_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'spare_id',
        references: {
          model: 'spare_parts',
          key: 'Id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      location_type: {
        type: DataTypes.ENUM('warehouse', 'plant', 'service_center', 'technician', 'customer'),
        allowNull: false,
        field: 'location_type',
      },
      location_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'location_id',
      },
      qty_good: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'qty_good',
      },
      qty_defective: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'qty_defective',
      },
      qty_in_transit: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'qty_in_transit',
        comment: 'Quantity in transit between locations (BUCKET: IN_TRANSIT)'
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
      tableName: 'spare_inventory',
      timestamps: false,
    }
  );

  return SpareInventory;
};
