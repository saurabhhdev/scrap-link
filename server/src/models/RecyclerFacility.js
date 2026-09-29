import mongoose from 'mongoose';

const pointSchema = new mongoose.Schema({
  type: { type: String, enum: ['Point'], required: true },
  coordinates: { type: [Number], required: true, validate: { validator: (value) => value.length === 2, message: 'GeoJSON coordinates must be [longitude, latitude].' } }
}, { _id: false });

const priceRateSchema = new mongoose.Schema({ material: { type: String, required: true }, ratePerKg: { type: Number, required: true, min: 0 } }, { _id: false });
const recyclerFacilitySchema = new mongoose.Schema({
  facilityKey: { type: String, required: true, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  name: { type: String, required: true },
  city: { type: String, required: true, index: true },
  acceptedMaterials: { type: [String], default: [], index: true },
  serviceRadiusKm: { type: Number, min: 1, max: 250, default: 25 },
  priceRates: { type: [priceRateSchema], default: [] },
  verificationStatus: { type: String, enum: ['verified', 'pending', 'unverified'], default: 'unverified', index: true },
  active: { type: Boolean, default: true, index: true },
  location: { point: { type: pointSchema } },
  source: { type: String, default: 'facility_directory' },
  isDemo: { type: Boolean, default: false, index: true }
}, { timestamps: true, versionKey: false });

recyclerFacilitySchema.index({ 'location.point': '2dsphere' });
recyclerFacilitySchema.index({ active: 1, acceptedMaterials: 1 });
export const RecyclerFacility = mongoose.model('RecyclerFacility', recyclerFacilitySchema);
