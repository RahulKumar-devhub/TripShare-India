const express = require('express');
const router = express.Router();
const { createExpense, getMyExpenses, deleteExpense } = require('../controllers/expenseController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, createExpense);
router.get('/my', protect, getMyExpenses);
router.delete('/:id', protect, deleteExpense);

module.exports = router;
