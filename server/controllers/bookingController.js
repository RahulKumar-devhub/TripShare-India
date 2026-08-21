const Booking = require('../models/Booking');
const Event = require('../models/Event');

// NOTE: This uses plain sequential updates (no MongoDB transactions) so it
// works on a standalone local MongoDB instance, not just a replica set /
// Atlas cluster. For a high-traffic production app, consider transactions.

// POST /api/bookings - protected
const createBooking = async (req, res) => {
  try {
    const { eventId, quantity } = req.body;
    const qty = Number(quantity);

    if (!eventId || !qty || qty < 1) {
      return res.status(400).json({ success: false, message: 'Event and a valid ticket quantity are required.' });
    }

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }
    if (event.availableSeats < qty) {
      return res.status(400).json({ success: false, message: `Only ${event.availableSeats} seat(s) left for this event.` });
    }

    // Atomically decrement seats only if enough are still available
    // (guards against a race between the check above and this update).
    const updatedEvent = await Event.findOneAndUpdate(
      { _id: eventId, availableSeats: { $gte: qty } },
      { $inc: { availableSeats: -qty } },
      { new: true }
    );
    if (!updatedEvent) {
      return res.status(400).json({ success: false, message: 'Seats just sold out. Please try a smaller quantity.' });
    }

    const totalAmount = updatedEvent.price * qty;
    const booking = await Booking.create({
      user: req.user._id,
      event: updatedEvent._id,
      quantity: qty,
      totalAmount,
      status: 'confirmed'
    });

    res.status(201).json({ success: true, message: 'Booking confirmed!', booking });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Booking failed.', error: err.message });
  }
};

// GET /api/bookings/my - protected
const getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user._id })
      .populate('event')
      .sort({ createdAt: -1 });
    res.json({ success: true, count: bookings.length, bookings });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Could not fetch bookings.', error: err.message });
  }
};

// PUT /api/bookings/:id/cancel - protected
const cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }
    if (String(booking.user) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'You can only cancel your own bookings.' });
    }
    if (booking.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Booking is already cancelled.' });
    }

    booking.status = 'cancelled';
    await booking.save();

    await Event.findByIdAndUpdate(booking.event, { $inc: { availableSeats: booking.quantity } });

    res.json({ success: true, message: 'Booking cancelled and seats released.', booking });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Could not cancel booking.', error: err.message });
  }
};

// GET /api/bookings - admin only, view all bookings
const getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate('event')
      .populate('user', 'fullName email phone city')
      .sort({ createdAt: -1 });
    res.json({ success: true, count: bookings.length, bookings });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Could not fetch bookings.', error: err.message });
  }
};

module.exports = { createBooking, getMyBookings, cancelBooking, getAllBookings };
