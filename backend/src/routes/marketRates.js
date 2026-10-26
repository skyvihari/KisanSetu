import { Router } from 'express';
import { query } from '../db.js';

const router = Router();

// GET /market-rates?crop=  -- backs the Farmer Portal's Market Rates page and dashboard
// preview card. Always carries the "Simulated Data" disclaimer at the frontend layer
// (frontend handoff section 3/7) -- these numbers are illustrative, not a live mandi feed.
router.get('/', async (req, res, next) => {
  try {
    const { crop } = req.query;
    const { rows } = crop
      ? await query(
          `SELECT crop, msp_rate_per_quintal::float8 AS msp_rate_per_quintal,
                  mandi_rate_per_quintal::float8 AS mandi_rate_per_quintal, mandi_name, updated_at
           FROM market_rates WHERE crop ILIKE $1 ORDER BY crop`,
          [`%${crop}%`]
        )
      : await query(
          `SELECT crop, msp_rate_per_quintal::float8 AS msp_rate_per_quintal,
                  mandi_rate_per_quintal::float8 AS mandi_rate_per_quintal, mandi_name, updated_at
           FROM market_rates ORDER BY crop`
        );
    res.json({ rates: rows });
  } catch (err) {
    next(err);
  }
});

export default router;
