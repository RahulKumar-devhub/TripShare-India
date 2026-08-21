const mongoose = require('mongoose');

// A "connect" request between two users — either because they booked the
// same event, or because they posted matching city-to-city trips (or both).
const contactRequestSchema = new mongoose.Schema(
  {
    fromUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    toUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', default: null },
    trip: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', default: null },
    message: { type: String, default: 'Hi! Want to travel together?' },
    status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('ContactRequest', contactRequestSchema);
