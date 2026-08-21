const express = require('express');
const router = express.Router();
const {
  updateProfile,
  toggleFavourite,
  getFavourites,
  getAllUsers,
  getEventMatches
} = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const { isAdmin } = require('../middleware/adminMiddleware');
const upload = require('../config/upload');

router.put('/profile', protect, upload.single('profileImage'), updateProfile);
router.post('/favourites/:eventId', protect, toggleFavourite);
router.get('/favourites', protect, getFavourites);
router.get('/match/:eventId', protect, getEventMatches);
router.get('/', protect, isAdmin, getAllUsers);

module.exports = router;
