import dotenv from 'dotenv';

// Load environment variables first, before any other imports
dotenv.config();

import express from 'express';
import cors from 'cors';
import subscriptionRoutes from './routes/subscriptionRoutes.js';
import testRoutes from './routes/testsubscription.js';
import { errorHandler } from './middleware/error.js';

const app = express();

app.use(cors());
app.use(express.json());
app.use('/api', subscriptionRoutes);
app.use('/api', testRoutes);
app.use(errorHandler);

export default app;
