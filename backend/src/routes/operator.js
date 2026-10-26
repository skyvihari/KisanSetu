import { Router } from 'express';
import { query } from '../db.js';
import { listBookingsByCentreAndDate } from '../bookingHelpers.js';

const router = Router();

// GET /operator/dashboard?centre_id=&date=  -- centre info, today's summary tallies, and the
// full scheduled-farmers list for that centre (frontend handoff section 4).
router.get('/dashboard', async (req, res, next) => {
  try {
    const { centre_id, date } = req.query;
    if (!centre_id) return res.status(400).json({ error: 'centre_id query param required' });
    const today = date || new Date().toISOString().slice(0, 10);

    const centreRes = await query('SELECT * FROM centres WHERE id = $1', [centre_id]);
    if (!centreRes.rows[0]) return res.status(404).json({ error: 'centre not found' });

    const bookings = await listBookingsByCentreAndDate(centre_id, today);
    const counts = {
      booked: bookings.filter((b) => b.status === 'booked').length,
      arrived: bookings.filter((b) => b.status === 'arrived').length,
      processing: bookings.filter((b) => ['weighing', 'quality_check'].includes(b.status)).length,
      completed: bookings.filter((b) => b.status === 'completed').length,
    };

    res.json({ date: today, centre: centreRes.rows[0], centres: [centreRes.rows[0]], counts, bookings });
  } catch (err) {
    next(err);
  }
});

export default router;
