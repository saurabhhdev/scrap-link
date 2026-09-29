import { app } from './app.js';
import { connectDatabase } from './config/database.js';
import { env } from './config/env.js';

await connectDatabase();
app.listen(env.port, () => console.log(`ScrapLink API listening on port ${env.port}`));
