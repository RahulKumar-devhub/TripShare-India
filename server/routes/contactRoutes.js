const express = require('express');
const router = express.Router();
const { sendContactRequest, getMyContactRequests, respondToContactRequest } = require('../controllers/contactController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, sendContactRequest);
router.get('/my', protect, getMyContactRequests);
router.put('/:id', protect, respondToContactRequest);

module.exports = router;
