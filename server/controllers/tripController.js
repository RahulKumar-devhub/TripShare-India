const Trip = require('../models/Trip');

// POST /api/trips - protected - post "I'm travelling from X to Y on date"
const createTrip = async (req, res) => {
  try {
    const { fromCity, toCity, travelDate, note, eventId } = req.body;
    if (!fromCity || !toCity || !travelDate) {
      return res.status(400).json({ success: false, message: 'From city, to city, and travel date are required.' });
    }

    const trip = await Trip.create({
      user: req.user._id,
      fromCity: fromCity.trim(),
      toCity: toCity.trim(),
      travelDate,
      note: note || '',
      event: eventId || null
    });

    res.status(201).json({ success: true, message: 'Trip posted! Other travellers on this route can now find you.', trip });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Could not post trip.', error: err.message });
  }
};

// GET /api/trips/my - protected
const getMyTrips = async (req, res) => {
  try {
    const trips = await Trip.find({ user: req.user._id }).populate('event', 'title').sort({ createdAt: -1 });
    res.json({ success: true, count: trips.length, trips });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Could not fetch your trips.', error: err.message });
  }
};

// GET /api/trips/matches?fromCity=&toCity=&date= - protected
// Finds OTHER users' trips on the same route, within +/- 2 days of the given date.
const getMatchingTrips = async (req, res) => {
  try {
    const { fromCity, toCity, date } = req.query;
    if (!fromCity || !toCity) {
      return res.status(400).json({ success: false, message: 'From city and to city are required to search.' });
    }

    const query = {
      user: { $ne: req.user._id },
      fromCity: { $regex: `^${fromCity.trim()}$`, $options: 'i' },
      toCity: { $regex: `^${toCity.trim()}$`, $options: 'i' },
      status: 'active'
    };

    if (date) {
      const center = new Date(date);
      const start = new Date(center); start.setDate(start.getDate() - 2);
      const end = new Date(center); end.setDate(end.getDate() + 3);
      query.travelDate = { $gte: start, $lt: end };
    }

    const trips = await Trip.find(query)
      .populate('user', 'fullName city bio profileImage')
      .populate('event', 'title')
      .sort({ travelDate: 1 });

    res.json({ success: true, count: trips.length, trips });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Could not find matching trips.', error: err.message });
  }
};

// DELETE /api/trips/:id - protected
const deleteTrip = async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id);
    if (!trip) return res.status(404).json({ success: false, message: 'Trip not found.' });
    if (String(trip.user) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'You can only delete your own trip posts.' });
    }
    await trip.deleteOne();
    res.json({ success: true, message: 'Trip post removed.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Could not delete trip.', error: err.message });
  }
};

module.exports = { createTrip, getMyTrips, getMatchingTrips, deleteTrip };
