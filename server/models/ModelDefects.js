import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const ModelDefects = sequelize.define(
    'ModelDefects',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'id',
      },
      model_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'model_id',
        references: {
          model: 'ProductModels',
          key: 'Id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
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
      tableName: 'model_defects',
      timestamps: false,
    }
  );

  return ModelDefects;
};
