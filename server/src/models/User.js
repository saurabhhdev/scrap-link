import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  phone: { type: String, required: true, trim: true, unique: true },
  email: { type: String, trim: true, lowercase: true, sparse: true, unique: true },
  identity: { type: String, trim: true, sparse: true, unique: true },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ['household', 'collector', 'recycler', 'admin'], default: 'household' },
  recyclerProfile: {
    facilityName: { type: String, trim: true },
    acceptedMaterials: { type: [String], default: [] },
    location: { city: String, latitude: Number, longitude: Number }
  },
  profile: { subtitle: { type: String, trim: true }, ward: { type: String, trim: true }, photoUrl: { type: String, trim: true }, eShramNo: { type: String, trim: true } },
  isActive: { type: Boolean, default: true },
  isVerified: { type: Boolean, default: false },
  isDemo: { type: Boolean, default: false, index: true },
  tokenVersion: { type: Number, default: 0, select: false }
}, { timestamps: true, versionKey: false });

export const User = mongoose.model('User', userSchema);
