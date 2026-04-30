import express from 'express';
import cors from 'cors';
import menuRoutes from './routes/menu.js';
import tableRoutes from './routes/tables.js';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/menu', menuRoutes);
app.use('/api/tables', tableRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend is running' });
});

export default app;
