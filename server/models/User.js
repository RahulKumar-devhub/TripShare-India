const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    password: { type: String, required: true }, // stored as a bcrypt hash
    bio: { type: String, default: '', maxlength: 300 },
    profileImage: { type: String, default: '' }, // uploaded file path or URL
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    favourites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Event' }],
    resetToken: { type: String, default: null },
    resetTokenExpires: { type: Date, default: null }
  },
  { timestamps: true }
);

// Never send the password hash back to the client.
userSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.resetToken;
  delete obj.resetTokenExpires;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
