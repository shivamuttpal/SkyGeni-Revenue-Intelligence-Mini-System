import express from 'express';
import cors from 'cors';
import { initDatabase } from './db/database';
import summaryRouter from './routes/summary';
import driversRouter from './routes/drivers';
import riskFactorsRouter from './routes/riskFactors';
import recommendationsRouter from './routes/recommendations';

const app = express();
const PORT = process.env.PORT || 3001;
 
// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
});

// Initialize database and start server
async function start() {
    try {
        console.log('📦 Initializing database...');
        await initDatabase();
        console.log('✅ Database initialized');

        // Routes (after DB init)
        app.use('/api/summary', summaryRouter);
        app.use('/api/drivers', driversRouter);
        app.use('/api/risk-factors', riskFactorsRouter);
        app.use('/api/recommendations', recommendationsRouter);

        app.listen(PORT, () => {
            console.log(`🚀 Revenue Intelligence API running on http://localhost:${PORT}`);
            console.log('📍 Available endpoints:');
            console.log(`   GET http://localhost:${PORT}/api/summary`);
            console.log(`   GET http://localhost:${PORT}/api/drivers`);
            console.log(`   GET http://localhost:${PORT}/api/risk-factors`);
            console.log(`   GET http://localhost:${PORT}/api/recommendations`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

start();

export default app;
