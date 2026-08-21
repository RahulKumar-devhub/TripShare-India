const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    hotel: { type: Number, default: 0, min: 0 },
    food: { type: Number, default: 0, min: 0 },
    transport: { type: Number, default: 0, min: 0 },
    other: { type: Number, default: 0, min: 0 },
    people: { type: Number, required: true, min: 1 },
    note: { type: String, default: '' },
    total: { type: Number, required: true },
    perPerson: { type: Number, required: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Expense', expenseSchema);
