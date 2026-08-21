const express = require('express');
const router = express.Router();
const { createBooking, getMyBookings, cancelBooking, getAllBookings } = require('../controllers/bookingController');
const { protect } = require('../middleware/authMiddleware');
const { isAdmin } = require('../middleware/adminMiddleware');

router.post('/', protect, createBooking);
router.get('/my', protect, getMyBookings);
router.put('/:id/cancel', protect, cancelBooking);
router.get('/', protect, isAdmin, getAllBookings);

module.exports = router;
