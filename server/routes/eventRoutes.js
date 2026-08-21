const express = require('express');
const router = express.Router();
const { getEvents, getEventById, createEvent, updateEvent, deleteEvent } = require('../controllers/eventController');
const { protect } = require('../middleware/authMiddleware');
const { isAdmin } = require('../middleware/adminMiddleware');
const upload = require('../config/upload');

// Public
router.get('/', getEvents);
router.get('/:id', getEventById);

// Admin only
router.post('/', protect, isAdmin, upload.single('image'), createEvent);
router.put('/:id', protect, isAdmin, upload.single('image'), updateEvent);
router.delete('/:id', protect, isAdmin, deleteEvent);

module.exports = router;
