import mongoose from 'mongoose';

const recyclerOfferSchema = new mongoose.Schema({
  lot: { type: mongoose.Schema.Types.ObjectId, ref: 'ScrapLot', required: true, index: true },
  collector: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  recycler: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  amount: { type: Number, required: true, min: 0.01 },
  note: { type: String, trim: true, maxlength: 500 },
  status: { type: String, enum: ['pending', 'accepted', 'declined', 'pickup_scheduled', 'received'], default: 'pending', index: true },
  scheduledFor: Date,
  pickupNote: { type: String, trim: true, maxlength: 500 },
  receivedWeightKg: { type: Number, min: 0.1 },
  isDemo: { type: Boolean, default: false, index: true },
  history: [{ status: { type: String, required: true }, note: String, actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, at: { type: Date, default: Date.now } }]
}, { timestamps: true, versionKey: false });

recyclerOfferSchema.index({ lot: 1, recycler: 1 }, { unique: true });
export const RecyclerOffer = mongoose.model('RecyclerOffer', recyclerOfferSchema);
