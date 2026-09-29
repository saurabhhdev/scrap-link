import mongoose from 'mongoose';

const confirmationSchema = new mongoose.Schema({
  confirmed: { type: Boolean, default: false },
  confirmedAt: Date,
  actorId: String
}, { _id: false });

const handoverRecordSchema = new mongoose.Schema({
  handoverId: { type: String, required: true, unique: true, index: true },
  lotId: { type: String, required: true, unique: true, index: true },
  collectorId: { type: String, required: true, index: true },
  recyclerId: { type: String, required: true, index: true },
  material: { type: String, required: true },
  weightKg: { type: Number, required: true, min: 0.1 },
  value: { type: Number, required: true, min: 0 },
  timestamp: { type: Date, required: true },
  location: {
    city: { type: String, required: true },
    facility: { type: String, required: true }
  },
  payment: {
    amount: { type: Number, required: true, min: 0 },
    mode: { type: String, required: true },
    status: { type: String, enum: ['recorded', 'unavailable'], required: true },
    paidAt: Date
  },
  confirmations: {
    collector: { type: confirmationSchema, required: true },
    recycler: { type: confirmationSchema, required: true }
  },
  integrityHash: { type: String, required: true },
  isDemo: { type: Boolean, default: false, index: true }
}, { timestamps: true, versionKey: false });

export const HandoverRecord = mongoose.model('HandoverRecord', handoverRecordSchema);
