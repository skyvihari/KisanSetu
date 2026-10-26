import { Router } from 'express';
import { query } from '../db.js';

const router = Router();

// GET /payments/:procurementId
router.get('/:procurementId', async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT id, procurement_id, amount::float8 AS amount, status, reference_id, timestamp
       FROM payments WHERE procurement_id = $1`,
      [req.params.procurementId]
    );
    if (!rows[0]) return res.status(404).json({ error: 'payment not found' });
    res.json({ payment: rows[0] });
  } catch (err) {
    next(err);
  }
});

// POST /payments/:id/mark-paid -- demo/admin only (product doc section 16: never fabricate a
// real payment confirmation outside this explicitly-labelled simulation path).
router.post('/:id/mark-paid', async (req, res, next) => {
  try {
    const { rows } = await query(
      `UPDATE payments SET status = 'completed', timestamp = now() WHERE id = $1
       RETURNING id, procurement_id, amount::float8 AS amount, status, reference_id, timestamp`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'payment not found' });
    res.json({ payment: rows[0] });
  } catch (err) {
    next(err);
  }
});

export default router;
