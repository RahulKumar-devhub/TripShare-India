const Expense = require('../models/Expense');

// POST /api/expenses - protected
const createExpense = async (req, res) => {
  try {
    const { hotel = 0, food = 0, transport = 0, other = 0, people, note = '' } = req.body;
    const numPeople = Number(people);

    if (!numPeople || numPeople < 1) {
      return res.status(400).json({ success: false, message: 'Number of people must be at least 1.' });
    }

    const total = Number(hotel) + Number(food) + Number(transport) + Number(other);
    const perPerson = Math.round((total / numPeople) * 100) / 100;

    const expense = await Expense.create({
      user: req.user._id,
      hotel: Number(hotel),
      food: Number(food),
      transport: Number(transport),
      other: Number(other),
      people: numPeople,
      note,
      total,
      perPerson
    });

    res.status(201).json({ success: true, message: 'Expense split saved.', expense });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Could not save expense split.', error: err.message });
  }
};

// GET /api/expenses/my - protected
const getMyExpenses = async (req, res) => {
  try {
    const expenses = await Expense.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, count: expenses.length, expenses });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Could not fetch expense history.', error: err.message });
  }
};

// DELETE /api/expenses/:id - protected
const deleteExpense = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) return res.status(404).json({ success: false, message: 'Expense split not found.' });
    if (String(expense.user) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'You can only delete your own expense splits.' });
    }
    await expense.deleteOne();
    res.json({ success: true, message: 'Expense split deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Could not delete expense split.', error: err.message });
  }
};

module.exports = { createExpense, getMyExpenses, deleteExpense };
