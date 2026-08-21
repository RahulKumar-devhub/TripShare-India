const ContactRequest = require('../models/ContactRequest');

// POST /api/contact - protected - send a "connect" request to a travel match
// Works for event-based matches (eventId) and route-based trip matches (tripId).
const sendContactRequest = async (req, res) => {
  try {
    const { toUserId, eventId, tripId, message } = req.body;
    if (!toUserId || (!eventId && !tripId)) {
      return res.status(400).json({ success: false, message: 'Recipient and either an event or a trip are required.' });
    }
    if (String(toUserId) === String(req.user._id)) {
      return res.status(400).json({ success: false, message: 'You cannot connect with yourself.' });
    }

    const request = await ContactRequest.create({
      fromUser: req.user._id,
      toUser: toUserId,
      event: eventId || null,
      trip: tripId || null,
      message: message || undefined
    });

    res.status(201).json({ success: true, message: 'Connect request sent.', request });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Could not send connect request.', error: err.message });
  }
};

// GET /api/contact/my - protected - requests sent to or by me
const getMyContactRequests = async (req, res) => {
  try {
    const requests = await ContactRequest.find({
      $or: [{ fromUser: req.user._id }, { toUser: req.user._id }]
    })
      .populate('fromUser', 'fullName city')
      .populate('toUser', 'fullName city')
      .populate('event', 'title city date')
      .populate('trip', 'fromCity toCity travelDate')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: requests.length, requests });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Could not fetch connect requests.', error: err.message });
  }
};

// PUT /api/contact/:id - protected - accept or reject a request addressed to me
const respondToContactRequest = async (req, res) => {
  try {
    const { status } = req.body; // 'accepted' or 'rejected'
    if (!['accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be "accepted" or "rejected".' });
    }

    const request = await ContactRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found.' });
    if (String(request.toUser) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'You can only respond to requests sent to you.' });
    }

    request.status = status;
    await request.save();

    res.json({ success: true, message: `Request ${status}.`, request });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Could not update request.', error: err.message });
  }
};

module.exports = { sendContactRequest, getMyContactRequests, respondToContactRequest };
