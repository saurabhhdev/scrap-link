import mongoose from 'mongoose';

const materialSchema = new mongoose.Schema({ category: { type: String, required: true }, estimatedWeightKg: { type: Number, required: true, min: 0.1 } }, { _id: false });
const pickupSchema = new mongoose.Schema({
  household: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  collector: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  materials: { type: [materialSchema], validate: [(value) => value.length > 0, 'At least one material is required.'] },
  address: { type: String, required: true, trim: true, maxlength: 500 },
  scheduledFor: { type: Date, required: true },
  status: { type: String, enum: ['requested', 'assigned', 'collected', 'recycled', 'cancelled'], default: 'requested' },
  actualWeightKg: { type: Number, min: 0 },
  notes: { type: String, trim: true, maxlength: 500 }
}, { timestamps: true, versionKey: false });

export const Pickup = mongoose.model('Pickup', pickupSchema);
