// routes/photos.js — Upload photos, attach to entries
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { upload, cloudinary } = require('../config/cloudinary');
const Entry = require('../models/Entry');

router.use(protect);

// ─────────────────────────────────────────
// POST /api/photos/upload
// Upload a photo to Cloudinary
// Form data: file (image), entryId, block (morning/evening/night)
// ─────────────────────────────────────────
router.post('/upload', upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No photo file provided.' });
    }

    const { entryId, block, caption } = req.body;

    // Build photo object from Cloudinary response
    const photo = {
      url: req.file.path,
      publicId: req.file.filename,
      caption: caption || ''
    };

    // If entryId and block provided, attach to entry
    if (entryId && block) {
      const entry = await Entry.findOne({ _id: entryId, user: req.user._id });
      if (entry) {
        const blockDoc = entry.blocks.find(b => b.block === block);
        if (blockDoc) {
          blockDoc.photos.push(photo);
          entry.hasPhotos = true;
          await entry.save();
        }
      }
    }

    res.status(201).json({
      message: 'Photo uploaded successfully!',
      photo
    });

  } catch (err) {
    console.error('Photo upload error:', err.message);
    res.status(500).json({ error: 'Photo upload failed.' });
  }
});

// ─────────────────────────────────────────
// DELETE /api/photos/:publicId
// Delete a photo from Cloudinary and entry
// ─────────────────────────────────────────
router.delete('/:publicId', async (req, res) => {
  try {
    const publicId = decodeURIComponent(req.params.publicId);

    // Delete from Cloudinary
    await cloudinary.uploader.destroy(publicId);

    // Remove from any entry belonging to this user
    await Entry.updateMany(
      { user: req.user._id },
      { $pull: { 'blocks.$[].photos': { publicId } } }
    );

    res.json({ message: 'Photo deleted.' });

  } catch (err) {
    res.status(500).json({ error: 'Could not delete photo.' });
  }
});

module.exports = router;
