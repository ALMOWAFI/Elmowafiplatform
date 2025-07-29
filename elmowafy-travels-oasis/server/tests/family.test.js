const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');
const app = require('../app');
const FamilyMember = require('../models/FamilyMember');
const { createTestUser, getAuthToken } = require('./testUtils');

let mongoServer;
let authToken;
let testUser;

// Test data
const testMember1 = {
  name: 'John Doe',
  arabicName: 'جون دو',
  gender: 'Male',
  dob: '1990-01-01',
  bio: 'Test bio',
  arabicBio: 'سيرة ذاتية تجريبية',
  profilePicture: 'https://example.com/profile.jpg'
};

const testMember2 = {
  name: 'Jane Smith',
  arabicName: 'جين سميث',
  gender: 'Female',
  dob: '1992-02-02',
  bio: 'Another test bio',
  arabicBio: 'سيرة ذاتية تجريبية أخرى',
  profilePicture: 'https://example.com/profile2.jpg'
};

// Setup test database and server
beforeAll(async () => {
  // Start in-memory MongoDB server
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  // Connect to the in-memory database
  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  // Create test user and get auth token
  testUser = await createTestUser();
  authToken = await getAuthToken(testUser);
});

// Clean up test database after each test
afterEach(async () => {
  await FamilyMember.deleteMany({});
});

// Close database connection after all tests
afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Family Member API', () => {
  describe('POST /api/family', () => {
    it('should create a new family member', async () => {
      const res = await request(app)
        .post('/api/family')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testMember1);
      
      expect(res.statusCode).toEqual(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data.member.name).toBe(testMember1.name);
      expect(res.body.data.member.arabicName).toBe(testMember1.arabicName);
    });

    it('should not create a family member with duplicate name', async () => {
      // First create a member
      await FamilyMember.create(testMember1);
      
      // Try to create another member with the same name
      const res = await request(app)
        .post('/api/family')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testMember1);
      
      expect(res.statusCode).toEqual(400);
      expect(res.body.status).toBe('fail');
    });
  });

  describe('GET /api/family', () => {
    it('should get all family members', async () => {
      // Create test members
      await FamilyMember.create([testMember1, testMember2]);
      
      const res = await request(app)
        .get('/api/family')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.members.length).toBe(2);
    });
  });

  describe('GET /api/family/:id', () => {
    it('should get a single family member', async () => {
      const member = await FamilyMember.create(testMember1);
      
      const res = await request(app)
        .get(`/api/family/${member._id}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.member.name).toBe(testMember1.name);
    });

    it('should return 404 for non-existent member', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      
      const res = await request(app)
        .get(`/api/family/${nonExistentId}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.statusCode).toEqual(404);
    });
  });

  describe('PATCH /api/family/:id', () => {
    it('should update a family member', async () => {
      const member = await FamilyMember.create(testMember1);
      const updateData = { name: 'Updated Name' };
      
      const res = await request(app)
        .patch(`/api/family/${member._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);
      
      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.member.name).toBe(updateData.name);
    });
  });

  describe('DELETE /api/family/:id', () => {
    it('should soft delete a family member', async () => {
      const member = await FamilyMember.create(testMember1);
      
      const res = await request(app)
        .delete(`/api/family/${member._id}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.statusCode).toEqual(204);
      
      // Verify soft delete
      const deletedMember = await FamilyMember.findById(member._id);
      expect(deletedMember.isActive).toBe(false);
    });
  });

  describe('Family Relationships', () => {
    let parent1, parent2, child1, child2;
    
    beforeEach(async () => {
      // Create family members with relationships
      parent1 = await FamilyMember.create({
        ...testMember1,
        name: 'Parent One',
        arabicName: 'الأب الأول'
      });
      
      parent2 = await FamilyMember.create({
        ...testMember2,
        name: 'Parent Two',
        arabicName: 'الأم الأولى'
      });
      
      child1 = await FamilyMember.create({
        name: 'Child One',
        arabicName: 'الطفل الأول',
        gender: 'Male',
        parents: [parent1._id, parent2._id]
      });
      
      child2 = await FamilyMember.create({
        name: 'Child Two',
        arabicName: 'الطفل الثاني',
        gender: 'Female',
        parents: [parent1._id, parent2._id]
      });
      
      // Update parents with children
      parent1.children = [child1._id, child2._id];
      parent2.children = [child1._id, child2._id];
      await Promise.all([parent1.save(), parent2.save()]);
    });
    
    it('should maintain parent-child relationships', async () => {
      // Get child and verify parents
      const res = await request(app)
        .get(`/api/family/${child1._id}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.body.data.member.parents).toHaveLength(2);
      
      // Get parent and verify children
      const parentRes = await request(app)
        .get(`/api/family/${parent1._id}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(parentRes.body.data.member.children).toHaveLength(2);
    });
    
    it('should prevent circular relationships', async () => {
      // Try to set a child as its own parent
      const res = await request(app)
        .patch(`/api/family/${child1._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ parents: [child1._id] });
      
      expect(res.statusCode).toEqual(400);
    });
  });
});

describe('FamilyMember Model', () => {
  it('should not allow future date of birth', async () => {
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);
    
    const member = new FamilyMember({
      ...testMember1,
      dob: futureDate
    });
    
    await expect(member.save()).rejects.toThrow();
  });
  
  it('should not allow more than 2 parents', async () => {
    const parents = [
      new mongoose.Types.ObjectId(),
      new mongoose.Types.ObjectId(),
      new mongoose.Types.ObjectId()
    ];
    
    const member = new FamilyMember({
      ...testMember1,
      parents
    });
    
    await expect(member.save()).rejects.toThrow();
  });
  
  it('should not allow same-gender parents', async () => {
    const parent1 = await FamilyMember.create({
      ...testMember1,
      name: 'Parent 1',
      gender: 'Male'
    });
    
    const parent2 = await FamilyMember.create({
      ...testMember1,
      name: 'Parent 2',
      gender: 'Male'
    });
    
    const child = new FamilyMember({
      ...testMember2,
      name: 'Child',
      gender: 'Female',
      parents: [parent1._id, parent2._id]
    });
    
    await expect(child.save()).rejects.toThrow();
  });
});
