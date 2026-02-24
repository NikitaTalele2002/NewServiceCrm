import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const Users = sequelize.define(
    "Users",
    {
      user_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },

      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },

      password: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },


      is_locked: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },

      failed_login_attempts: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },

      last_password_change: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      password_expiry_date: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      unlock_requested_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },

      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },

      created_by:{
        type: DataTypes.INTEGER,
        allowNull: true,
        // FK removed - added via ALTER TABLE
      },
    },
    {
      tableName: "users",
      timestamps: false,
    }
  );

  // Association: User belongs to Role
  Users.associate = (models) => {
    Users.belongsTo(models.Roles, {
      foreignKey: 'role_id',
      as: 'role',
    });
  };

  return Users;
};
