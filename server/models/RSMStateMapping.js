import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const RSMStateMapping = sequelize.define(
    'RSMStateMapping',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'id',
      },
      role_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'role_id',
        // FK removed - added via ALTER TABLE
      },
      rsm_user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'rsm_user_id',
        // FK removed - added via ALTER TABLE
      },
      state_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'state_id',
        // FK removed - added via ALTER TABLE
      },
      effective_from: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: 'effective_from',
      },
      effective_to: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'effective_to',
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
      tableName: 'rsm_state_mapping',
      timestamps: false,
    }
  );

  return RSMStateMapping;
};
