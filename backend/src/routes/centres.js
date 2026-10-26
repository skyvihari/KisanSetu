import { Router } from 'express';
import { query } from '../db.js';
import { checkSlotAvailability } from '../queueEngine.js';

const router = Router();

// GET /centres
router.get('/', async (_req, res, next) => {
  try {
    const { rows } = await query('SELECT * FROM centres ORDER BY name');
    res.json({ centres: rows });
  } catch (err) {
    next(err);
  }
});

// GET /centres/:id/availability?date=YYYY-MM-DD
router.get('/:id/availability', async (req, res, next) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: 'date query param required' });
    const availability = await checkSlotAvailability(req.params.id, date);
    res.json(availability);
  } catch (err) {
    next(err);
  }
});

export default router;
