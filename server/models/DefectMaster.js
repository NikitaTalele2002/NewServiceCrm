import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const DefectMaster = sequelize.define(
    'DefectMaster',
    {
      defect_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'defect_id',
      },
      defect_code: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        field: 'defect_code',
      },
      defect_name: {
        type: DataTypes.STRING(200),
        allowNull: false,
        field: 'defect_name',
      },
      defect_description: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'defect_description',
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: 'is_active',
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
      tableName: 'defect_master',
      timestamps: false,
    }
  );

  return DefectMaster;
};
