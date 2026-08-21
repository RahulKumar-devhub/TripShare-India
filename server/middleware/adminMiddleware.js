// Must run after "protect" so req.user is already set.
const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    return next();
  }
  return res.status(403).json({ success: false, message: 'Admin access only.' });
};

module.exports = { isAdmin };
