import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 120 },
  message: { type: String, required: true, trim: true, maxlength: 500 },
  type: { type: String, enum: ['success', 'info', 'alert'], default: 'info' },
  resource: { type: String, required: true },
  entityId: { type: String, maxlength: 120 },
  readAt: Date,
  isDemo: { type: Boolean, default: false, index: true }
}, { timestamps: true, versionKey: false });

notificationSchema.index({ userId: 1, createdAt: -1 });
export const Notification = mongoose.model('Notification', notificationSchema);
