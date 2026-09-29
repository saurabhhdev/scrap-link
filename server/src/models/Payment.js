import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  paymentId: { type: String, required: true, unique: true, index: true },
  transactionId: { type: String, required: true, unique: true, index: true },
  collectorId: { type: String, required: true, index: true },
  amount: { type: Number, required: true, min: 0 },
  currency: { type: String, default: 'INR', enum: ['INR'] },
  method: { type: String, enum: ['UPI', 'Cash', 'Direct Jan-Dhan Transfer'], required: true },
  provider: { type: String, enum: ['manual_cash', 'unconfigured', 'upi', 'gateway'], required: true },
  providerReference: { type: String, trim: true, maxlength: 200 },
  idempotencyKey: { type: String, required: true, unique: true },
  status: { type: String, enum: ['pending', 'paid', 'failed'], required: true, index: true },
  paidAt: Date,
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  isDemo: { type: Boolean, default: false, index: true }
}, { timestamps: true, versionKey: false });

paymentSchema.index({ collectorId: 1, createdAt: -1 });
export const Payment = mongoose.model('Payment', paymentSchema);
