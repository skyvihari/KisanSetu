import { Router } from 'express';
import { applyBookingUpdate } from '../bookingHelpers.js';

const router = Router();

// These are thin, explicitly-named wrappers around the same state machine used by the
// generic PATCH /bookings/:id -- use whichever shape is easier to call from the frontend's
// operator workflow (Verify -> Arrive -> Weigh -> Quality -> Complete).

// POST /procurement/:bookingId/weigh  { actual_weight_kg }
router.post('/:bookingId/weigh', async (req, res, next) => {
  try {
    const { actual_weight_kg, weight_kg } = req.body;
    const weight = actual_weight_kg ?? weight_kg;
    if (weight == null) return res.status(400).json({ error: 'actual_weight_kg required' });
    const booking = await applyBookingUpdate(req.params.bookingId, { status: 'weighing', actual_weight_kg: weight });
    if (!booking) return res.status(404).json({ error: 'booking not found' });
    res.json({ booking });
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ error: err.message });
    next(err);
  }
});

// POST /procurement/:bookingId/quality  { quality_grade, rate_per_kg }
router.post('/:bookingId/quality', async (req, res, next) => {
  try {
    const { quality_grade, rate_per_kg } = req.body;
    if (!quality_grade) return res.status(400).json({ error: 'quality_grade required' });
    const booking = await applyBookingUpdate(req.params.bookingId, { status: 'quality_check', quality_grade, rate_per_kg });
    if (!booking) return res.status(404).json({ error: 'booking not found' });
    res.json({ booking });
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ error: err.message });
    next(err);
  }
});

// POST /procurement/:bookingId/complete
router.post('/:bookingId/complete', async (req, res, next) => {
  try {
    const booking = await applyBookingUpdate(req.params.bookingId, { status: 'completed' });
    if (!booking) return res.status(404).json({ error: 'booking not found' });
    res.json({ booking });
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ error: err.message });
    next(err);
  }
});

// POST /procurement/:bookingId/reject  { quality_grade? }  -- e.g. quality_grade: "Rejected"
router.post('/:bookingId/reject', async (req, res, next) => {
  try {
    const booking = await applyBookingUpdate(req.params.bookingId, { status: 'rejected', quality_grade: req.body.quality_grade });
    if (!booking) return res.status(404).json({ error: 'booking not found' });
    res.json({ booking });
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ error: err.message });
    next(err);
  }
});

export default router;
