import mongoose from 'mongoose';

const materialLineSchema = new mongoose.Schema({
  material: { type: String, required: true },
  label: { type: String, required: true },
  weightKg: { type: Number, required: true, min: 0 },
  value: { type: Number, required: true, min: 0 }
}, { _id: false });

const transactionSchema = new mongoose.Schema({
  transactionId: { type: String, required: true, unique: true, index: true },
  pickupId: { type: String, required: true, unique: true, index: true },
  collectorId: { type: String, required: true, index: true },
  materials: { type: [materialLineSchema], default: [] },
  weightKg: { type: Number, required: true, min: 0 },
  amount: { type: Number, required: true, min: 0 },
  currency: { type: String, default: 'INR', enum: ['INR'] },
  status: { type: String, enum: ['pending', 'paid', 'failed'], required: true, index: true },
  payment: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', required: true, unique: true },
  occurredAt: { type: Date, required: true, index: true },
  isDemo: { type: Boolean, default: false, index: true }
}, { timestamps: true, versionKey: false });

transactionSchema.index({ collectorId: 1, occurredAt: -1 });
export const Transaction = mongoose.model('Transaction', transactionSchema, 'collector_ledger_transactions');
