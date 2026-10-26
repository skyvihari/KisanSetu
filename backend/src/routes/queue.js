import { Router } from 'express';
import { query } from '../db.js';
import { computeEta } from '../queueEngine.js';
import { applyBookingUpdate } from '../bookingHelpers.js';

const router = Router();

// GET /queue/:bookingId -- live position + ETA, polled by the farmer app every few seconds
router.get('/:bookingId', async (req, res, next) => {
  try {
    const eta = await computeEta(req.params.bookingId);
    if (!eta) return res.status(404).json({ error: 'booking not found' });
    const statusRes = await query('SELECT status FROM bookings WHERE id = $1', [req.params.bookingId]);
    res.json({ ...eta, status: statusRes.rows[0]?.status });
  } catch (err) {
    next(err);
  }
});

// POST /queue/:bookingId/arrival -- farmer has physically arrived (or operator confirms via QR)
router.post('/:bookingId/arrival', async (req, res, next) => {
  try {
    const booking = await applyBookingUpdate(req.params.bookingId, { status: 'arrived' });
    if (!booking) return res.status(404).json({ error: 'booking not found' });
    res.json({ booking });
  } catch (err) {
    next(err);
  }
});

export default router;
