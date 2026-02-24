import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const Cartons = sequelize.define(
    'Cartons',
    {
      carton_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'carton_id',
      },
      movement_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'movement_id',
        // FK removed to avoid circular dependency - added via ALTER TABLE
      },
      carton_number: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        field: 'carton_number',
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
      tableName: 'cartons',
      timestamps: false,
    }
  );

  return Cartons;
};
