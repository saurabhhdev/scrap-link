import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  lot: { type: mongoose.Schema.Types.ObjectId, ref: 'ScrapLot', required: true, unique: true },
  collector: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  recycler: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true, min: 0 },
  status: { type: String, enum: ['pending', 'settled', 'cancelled'], default: 'pending' },
  reference: { type: String, required: true, unique: true }
}, { timestamps: true, versionKey: false });

export const Transaction = mongoose.model('Transaction', transactionSchema);
