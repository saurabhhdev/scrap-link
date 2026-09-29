import { Router } from 'express';
import { health } from '../controllers/healthController.js';

export const healthRouter = Router();
healthRouter.get('/', health);
