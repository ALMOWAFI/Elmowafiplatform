export const up = async (queryInterface, Sequelize) => {
  await queryInterface.createTable('users', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
    },
    email: {
      type: Sequelize.STRING(255),
      allowNull: false,
      unique: true,
    },
    password: {
      type: Sequelize.STRING(255),
      allowNull: false,
    },
    first_name: {
      type: Sequelize.STRING(100),
    },
    last_name: {
      type: Sequelize.STRING(100),
    },
    role: {
      type: Sequelize.ENUM('admin', 'user', 'family_member'),
      defaultValue: 'user',
    },
    is_active: {
      type: Sequelize.BOOLEAN,
      defaultValue: true,
    },
    last_login: {
      type: Sequelize.DATE,
    },
    created_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
    },
    updated_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
    },
  });

  await queryInterface.createTable('family_groups', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: Sequelize.STRING(255),
      allowNull: false,
    },
    created_by: {
      type: Sequelize.UUID,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    created_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
    },
    updated_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
    },
  });

  await queryInterface.createTable('family_members', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: Sequelize.UUID,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    family_group_id: {
      type: Sequelize.UUID,
      references: {
        model: 'family_groups',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    first_name: {
      type: Sequelize.STRING(100),
      allowNull: false,
    },
    last_name: {
      type: Sequelize.STRING(100),
    },
    date_of_birth: {
      type: Sequelize.DATEONLY,
    },
    relationship: {
      type: Sequelize.STRING(100),
    },
    created_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
    },
    updated_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
    },
  });

  // Add composite unique index for user_id and family_group_id
  await queryInterface.addIndex('family_members', ['user_id', 'family_group_id'], {
    unique: true,
    name: 'family_members_user_family_unique',
  });

  await queryInterface.createTable('travel_plans', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: Sequelize.UUID,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    family_group_id: {
      type: Sequelize.UUID,
      references: {
        model: 'family_groups',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    destination: {
      type: Sequelize.STRING(255),
      allowNull: false,
    },
    start_date: {
      type: Sequelize.DATEONLY,
      allowNull: false,
    },
    end_date: {
      type: Sequelize.DATEONLY,
      allowNull: false,
    },
    budget: {
      type: Sequelize.DECIMAL(10, 2),
    },
    status: {
      type: Sequelize.ENUM('planning', 'booked', 'in_progress', 'completed', 'cancelled'),
      defaultValue: 'planning',
    },
    notes: {
      type: Sequelize.TEXT,
    },
    created_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
    },
    updated_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
    },
  });

  await queryInterface.createTable('travel_preferences', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
    },
    travel_plan_id: {
      type: Sequelize.UUID,
      references: {
        model: 'travel_plans',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    preference_type: {
      type: Sequelize.ENUM('accommodation', 'activity', 'dietary', 'accessibility', 'other'),
      allowNull: false,
    },
    name: {
      type: Sequelize.STRING(255),
      allowNull: false,
    },
    value: {
      type: Sequelize.TEXT,
    },
    priority: {
      type: Sequelize.INTEGER,
      defaultValue: 0,
    },
    created_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
    },
    updated_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
    },
  });

  // Add index for travel_plan_id and preference_type
  await queryInterface.addIndex('travel_preferences', ['travel_plan_id', 'preference_type'], {
    name: 'travel_preferences_plan_type_idx',
  });

  // Create function for updating updated_at timestamp
  await queryInterface.sequelize.query(`
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  // Create triggers for each table to update updated_at
  const tables = ['users', 'family_groups', 'family_members', 'travel_plans', 'travel_preferences'];
  
  for (const table of tables) {
    await queryInterface.sequelize.query(`
      DROP TRIGGER IF EXISTS update_${table}_updated_at ON ${table};
      CREATE TRIGGER update_${table}_updated_at
      BEFORE UPDATE ON ${table}
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
    `);
  }
};

export const down = async (queryInterface, Sequelize) => {
  // Drop tables in reverse order of creation
  await queryInterface.dropTable('travel_preferences');
  await queryInterface.dropTable('travel_plans');
  await queryInterface.dropTable('family_members');
  await queryInterface.dropTable('family_groups');
  await queryInterface.dropTable('users');
  
  // Drop the update_updated_at_column function
  await queryInterface.sequelize.query('DROP FUNCTION IF EXISTS update_updated_at_column()');
};
