import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import authRoutes from './routes/auth.js';
import centresRoutes from './routes/centres.js';
import bookingsRoutes from './routes/bookings.js';
import queueRoutes from './routes/queue.js';
import procurementRoutes from './routes/procurement.js';
import paymentsRoutes from './routes/payments.js';
import adminRoutes from './routes/admin.js';
import operatorRoutes from './routes/operator.js';
import marketRatesRoutes from './routes/marketRates.js';

dotenv.config();
const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') || '*' }));
app.use(express.json());

app.get('/', (_req, res) => res.json({ status: 'KisanSetu API is running', simulated: true }));
app.get('/health', (_req, res) => res.json({ ok: true }));

app.use('/auth', authRoutes);
app.use('/centres', centresRoutes);
app.use('/bookings', bookingsRoutes);
app.use('/queue', queueRoutes);
app.use('/procurement', procurementRoutes);
app.use('/payments', paymentsRoutes);
app.use('/admin', adminRoutes);
app.use('/operator', operatorRoutes);
app.use('/market-rates', marketRatesRoutes);

// Unmatched routes
app.use((req, res) => res.status(404).json({ error: `no route for ${req.method} ${req.path}` }));

// Central error handler. Preserve intentional client/configuration statuses while
// avoiding database/provider internals leaking to production clients.
app.use((err, _req, res, _next) => {
  console.error(err);
  const status = Number.isInteger(err.status) ? err.status : 500;
  const payload = { error: status === 500 ? 'Internal server error' : err.message };
  if (process.env.NODE_ENV !== 'production' && status === 500) payload.detail = err.message;
  res.status(status).json(payload);
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`KisanSetu API listening on port ${PORT}`));
