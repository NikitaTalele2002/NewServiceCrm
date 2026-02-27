import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const TechnicianSpareReturnItem = sequelize.define(
    'TechnicianSpareReturnItem',
    {
      return_item_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'return_item_id',
      },
      return_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'return_id',
        references: {
          model: 'technician_spare_returns',
          key: 'return_id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      spare_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'spare_id',
        references: {
          model: 'spare_parts',
          key: 'Id',
        },
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      },
      item_type: {
        type: DataTypes.ENUM(
          'defective',    // Defective spare collected from customer
          'unused'        // Spare part that was not used in the call
        ),
        allowNull: false,
        field: 'item_type',
      },
      requested_qty: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'requested_qty',
        comment: 'Quantity technician intends to return',
      },
      received_qty: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'received_qty',
        comment: 'Quantity actually received at service center',
      },
      verified_qty: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'verified_qty',
        comment: 'Quantity after verification (may differ from received if damaged)',
      },
      defect_reason: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'defect_reason',
        comment: 'Reason why spare was defective (e.g., "Not working", "Damaged")',
      },
      condition_on_receipt: {
        type: DataTypes.ENUM(
          'good',      // Received in good condition
          'damaged',   // Damaged during transit
          'defective'  // Still defective as described
        ),
        allowNull: true,
        field: 'condition_on_receipt',
        comment: 'Condition of item when received at SC',
      },
      remarks: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'remarks',
        comment: 'Additional notes about this item',
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
      tableName: 'technician_spare_return_items',
      timestamps: false,
      freezeTableName: true,
      underscored: true,
      paranoid: false,
    }
  );

  return TechnicianSpareReturnItem;
};
