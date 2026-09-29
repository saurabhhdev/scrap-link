import mongoose from 'mongoose';
import { RecyclerOffer } from '../models/RecyclerOffer.js';
import { ScrapLot } from '../models/ScrapLot.js';
import { AppError } from '../utils/AppError.js';

const validId = (id) => mongoose.Types.ObjectId.isValid(id);
const populated = (query) => query.populate('lot').populate('collector', 'name phone').populate('recycler', 'name recyclerProfile');
const record = (status, actor, note) => ({ status, actor, note, at: new Date() });

export async function marketplace(request, response) {
  const accepted = request.user.recyclerProfile?.acceptedMaterials || [];
  const filter = { status: 'listed', material: { $in: accepted } };
  if (request.query.material && accepted.includes(request.query.material)) filter.material = request.query.material;
  else if (request.query.material) filter.material = '__not_accepted__';
  if (request.query.city) filter['location.city'] = { $regex: String(request.query.city).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
  const lots = await ScrapLot.find(filter).populate('collector', 'name').sort({ createdAt: -1 }).limit(100);
  response.json({ success: true, data: lots });
}

export async function listOffers(request, response) {
  const filter = request.auth.role === 'collector' ? { collector: request.auth.sub } : { recycler: request.auth.sub };
  const offers = await populated(RecyclerOffer.find(filter).sort({ createdAt: -1 }));
  response.json({ success: true, data: offers });
}

export async function makeOffer(request, response) {
  const { lotId } = request.params;
  const amount = Number(request.body.amount);
  const note = String(request.body.note || '').trim();
  if (!validId(lotId) || !Number.isFinite(amount) || amount <= 0 || note.length > 500) throw new AppError('Provide a valid lot, positive offer amount, and a note under 500 characters.', 400);
  const lot = await ScrapLot.findOne({ _id: lotId, status: 'listed' });
  if (!lot) throw new AppError('This lot is no longer available for offers.', 409);
  const accepted = request.user.recyclerProfile?.acceptedMaterials || [];
  if (!accepted.includes(lot.material)) throw new AppError('Your facility does not accept this material.', 403);
  const existing = await RecyclerOffer.exists({ lot: lot.id, recycler: request.auth.sub, status: { $in: ['pending', 'accepted', 'pickup_scheduled'] } });
  if (existing) throw new AppError('Your facility already has an active offer on this lot.', 409);
  const offer = await RecyclerOffer.create({ lot: lot.id, collector: lot.collector, recycler: request.auth.sub, amount, note, history: [record('pending', request.auth.sub, 'Offer submitted by recycler.')] });
  response.status(201).json({ success: true, data: await populated(RecyclerOffer.findById(offer.id)) });
}

export async function acceptOffer(request, response) {
  const { id } = request.params;
  if (!validId(id)) throw new AppError('Offer not found.', 404);
  const accepted = await RecyclerOffer.findOneAndUpdate({ _id: id, collector: request.auth.sub, status: 'pending' }, { $set: { status: 'accepted' }, $push: { history: record('accepted', request.auth.sub, 'Collector accepted offer.') } }, { new: true });
  if (!accepted) throw new AppError('Pending offer not found for this collector.', 404);
  const claimedLot = await ScrapLot.findOneAndUpdate({ _id: accepted.lot, collector: request.auth.sub, status: 'listed' }, { $set: { status: 'matched', selectedRecycler: accepted.recycler }, $push: { tracking: { status: 'matched', note: 'Collector accepted recycler offer.', actor: request.auth.sub, at: new Date() } } }, { new: true });
  if (!claimedLot) {
    await RecyclerOffer.findOneAndUpdate({ _id: accepted.id, status: 'accepted' }, { $set: { status: 'declined' }, $push: { history: record('declined', request.auth.sub, 'Lot had already been matched.') } });
    throw new AppError('This lot has already been matched or is no longer available.', 409);
  }
  await RecyclerOffer.updateMany({ lot: accepted.lot, _id: { $ne: accepted.id }, status: 'pending' }, { $set: { status: 'declined' }, $push: { history: record('declined', request.auth.sub, 'Another offer was accepted.') } });
  response.json({ success: true, data: await populated(RecyclerOffer.findById(accepted.id)) });
}

export async function declineOffer(request, response) {
  const offer = await RecyclerOffer.findOneAndUpdate({ _id: request.params.id, collector: request.auth.sub, status: 'pending' }, { $set: { status: 'declined' }, $push: { history: record('declined', request.auth.sub, 'Collector declined offer.') } }, { new: true });
  if (!offer) throw new AppError('Pending offer not found for this collector.', 404);
  response.json({ success: true, data: await populated(RecyclerOffer.findById(offer.id)) });
}

export async function schedulePickup(request, response) {
  const scheduledFor = new Date(request.body.scheduledFor);
  const note = String(request.body.note || '').trim();
  if (!Number.isFinite(scheduledFor.getTime()) || scheduledFor.getTime() < Date.now() || note.length > 500) throw new AppError('Choose a valid future pickup time and an optional note under 500 characters.', 400);
  const offer = await RecyclerOffer.findOneAndUpdate({ _id: request.params.id, recycler: request.auth.sub, status: 'accepted' }, { $set: { status: 'pickup_scheduled', scheduledFor, pickupNote: note }, $push: { history: record('pickup_scheduled', request.auth.sub, 'Recycler scheduled pickup.') } }, { new: true });
  if (!offer) throw new AppError('Only an accepted offer can be scheduled by its recycler.', 409);
  const lot = await ScrapLot.findOneAndUpdate({ _id: offer.lot, selectedRecycler: request.auth.sub, status: 'matched' }, { $set: { status: 'pickup_scheduled' }, $push: { tracking: { status: 'pickup_scheduled', note: 'Recycler scheduled pickup.', actor: request.auth.sub, at: new Date() } } }, { new: true });
  if (!lot) {
    await RecyclerOffer.findOneAndUpdate({ _id: offer.id, status: 'pickup_scheduled' }, { $set: { status: 'accepted' }, $unset: { scheduledFor: 1, pickupNote: 1 }, $push: { history: record('accepted', request.auth.sub, 'Schedule reverted because lot state changed.') } });
    throw new AppError('Lot is no longer in the matched state.', 409);
  }
  response.json({ success: true, data: await populated(RecyclerOffer.findById(offer.id)) });
}

export async function confirmReceived(request, response) {
  const receivedWeightKg = Number(request.body.receivedWeightKg);
  if (!Number.isFinite(receivedWeightKg) || receivedWeightKg <= 0) throw new AppError('Enter a positive received weight.', 400);
  const offer = await RecyclerOffer.findOneAndUpdate({ _id: request.params.id, recycler: request.auth.sub, status: 'pickup_scheduled' }, { $set: { status: 'received', receivedWeightKg }, $push: { history: record('received', request.auth.sub, `Recycler confirmed receipt: ${receivedWeightKg} kg.`) } }, { new: true });
  if (!offer) throw new AppError('Only a scheduled pickup can be confirmed as received by its recycler.', 409);
  const lot = await ScrapLot.findOneAndUpdate({ _id: offer.lot, selectedRecycler: request.auth.sub, status: 'pickup_scheduled' }, { $set: { status: 'collected' }, $push: { tracking: { status: 'collected', note: `Recycler confirmed receipt of ${receivedWeightKg} kg.`, actor: request.auth.sub, at: new Date() } } }, { new: true });
  if (!lot) {
    await RecyclerOffer.findOneAndUpdate({ _id: offer.id, status: 'received' }, { $set: { status: 'pickup_scheduled' }, $unset: { receivedWeightKg: 1 }, $push: { history: record('pickup_scheduled', request.auth.sub, 'Receipt confirmation reverted because lot state changed.') } });
    throw new AppError('Lot is not awaiting receipt.', 409);
  }
  response.json({ success: true, data: await populated(RecyclerOffer.findById(offer.id)) });
}
