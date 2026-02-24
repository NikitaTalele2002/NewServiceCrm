import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const DefectSpares = sequelize.define(
    'DefectSpares',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'id',
      },
      defect_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'defect_id',
        references: {
          model: 'defect_master',
          key: 'defect_id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
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
      is_primary: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'is_primary',
      },
      recommended_qty: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
        field: 'recommended_qty',
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
      tableName: 'defect_spares',
      timestamps: false,
    }
  );

  return DefectSpares;
};
