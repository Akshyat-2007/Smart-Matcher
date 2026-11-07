import app from './app.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { testConnection } from './db/pool.js';
import { initScheduler } from './scheduler/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const PORT = process.env.PORT || 5000;

async function startServer() {
  console.log('===========================================================');
  console.log(' Starting Smart Study Group Matcher API Server');
  console.log(' Pitch: "Matching students is easy. Keeping them showing up is the hard part."');
  console.log('===========================================================');

  // Test DB connection
  await testConnection();

  // Initialize node-cron accountability scheduler
  initScheduler();

  app.listen(PORT, () => {
    console.log(`[SERVER] API listening on http://localhost:${PORT}`);
    console.log(`[SERVER] Health check: http://localhost:${PORT}/api/health`);
    console.log(`[SERVER] Demo login endpoint: POST http://localhost:${PORT}/api/auth/demo-login`);
  });
}

startServer().catch((err) => {
  console.error('[FATAL SERVER ERROR]', err);
  process.exit(1);
});
