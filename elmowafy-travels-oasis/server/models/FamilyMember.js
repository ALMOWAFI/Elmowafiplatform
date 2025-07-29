import mongoose from 'mongoose';
const Schema = mongoose.Schema;
import validator from 'validator';
import { AppError } from '../middleware/errorHandler.js';

// Validation functions
const validateName = (name) => {
  return validator.isLength(name, { min: 2, max: 50 }) && /^[a-zA-Z\s'-]+$/.test(name);
};

const validateArabicName = (name) => {
  return validator.isLength(name, { min: 2, max: 50 }) && /^[\u0600-\u06FF\s]+$/.test(name);
};

// Pre-save hook to ensure data consistency
const preSaveHook = async function(next) {
  // Ensure name fields are properly formatted
  if (this.isModified('name')) {
    this.name = this.name.trim();
  }
  if (this.isModified('arabicName')) {
    this.arabicName = this.arabicName.trim();
  }

  // Prevent circular references in family relationships
  if (this.parents && this.parents.some(parentId => parentId.equals(this._id))) {
    return next(new AppError('A person cannot be their own parent', 400));
  }
  
  if (this.spouse && this.spouse.equals(this._id)) {
    return next(new AppError('A person cannot be their own spouse', 400));
  }
  
  if (this.children && this.children.some(childId => childId.equals(this._id))) {
    return next(new AppError('A person cannot be their own child', 400));
  }

  next();
};

// Post-save hook to maintain referential integrity
const postSaveHook = async function(doc) {
  // Update spouse's spouse reference
  if (doc.spouse) {
    await mongoose.model('FamilyMember').findByIdAndUpdate(
      doc.spouse,
      { $set: { spouse: doc._id } },
      { runValidators: false }
    );
  }

  // Update children's parents references
  if (doc.children && doc.children.length > 0) {
    await mongoose.model('FamilyMember').updateMany(
      { _id: { $in: doc.children } },
      { $addToSet: { parents: doc._id } },
      { runValidators: false }
    );
  }
};

// Pre-remove hook to clean up relationships
const preRemoveHook = async function(next) {
  // Remove this person from their spouse's spouse field
  if (this.spouse) {
    await mongoose.model('FamilyMember').findByIdAndUpdate(
      this.spouse,
      { $unset: { spouse: 1 } },
      { runValidators: false }
    );
  }

  // Remove this person from their children's parents array
  if (this.children && this.children.length > 0) {
    await mongoose.model('FamilyMember').updateMany(
      { _id: { $in: this.children } },
      { $pull: { parents: this._id } },
      { runValidators: false }
    );
  }

  // Remove this person from their parents' children array
  if (this.parents && this.parents.length > 0) {
    await mongoose.model('FamilyMember').updateMany(
      { _id: { $in: this.parents } },
      { $pull: { children: this._id } },
      { runValidators: false }
    );
  }

  next();
};

// Create Schema for FamilyMember
const FamilyMemberSchema = new Schema({
  name: {
    type: String,
    required: [true, 'English name is required'],
    trim: true,
    index: true,
    validate: {
      validator: validateName,
      message: 'Please provide a valid English name (2-50 characters, only letters, spaces, hyphens, and apostrophes)'
    }
  },
  arabicName: {
    type: String,
    required: [true, 'Arabic name is required'],
    trim: true,
    index: true,
    validate: {
      validator: validateArabicName,
      message: 'Please provide a valid Arabic name (2-50 characters, only Arabic letters and spaces)'
    }
  },
  dob: {
    type: Date,
    index: true,
    validate: {
      validator: function(dob) {
        // Date should not be in the future
        return !dob || dob <= new Date();
      },
      message: 'Date of birth cannot be in the future'
    }
  },
  gender: {
    type: String,
    enum: {
      values: ['Male', 'Female'],
      message: 'Gender must be either Male or Female'
    },
    required: [true, 'Gender is required']
  },
  parents: [{
    type: Schema.Types.ObjectId,
    ref: 'FamilyMember',
    index: true,
    validate: {
      validator: async function(parents) {
        // Maximum 2 parents
        if (parents.length > 2) return false;
        
        // Check for duplicate parents
        if (new Set(parents.map(p => p.toString())).size !== parents.length) {
          return false;
        }
        
        // Check if parents are of opposite gender
        if (parents.length === 2) {
          const [parent1, parent2] = await this.constructor.find({ _id: { $in: parents } });
          return parent1.gender !== parent2.gender;
        }
        
        return true;
      },
      message: 'A family member can have at most 2 parents of opposite gender'
    }
  }],
  spouse: {
    type: Schema.Types.ObjectId,
    ref: 'FamilyMember',
    index: true,
    validate: {
      validator: async function(spouseId) {
        if (!spouseId) return true;
        
        // Check if spouse exists
        const spouse = await this.constructor.findById(spouseId);
        if (!spouse) return false;
        
        // Check if already married to someone else
        const existingSpouse = await this.constructor.findOne({ spouse: this._id });
        if (existingSpouse && !existingSpouse._id.equals(spouseId)) {
          return false;
        }
        
        // Check gender compatibility
        return spouse.gender !== this.gender;
      },
      message: 'Spouse must be of the opposite gender and not already married to someone else'
    }
  },
  children: [{
    type: Schema.Types.ObjectId,
    ref: 'FamilyMember',
    index: true
  }],
  profilePicture: {
    type: String,
    validate: {
      validator: function(url) {
        if (!url) return true;
        return validator.isURL(url, {
          protocols: ['http', 'https'],
          require_protocol: true,
          host_whitelist: [
            /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/i
          ]
        });
      },
      message: 'Profile picture must be a valid URL with http/https protocol from an allowed domain'
    }
  },
  bio: {
    type: String,
    maxlength: [1000, 'Bio cannot be longer than 1000 characters']
  },
  arabicBio: {
    type: String,
    maxlength: [1000, 'Arabic bio cannot be longer than 1000 characters']
  },
  isActive: {
    type: Boolean,
    default: true,
    select: false
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  autoIndex: process.env.NODE_ENV !== 'production'
});

// Add text index for search functionality
FamilyMemberSchema.index(
  { name: 'text', arabicName: 'text' },
  { weights: { name: 10, arabicName: 10 } }
);

// Compound indexes for common query patterns
FamilyMemberSchema.index({ isActive: 1, gender: 1 });
FamilyMemberSchema.index({ isActive: 1, dob: 1 });
FamilyMemberSchema.index({ isActive: 1, parents: 1 });
FamilyMemberSchema.index({ isActive: 1, spouse: 1 });

// Add pre-save hook
FamilyMemberSchema.pre('save', preSaveHook);

// Add post-save hook
FamilyMemberSchema.post('save', function(doc) {
    // Run in next tick to avoid blocking the save operation
    process.nextTick(() => {
        postSaveHook(doc).catch(console.error);
    });
});

// Add pre-remove hook
FamilyMemberSchema.pre('remove', preRemoveHook);

// Virtual for full name (English + Arabic)
FamilyMemberSchema.virtual('fullName').get(function() {
    return `${this.name} (${this.arabicName})`;
});

// Virtual for age calculation
FamilyMemberSchema.virtual('age').get(function() {
    if (!this.dob) return null;
    const today = new Date();
    const birthDate = new Date(this.dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    
    return age;
});

// Instance method to get immediate family
FamilyMemberSchema.methods.getImmediateFamily = async function() {
    const family = {
        parents: [],
        spouse: null,
        children: []
    };

    if (this.parents && this.parents.length > 0) {
        family.parents = await this.model('FamilyMember').find({ 
            _id: { $in: this.parents },
            isActive: true 
        }).select('name arabicName gender dob profilePicture');
    }

    if (this.spouse) {
        family.spouse = await this.model('FamilyMember').findOne({ 
            _id: this.spouse,
            isActive: true 
        }).select('name arabicName gender dob profilePicture');
    }

    if (this.children && this.children.length > 0) {
        family.children = await this.model('FamilyMember').find({ 
            _id: { $in: this.children },
            isActive: true 
        }).select('name arabicName gender dob profilePicture');
    }

    return family;
};

// Static method for text search
FamilyMemberSchema.statics.search = function(query) {
    return this.find(
        { $text: { $search: query }, isActive: true },
        { score: { $meta: 'textScore' } }
    ).sort({ score: { $meta: 'textScore' } });
};

// Static method to get family tree
FamilyMemberSchema.statics.getFamilyTree = async function(memberId, depth = 3) {
    if (depth <= 0) return null;
    
    const member = await this.findOne({ _id: memberId, isActive: true })
        .select('name arabicName gender dob profilePicture parents spouse children')
        .populate('parents', 'name arabicName gender dob profilePicture')
        .populate('spouse', 'name arabicName gender dob profilePicture')
        .populate('children', 'name arabicName gender dob profilePicture');
    
    if (!member) return null;
    
    const result = member.toObject();
    
    // Recursively get family members
    if (depth > 1) {
        if (result.parents && result.parents.length > 0) {
            result.parents = await Promise.all(
                result.parents.map(parent => 
                    this.getFamilyTree(parent._id, depth - 1)
                )
            );
        }
        
        if (result.spouse) {
            result.spouse = await this.getFamilyTree(result.spouse._id, 1);
        }
        
        if (result.children && result.children.length > 0) {
            result.children = await Promise.all(
                result.children.map(child => 
                    this.getFamilyTree(child._id, 1)
                )
            );
        }
    }
    
    return result;
};

// Middleware to handle cascading deletes
FamilyMemberSchema.pre('remove', async function(next) {
    try {
        // Remove this member from their spouse's spouse field
        if (this.spouse) {
            await this.constructor.findByIdAndUpdate(this.spouse, {
                $set: { spouse: null }
            });
        }
        
        // Remove this member from their children's parents array
        await this.constructor.updateMany(
            { _id: { $in: this.children } },
            { $pull: { parents: this._id } }
        );
        
        // Remove this member from their parents' children array
        await this.constructor.updateMany(
            { _id: { $in: this.parents } },
            { $pull: { children: this._id } }
        );
        
        next();
    } catch (err) {
        next(err);
    }
});

// Query middleware to only include active members by default
FamilyMemberSchema.pre(/^find/, function(next) {
    // Only apply to queries that don't explicitly disable this behavior
    if (this.getOptions().includeInactive !== true) {
        this.find({ isActive: { $ne: false } });
    }
    next();
});

const FamilyMember = mongoose.model('familyMember', FamilyMemberSchema);

export default FamilyMember;
