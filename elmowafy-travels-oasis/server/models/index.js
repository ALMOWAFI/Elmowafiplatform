import User from './user.model.js';
import FamilyGroup from './familyGroup.model.js';
import FamilyMember from './familyMember.model.js';
import TravelPlan from './travelPlan.model.js';
import TravelPreference from './travelPreference.model.js';

// Define model associations
const setupAssociations = () => {
  // User has many FamilyGroups (as creator)
  User.hasMany(FamilyGroup, {
    foreignKey: 'created_by',
    as: 'createdGroups'
  });
  FamilyGroup.belongsTo(User, {
    foreignKey: 'created_by',
    as: 'creator'
  });

  // User has many FamilyMembers (as family members)
  User.hasMany(FamilyMember, {
    foreignKey: 'user_id',
    as: 'familyMemberships'
  });
  FamilyMember.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'user'
  });

  // FamilyGroup has many FamilyMembers
  FamilyGroup.hasMany(FamilyMember, {
    foreignKey: 'family_group_id',
    as: 'members'
  });
  FamilyMember.belongsTo(FamilyGroup, {
    foreignKey: 'family_group_id',
    as: 'familyGroup'
  });

  // User has many TravelPlans
  User.hasMany(TravelPlan, {
    foreignKey: 'user_id',
    as: 'travelPlans'
  });
  TravelPlan.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'user'
  });

  // FamilyGroup has many TravelPlans
  FamilyGroup.hasMany(TravelPlan, {
    foreignKey: 'family_group_id',
    as: 'travelPlans'
  });
  TravelPlan.belongsTo(FamilyGroup, {
    foreignKey: 'family_group_id',
    as: 'familyGroup'
  });

  // TravelPlan has many TravelPreferences
  TravelPlan.hasMany(TravelPreference, {
    foreignKey: 'travel_plan_id',
    as: 'preferences'
  });
  TravelPreference.belongsTo(TravelPlan, {
    foreignKey: 'travel_plan_id',
    as: 'travelPlan'
  });
};

const models = {
  User,
  FamilyGroup,
  FamilyMember,
  TravelPlan,
  TravelPreference,
  sequelize,
  setupAssociations,
};

export default models;
