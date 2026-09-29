import mongoose from 'mongoose';

const platformStateSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  version: { type: Number, required: true },
  pickups: { type: [mongoose.Schema.Types.Mixed], default: [] },
  collectors: { type: [mongoose.Schema.Types.Mixed], default: [] },
  recyclers: { type: [mongoose.Schema.Types.Mixed], default: [] },
  batches: { type: [mongoose.Schema.Types.Mixed], default: [] },
  materials: { type: [mongoose.Schema.Types.Mixed], default: [] },
  prices: { type: [mongoose.Schema.Types.Mixed], default: [] }
}, { timestamps: true, strict: true });

export const PlatformState = mongoose.model('PlatformState', platformStateSchema);
