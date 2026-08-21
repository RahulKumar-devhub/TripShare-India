const User = require('../models/User');

// PUT /api/users/profile - protected
const updateProfile = async (req, res) => {
  try {
    const { fullName, phone, city, bio } = req.body;
    const update = {};
    if (fullName) update.fullName = fullName;
    if (phone) update.phone = phone;
    if (city) update.city = city;
    if (bio !== undefined) update.bio = bio;
    if (req.file) update.profileImage = `/uploads/${req.file.filename}`;

    const user = await User.findByIdAndUpdate(req.user._id, update, { new: true, runValidators: true });
    res.json({ success: true, message: 'Profile updated.', user: user.toSafeObject() });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Could not update profile.', error: err.message });
  }
};

// POST /api/users/favourites/:eventId - protected (toggle add/remove)
const toggleFavourite = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const eventId = req.params.eventId;
    const idx = user.favourites.findIndex((id) => String(id) === String(eventId));

    let added;
    if (idx > -1) {
      user.favourites.splice(idx, 1);
      added = false;
    } else {
      user.favourites.push(eventId);
      added = true;
    }
    await user.save();

    res.json({
      success: true,
      message: added ? 'Added to favourites.' : 'Removed from favourites.',
      added,
      favourites: user.favourites
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Could not update favourites.', error: err.message });
  }
};

// GET /api/users/favourites - protected
const getFavourites = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('favourites');
    res.json({ success: true, favourites: user.favourites });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Could not fetch favourites.', error: err.message });
  }
};

// GET /api/users - admin only
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password -resetToken -resetTokenExpires');
    res.json({ success: true, count: users.length, users });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Could not fetch users.', error: err.message });
  }
};

// GET /api/users/match/:eventId - protected
// Returns other users who booked the same event, without exposing email/phone.
const getEventMatches = async (req, res) => {
  try {
    const Booking = require('../models/Booking');
    const bookings = await Booking.find({ event: req.params.eventId, status: 'confirmed' })
      .populate('user', 'fullName city bio profileImage');

    const matches = bookings
      .filter((b) => String(b.user._id) !== String(req.user._id))
      .map((b) => ({
        userId: b.user._id,
        fullName: b.user.fullName,
        city: b.user.city,
        bio: b.user.bio,
        profileImage: b.user.profileImage
      }));

    // De-duplicate in case a user booked more than once.
    const unique = Array.from(new Map(matches.map((m) => [String(m.userId), m])).values());
    res.json({ success: true, count: unique.length, matches: unique });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Could not fetch matches.', error: err.message });
  }
};

module.exports = { updateProfile, toggleFavourite, getFavourites, getAllUsers, getEventMatches };
