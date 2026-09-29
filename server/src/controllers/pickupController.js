import { Pickup } from '../models/Pickup.js';
import { AppError } from '../utils/AppError.js';

export async function createPickup(request, response) {
  const { materials, address, scheduledFor, notes } = request.body;
  if (!materials || !address || !scheduledFor) throw new AppError('Materials, address, and schedule are required.', 400);
  const pickup = await Pickup.create({ household: request.auth.sub, materials, address, scheduledFor, notes });
  response.status(201).json({ success: true, data: pickup });
}

export async function listMyPickups(request, response) {
  const filter = request.auth.role === 'household' ? { household: request.auth.sub } : request.auth.role === 'collector' ? { collector: request.auth.sub } : {};
  const pickups = await Pickup.find(filter).populate('household', 'name phone').populate('collector', 'name phone').sort({ createdAt: -1 });
  response.json({ success: true, data: pickups });
}
