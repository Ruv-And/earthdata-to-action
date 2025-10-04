import express from 'express';
import cors from 'cors';
import subscriptionRoutes from './routes/subscriptionRoutes.js';
import { errorHandler } from './middleware/error.js';

const app = express();

app.use(cors());
app.use(express.json());
app.use('/api', subscriptionRoutes);
app.use(errorHandler);

export default app;
