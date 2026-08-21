const mongoose = require('mongoose');

// A "trip post" — e.g. "Chandigarh to Manali on 15 Aug" — used to match
// strangers travelling the same route around the same date, independent
// of any specific ticketed event (though it can optionally link to one).
const tripSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    fromCity: { type: String, required: true, trim: true },
    toCity: { type: String, required: true, trim: true },
    travelDate: { type: Date, required: true },
    note: { type: String, default: '', maxlength: 300 },
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', default: null }, // optional link
    status: { type: String, enum: ['active', 'closed'], default: 'active' }
  },
  { timestamps: true }
);

// Speeds up matching queries by route.
tripSchema.index({ fromCity: 1, toCity: 1, travelDate: 1 });

module.exports = mongoose.model('Trip', tripSchema);
