const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    city: { type: String, required: true, trim: true },
    venue: { type: String, required: true, trim: true },
    date: { type: Date, required: true },
    time: { type: String, required: true }, // e.g. "18:30"
    category: {
      type: String,
      required: true,
      enum: ['Movies', 'Concerts', 'Sports', 'Theatre', 'Festivals', 'Food', 'Wellness']
    },
    price: { type: Number, required: true, min: 0 },
    rating: { type: Number, default: 4.5, min: 0, max: 5 },
    totalSeats: { type: Number, required: true, min: 1 },
    availableSeats: { type: Number, required: true, min: 0 },
    image: { type: String, required: true }, // URL or uploaded file path
    organiser: { type: String, required: true },
    tags: [{ type: String }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Event', eventSchema);
