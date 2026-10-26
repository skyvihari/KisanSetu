import { Router } from 'express';
import { query } from '../db.js';

const router = Router();

// GET /admin/dashboard?date=  -- aggregated totals across all centres, plus a per-centre
// breakdown with the bottleneck flag pre-computed using the exact formula from the frontend
// handoff section 5 (activeQueue = booked+arrived+weighing+quality_check ÷ active_counters;
// > 3 => High Queue Load, else 'busy' status => Busy Status). Raw per-centre counts are
// included too in case the frontend prefers to run its own copy of this logic.
router.get('/dashboard', async (req, res, next) => {
  try {
    const today = req.query.date || new Date().toISOString().slice(0, 10);

    const perCentre = await query(
      `SELECT c.id, c.name, c.location, c.active_counters, c.avg_process_secs, c.status,
              COUNT(b.*) FILTER (WHERE b.status = 'booked')::int AS booked,
              COUNT(b.*) FILTER (WHERE b.status = 'arrived')::int AS arrived,
              COUNT(b.*) FILTER (WHERE b.status IN ('weighing','quality_check'))::int AS processing,
              COUNT(b.*) FILTER (WHERE b.status = 'completed')::int AS completed
       FROM centres c
       LEFT JOIN bookings b ON b.centre_id = c.id AND b.booking_date = $1
       GROUP BY c.id ORDER BY c.name`,
      [today]
    );

    const centres = perCentre.rows.map((c) => {
      const activeQueue = c.booked + c.arrived + c.processing;
      const queueLoad = c.active_counters > 0 ? activeQueue / c.active_counters : 0;
      let bottleneck = 'normal';
      if (queueLoad > 3) bottleneck = 'high_queue_load';
      else if (c.status === 'busy') bottleneck = 'busy_status';
      return { ...c, queue_load: Number(queueLoad.toFixed(2)), bottleneck };
    });

    const totals = centres.reduce(
      (acc, c) => ({
        booked: acc.booked + c.booked,
        arrived: acc.arrived + c.arrived,
        processing: acc.processing + c.processing,
        completed: acc.completed + c.completed,
      }),
      { booked: 0, arrived: 0, processing: 0, completed: 0 }
    );

    // Keep the API contract compatible with the admin UI and provide the shared
    // booking records used for centre-level queue calculations.
    const bookingRows = await query(
      `SELECT b.id, b.token_no, b.farmer_id, u.name AS farmer_name, u.phone,
              b.centre_id, c.name AS centre_name, b.crop, b.quantity_kg::float8 AS quantity_kg,
              to_char(b.booking_date, 'YYYY-MM-DD') AS booking_date,
              to_char(b.slot_start, 'HH24:MI') AS slot_start,
              to_char(b.slot_end, 'HH24:MI') AS slot_end, b.status
       FROM bookings b JOIN users u ON u.id = b.farmer_id
       JOIN centres c ON c.id = b.centre_id
       WHERE b.booking_date = $1 ORDER BY b.centre_id, b.token_no`,
      [today]
    );
    res.json({ date: today, totals, counts: totals, centres, bookings: bookingRows.rows });
  } catch (err) {
    next(err);
  }
});

// GET /admin/analytics?centre_id=&days=7  -- avg wait time + 7-day volume trend
router.get('/analytics', async (req, res, next) => {
  try {
    const { centre_id, days = 7 } = req.query;
    const centreFilter = centre_id ? 'AND centre_id = $2' : '';
    const params = centre_id ? [Number(days), centre_id] : [Number(days)];

    const daily = await query(
      `SELECT to_char(booking_date, 'YYYY-MM-DD') AS booking_date, COUNT(*)::int AS farmers,
              COUNT(*) FILTER (WHERE status = 'completed')::int AS completed
       FROM bookings
       WHERE booking_date >= CURRENT_DATE - $1::int ${centreFilter}
       GROUP BY booking_date ORDER BY booking_date`,
      params
    );

    const avgWaitFilter = centre_id ? 'AND b.centre_id = $2' : '';
    const avgWait = await query(
      `SELECT AVG(EXTRACT(EPOCH FROM (qe_start.timestamp - qe_arrived.timestamp)))::int AS avg_wait_secs
       FROM bookings b
       JOIN queue_events qe_arrived ON qe_arrived.booking_id = b.id AND qe_arrived.event_type = 'arrived'
       JOIN queue_events qe_start ON qe_start.booking_id = b.id AND qe_start.event_type = 'started'
       WHERE b.booking_date >= CURRENT_DATE - $1::int ${avgWaitFilter}`,
      params
    );

    res.json({ daily: daily.rows, avgWaitSecs: avgWait.rows[0]?.avg_wait_secs || 0 });
  } catch (err) {
    next(err);
  }
});

export default router;
