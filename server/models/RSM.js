import { DataTypes } from 'sequelize';

export default (sequelize) => {
	const RSM = sequelize.define(
		'RSM',
		{
			rsm_id: {
				type: DataTypes.INTEGER,
				primaryKey: true,
				autoIncrement: true,
				field: 'rsm_id',
			},
			user_id: {
				type: DataTypes.INTEGER,
				allowNull: false,
				field: 'user_id',
				references: {
					model: 'users',
					key: 'user_id',
				},
				onDelete: 'CASCADE',
				onUpdate: 'CASCADE',
			},
			role_id: {
				type: DataTypes.INTEGER,
				allowNull: false,
				field: 'role_id',
				references: {
					model: 'roles',
					key: 'roles_id',
				},
				onDelete: 'CASCADE',
				onUpdate: 'CASCADE',
			},
			rsm_code: {
				type: DataTypes.STRING(100),
				allowNull: true,
				field: 'rsm_code',
			},
			rsm_name: {
				type: DataTypes.STRING(200),
				allowNull: false,
				field: 'rsm_name',
			},
			email: {
				type: DataTypes.STRING(150),
				allowNull: true,
				field: 'email',
			},
			phone: {
				type: DataTypes.STRING(50),
				allowNull: true,
				field: 'phone',
			},
			status: {
				type: DataTypes.ENUM('active', 'inactive'),
				defaultValue: 'active',
				field: 'status',
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
			tableName: 'rsms',
			timestamps: false,
		}
	);

	return RSM;
};
