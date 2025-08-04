import express from 'express';
import multer from 'multer';
import mongoose from 'mongoose';
import Memory from '../../models/Memory.js';
import FamilyMember from '../../models/FamilyMember.js';
// import Album from '../../models/Album.js'; // Uncomment if Album model exists

const router = express.Router();
const upload = multer({ dest: 'uploads/', limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB limit

// Transactional photo upload & linking endpoint
router.post('/memories/upload', upload.single('photo'), async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    // Validate file
    if (!req.file) throw new Error('No file uploaded');
    if (!['image/jpeg', 'image/png'].includes(req.file.mimetype)) throw new Error('Invalid file type');

    // Validate metadata
    const { title, description, familyMemberIds, albumId } = req.body;
    if (!familyMemberIds) throw new Error('familyMemberIds required');

    // Create Memory record
    const memory = new Memory({
      title,
      description,
      photos: [{
        filename: req.file.filename,
        originalName: req.file.originalname,
        url: `/uploads/${req.file.filename}`,
        size: req.file.size,
        mimeType: req.file.mimetype
      }],
      familyMembers: familyMemberIds, // Array of ObjectIds
      // Optionally add album, tags, etc.
    });

    await memory.save({ session });

    // Optionally: Link to album
    // if (albumId) {
    //   await Album.findByIdAndUpdate(albumId, { $push: { memories: memory._id } }, { session });
    // }

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({ success: true, memory });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    // Optionally: remove file from storage if DB fails
    res.status(400).json({ success: false, message: err.message });
  }
});

export default router;
