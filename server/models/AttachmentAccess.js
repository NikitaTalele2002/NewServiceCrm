import { DataTypes } from 'sequelize';
//12
export default (sequelize) => {
  const AttachmentAccess = sequelize.define(
    'AttachmentAccess',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'id',
      },
      attachment_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'attachment_id',
        references: {
          model: 'attachments',
          key: 'attachment_id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      access_type: {
        type: DataTypes.ENUM('role', 'user'),
        allowNull: false,
        field: 'access_type',
      },
      role_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'role_id',
        references: {
          model: 'roles',
          key: 'roles_id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'user_id',
        references: {
          model: 'users',
          key: 'user_id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      can_view: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: 'can_view',
      },
      can_download: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'can_download',
      },
      can_delete: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'can_delete',
      },
      granted_by_user_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'granted_by_user_id',
        references: {
          model: 'users',
          key: 'user_id',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      granted_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: 'granted_at',
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
      tableName: 'attachment_access',
      timestamps: false,
    }
  );

  return AttachmentAccess;
};
