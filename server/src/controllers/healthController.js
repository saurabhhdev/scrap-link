import { env } from '../config/env.js';

export function health(request, response) { response.json({ success: true, data: { service: 'ScrapLink API', environment: env.nodeEnv } }); }
