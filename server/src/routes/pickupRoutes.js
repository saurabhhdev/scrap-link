import { Router } from 'express';
import { createPickup, listMyPickups } from '../controllers/pickupController.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const pickupRouter = Router();
pickupRouter.use(requireAuth);
pickupRouter.route('/').get(asyncHandler(listMyPickups)).post(asyncHandler(createPickup));
