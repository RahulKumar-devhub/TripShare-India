const Event = require('../models/Event');

// GET /api/events  - public, with search/filter/sort via query params
// ?search=&city=&category=&date=&sort=price_asc|price_desc|date|rating
const getEvents = async (req, res) => {
  try {
    const { search, city, category, date, sort } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { city: { $regex: search, $options: 'i' } }
      ];
    }
    if (city) query.city = { $regex: `^${city}$`, $options: 'i' };
    if (category) query.category = category;
    if (date) {
      const start = new Date(date);
      const end = new Date(date);
      end.setDate(end.getDate() + 1);
      query.date = { $gte: start, $lt: end };
    }

    let sortOption = { date: 1 };
    if (sort === 'price_asc') sortOption = { price: 1 };
    if (sort === 'price_desc') sortOption = { price: -1 };
    if (sort === 'date') sortOption = { date: 1 };
    if (sort === 'rating') sortOption = { rating: -1 };

    const events = await Event.find(query).sort(sortOption);
    res.json({ success: true, count: events.length, events });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Could not fetch events.', error: err.message });
  }
};

// GET /api/events/:id - public
const getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found.' });
    res.json({ success: true, event });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Could not fetch event.', error: err.message });
  }
};

// POST /api/events - admin only
const createEvent = async (req, res) => {
  try {
    const body = { ...req.body };
    if (req.file) {
      body.image = `/uploads/${req.file.filename}`;
    }
    if (body.tags && typeof body.tags === 'string') {
      body.tags = body.tags.split(',').map((t) => t.trim()).filter(Boolean);
    }
    if (body.totalSeats && !body.availableSeats) {
      body.availableSeats = body.totalSeats;
    }
    body.createdBy = req.user._id;

    const event = await Event.create(body);
    res.status(201).json({ success: true, message: 'Event created.', event });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Could not create event.', error: err.message });
  }
};

// PUT /api/events/:id - admin only
const updateEvent = async (req, res) => {
  try {
    const body = { ...req.body };
    if (req.file) {
      body.image = `/uploads/${req.file.filename}`;
    }
    if (body.tags && typeof body.tags === 'string') {
      body.tags = body.tags.split(',').map((t) => t.trim()).filter(Boolean);
    }

    const event = await Event.findByIdAndUpdate(req.params.id, body, { new: true, runValidators: true });
    if (!event) return res.status(404).json({ success: false, message: 'Event not found.' });
    res.json({ success: true, message: 'Event updated.', event });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Could not update event.', error: err.message });
  }
};

// DELETE /api/events/:id - admin only
const deleteEvent = async (req, res) => {
  try {
    const event = await Event.findByIdAndDelete(req.params.id);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found.' });
    res.json({ success: true, message: 'Event deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Could not delete event.', error: err.message });
  }
};

module.exports = { getEvents, getEventById, createEvent, updateEvent, deleteEvent };
