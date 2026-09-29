import { Router } from 'express';
import { createLot, getPrice, listLots, lotById, matches, transactions, updateTracking } from '../controllers/lotController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { handleUploadError, lotImages, persistLotImages } from '../middleware/upload.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const lotRouter = Router();
lotRouter.use(requireAuth);
lotRouter.get('/prices', requireRole('collector', 'recycler', 'admin'), asyncHandler(getPrice));
lotRouter.get('/transactions', requireRole('collector', 'recycler', 'admin'), asyncHandler(transactions));
lotRouter.get('/', requireRole('collector', 'recycler', 'admin'), asyncHandler(listLots));
lotRouter.post('/', requireRole('collector'), lotImages, handleUploadError, persistLotImages, asyncHandler(createLot));
lotRouter.get('/:id', requireRole('collector', 'recycler', 'admin'), asyncHandler(lotById));
lotRouter.get('/:id/matches', requireRole('collector'), asyncHandler(matches));
lotRouter.patch('/:id/tracking', requireRole('collector'), asyncHandler(updateTracking));
