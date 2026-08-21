const express = require('express');
const router = express.Router();
const { createTrip, getMyTrips, getMatchingTrips, deleteTrip } = require('../controllers/tripController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, createTrip);
router.get('/my', protect, getMyTrips);
router.get('/matches', protect, getMatchingTrips);
router.delete('/:id', protect, deleteTrip);

module.exports = router;
