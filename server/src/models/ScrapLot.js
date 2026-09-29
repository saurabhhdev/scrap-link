import mongoose from 'mongoose';

const imageSchema = new mongoose.Schema({ url: { type: String, required: true }, filename: { type: String, required: true }, mimeType: String }, { _id: false });
const eventSchema = new mongoose.Schema({ status: { type: String, required: true }, note: { type: String, required: true }, at: { type: Date, default: Date.now }, actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true } }, { _id: false });

const scrapLotSchema = new mongoose.Schema({
  collector: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  sourcePickupId: { type: String, index: true },
  sourceBatchId: { type: String, index: true },
  isDemo: { type: Boolean, default: false, index: true },
  material: { type: String, required: true, enum: ['paper', 'cardboard', 'pet_plastic', 'hdpe', 'metal', 'aluminium', 'copper', 'e_waste', 'glass'] },
  weightKg: { type: Number, required: true, min: 0.1 },
  condition: { type: String, required: true, enum: ['clean', 'mixed', 'damaged'] },
  location: { address: { type: String, required: true, trim: true, maxlength: 500 }, city: { type: String, trim: true }, latitude: Number, longitude: Number },
  estimatedValue: { type: Number, required: true, min: 0 },
  quotedRate: { type: Number, required: true, min: 0 },
  images: { type: [imageSchema], default: [] },
  selectedRecycler: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, enum: ['listed', 'matched', 'pickup_scheduled', 'collected', 'settled', 'cancelled'], default: 'listed', index: true },
  tracking: { type: [eventSchema], default: [] }
}, { timestamps: true, versionKey: false });

export const ScrapLot = mongoose.model('ScrapLot', scrapLotSchema);
