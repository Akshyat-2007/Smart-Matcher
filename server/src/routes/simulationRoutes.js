import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { runSimulation } from '../../../simulation/runSimulation.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

router.get('/results', async (req, res) => {
  try {
    const jsonPath = path.resolve(__dirname, '../../../simulation/results.json');
    if (fs.existsSync(jsonPath)) {
      const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      return res.json(data);
    }

    // If file doesn't exist yet, run simulation dynamically
    const results = await runSimulation();
    return res.json(results);
  } catch (err) {
    console.error('[SIMULATION ROUTE ERROR]', err);
    return res.status(500).json({ error: 'Failed to retrieve simulation benchmark results.' });
  }
});

export default router;
