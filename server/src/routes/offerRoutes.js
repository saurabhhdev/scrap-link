import { Router } from 'express';
import { acceptOffer, confirmReceived, declineOffer, listOffers, makeOffer, marketplace, schedulePickup } from '../controllers/offerController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const offerRouter = Router();
offerRouter.use(requireAuth);
offerRouter.get('/marketplace', requireRole('recycler'), asyncHandler(marketplace));
offerRouter.get('/', requireRole('collector', 'recycler'), asyncHandler(listOffers));
offerRouter.post('/:lotId', requireRole('recycler'), asyncHandler(makeOffer));
offerRouter.post('/:id/accept', requireRole('collector'), asyncHandler(acceptOffer));
offerRouter.post('/:id/decline', requireRole('collector'), asyncHandler(declineOffer));
offerRouter.post('/:id/schedule', requireRole('recycler'), asyncHandler(schedulePickup));
offerRouter.post('/:id/received', requireRole('recycler'), asyncHandler(confirmReceived));
