import { Router } from 'express';
import { query } from '../db.js';
import { checkSlotAvailability } from '../queueEngine.js';
import {
  getBookingFull,
  listBookingsByFarmer,
  findBookingByToken,
  applyBookingUpdate,
} from '../bookingHelpers.js';

const router = Router();

// POST /bookings  { farmer_id, centre_id, crop, quantity_kg, booking_date, slot_start, slot_end }
router.post('/', async (req, res, next) => {
  try {
    const { farmer_id, centre_id, crop, quantity_kg, booking_date, slot_start, slot_end } = req.body;
    if (!farmer_id || !centre_id || !crop || !quantity_kg || !booking_date || !slot_start || !slot_end) {
      return res.status(400).json({ error: 'missing required fields' });
    }

    // Smart slot allocation (product doc section 10): refuse if the centre is already
    // overloaded for that date rather than letting the queue grow unbounded.
    const availability = await checkSlotAvailability(centre_id, booking_date);
    if (availability.overloaded) {
      return res.status(409).json({
        error: 'This date is fully booked for this centre.',
        suggestion: 'Try a later date -- capacity resets daily.',
      });
    }

    const tokenRes = await query(
      `SELECT COALESCE(MAX(token_no), 0) + 1 AS next_token FROM bookings
       WHERE centre_id = $1 AND booking_date = $2`,
      [centre_id, booking_date]
    );
    const token_no = tokenRes.rows[0].next_token;

    const inserted = await query(
      `INSERT INTO bookings (farmer_id, centre_id, crop, quantity_kg, booking_date, slot_start, slot_end, token_no)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
      [farmer_id, centre_id, crop, quantity_kg, booking_date, slot_start, slot_end, token_no]
    );
    const bookingId = inserted.rows[0].id;

    await query(
      `INSERT INTO notifications (farmer_id, booking_id, type, message)
       VALUES ($1,$2,'booking_confirmed',$3)`,
      [farmer_id, bookingId, `Booking confirmed. Your token is #${token_no}.`]
    );

    res.status(201).json({ booking: await getBookingFull(bookingId) });
  } catch (err) {
    next(err);
  }
});

// GET /bookings?farmer_id=
router.get('/', async (req, res, next) => {
  try {
    const { farmer_id } = req.query;
    if (!farmer_id) return res.status(400).json({ error: 'farmer_id query param required' });
    res.json({ bookings: await listBookingsByFarmer(farmer_id) });
  } catch (err) {
    next(err);
  }
});

// GET /bookings/lookup?centre_id=&date=&token_no=  -- resolves a Token Number to a Booking ID,
// for the operator portal's token search (frontend handoff section 4).
router.get('/lookup', async (req, res, next) => {
  try {
    const { centre_id, date, token_no } = req.query;
    if (!centre_id || !date || !token_no) {
      return res.status(400).json({ error: 'centre_id, date and token_no query params are required' });
    }
    const match = await findBookingByToken(centre_id, date, token_no);
    if (!match) return res.status(404).json({ error: 'no booking found for that token today' });
    res.json({ booking: await getBookingFull(match.id) });
  } catch (err) {
    next(err);
  }
});

// GET /bookings/public/:id -- safe, shareable booking summary for QR scans.
// Deliberately excludes farmer name, phone number, and internal account identifiers.
router.get('/public/:id', async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT
         b.id, b.token_no, b.crop, b.quantity_kg::float8 AS quantity_kg,
         to_char(b.booking_date, 'YYYY-MM-DD') AS booking_date,
         to_char(b.slot_start, 'HH24:MI') AS slot_start,
         to_char(b.slot_end, 'HH24:MI') AS slot_end, b.status,
         c.name AS centre_name, c.location AS centre_location, c.district AS centre_district,
         p.weight_kg::float8 AS actual_weight_kg, p.quality_grade,
         p.rate_per_kg::float8 AS rate_per_kg, p.amount::float8 AS procurement_amount,
         pay.status AS payment_status, pay.amount::float8 AS payment_amount
       FROM bookings b
       JOIN centres c ON c.id = b.centre_id
       LEFT JOIN procurements p ON p.booking_id = b.id
       LEFT JOIN payments pay ON pay.procurement_id = p.id
       WHERE b.id = $1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'booking not found' });
    res.json({ booking: rows[0] });
  } catch (err) {
    next(err);
  }
});

// GET /bookings/:id
router.get('/:id', async (req, res, next) => {
  try {
    const booking = await getBookingFull(req.params.id);
    if (!booking) return res.status(404).json({ error: 'booking not found' });
    res.json({ booking });
  } catch (err) {
    next(err);
  }
});

// PATCH /bookings/:id  { status, actual_weight_kg?, quality_grade?, rate_per_kg? }
// Generic status-transition endpoint -- maps directly onto api.updateBookingStatus(bookingId, updates)
// in the frontend's mock layer (section 10). Drives arrival, weighing, quality check, completion
// and rejection through one call; see bookingHelpers.applyBookingUpdate for the state machine.
router.patch('/:id', async (req, res, next) => {
  try {
    if (!req.body.status) return res.status(400).json({ error: 'status is required' });
    const booking = await applyBookingUpdate(req.params.id, req.body);
    if (!booking) return res.status(404).json({ error: 'booking not found' });
    res.json({ booking });
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ error: err.message });
    next(err);
  }
});

export default router;
