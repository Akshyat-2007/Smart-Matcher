import express from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes.js';
import subjectRoutes from './routes/subjectRoutes.js';
import courseRoutes from './routes/courseRoutes.js';
import matchRoutes from './routes/matchRoutes.js';
import hubRoutes from './routes/hubRoutes.js';
import simulationRoutes from './routes/simulationRoutes.js';
import { subjectController } from './controllers/subjectController.js';

const app = express();

app.use(cors());
app.use(express.json());

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'Smart Study Group Matcher (v2: Teach-Swap + Accountability)',
    time: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.get('/api/fields', subjectController.getFields);
app.use('/api/subjects', subjectRoutes);
app.use('/api/courses', courseRoutes); // backward-compatible alias
app.use('/api/match', matchRoutes);
app.use('/api', hubRoutes);
app.use('/api/simulation', simulationRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[UNHANDLED ERROR]', err);
  res.status(err.status || 500).json({
    error: err.message || 'An unexpected server error occurred.'
  });
});

export default app;
