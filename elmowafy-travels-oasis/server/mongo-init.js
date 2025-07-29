// Create admin user and database
const adminDb = db.getSiblingDB('admin');

// Create admin user if it doesn't exist
adminDb.createUser({
  user: process.env.MONGO_INITDB_ROOT_USERNAME,
  pwd: process.env.MONGO_INITDB_ROOT_PASSWORD,
  roles: [{ role: 'root', db: 'admin' }]
});

// Authenticate as admin
adminDb.auth({
  user: process.env.MONGO_INITDB_ROOT_USERNAME,
  pwd: process.env.MONGO_INITDB_ROOT_PASSWORD,
  mechanism: 'SCRAM-SHA-1'
});

// Create application database
const dbName = 'elmowafy';
const db = db.getSiblingDB(dbName);

// Create application user with readWrite role
db.createUser({
  user: process.env.MONGO_USERNAME || 'elmowafy_user',
  pwd: process.env.MONGO_PASSWORD || 'change_this_password',
  roles: [{ role: 'readWrite', db: dbName }]
});

// Create collections and initial data
const collections = ['familyMembers', 'users', 'memories', 'places'];

collections.forEach(collection => {
  if (!db.getCollectionNames().includes(collection)) {
    db.createCollection(collection);
    print(`Created collection: ${collection}`);
  }
});

// Create indexes for better query performance
db.familyMembers.createIndex({ name: 'text', arabicName: 'text' });
db.familyMembers.createIndex({ parents: 1 });
db.familyMembers.createIndex({ spouse: 1 });
db.memories.createIndex({ title: 'text', description: 'text' });
db.places.createIndex({ name: 'text', 'location.coordinates': '2dsphere' });

print('MongoDB initialization completed successfully!');
