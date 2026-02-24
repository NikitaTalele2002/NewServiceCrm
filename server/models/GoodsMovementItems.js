import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const GoodsMovementItems = sequelize.define(
    'GoodsMovementItems',
    {
      movement_item_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'movement_item_id',
      },
      carton_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'carton_id',
        // FK removed to avoid circular dependency - added via ALTER TABLE
      },
      movement_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'movement_id',
        // FK removed to avoid circular dependency - added via ALTER TABLE
      },
      spare_part_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'spare_part_id',
        references: {
          model: 'spare_parts',
          key: 'Id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      qty: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'qty',
      },
      condition: {
        type: DataTypes.ENUM('good', 'defective', 'damaged', 'partially_damaged'),
        defaultValue: 'good',
        field: 'condition',
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
      tableName: 'goods_movement_items',
      timestamps: false,
    }
  );

  return GoodsMovementItems;
};
