import { query } from './db.js';
import { refreshAvgProcessingTime } from './queueEngine.js';

// Every booking-returning endpoint sends back exactly this shape (frontend handoff, section 9):
// id, token_no, farmer_id, farmer_name, phone, centre_id, centre_name, crop, quantity_kg,
// booking_date, slot_start, slot_end, status, actual_weight_kg, quality_grade, rate_per_kg,
// payment_status, total_amount, payment_ref
//
// Dates come back as plain 'YYYY-MM-DD' and times as 'HH:MM' (not full timestamps / not
// JS Date objects) -- this is called out explicitly in the handoff checklist, section 23.
const BOOKING_SELECT = `
  SELECT
    b.id,
    b.token_no,
    b.farmer_id,
    u.name AS farmer_name,
    u.phone,
    b.centre_id,
    c.name AS centre_name,
    b.crop,
    b.quantity_kg::float8 AS quantity_kg,
    to_char(b.booking_date, 'YYYY-MM-DD') AS booking_date,
    to_char(b.slot_start, 'HH24:MI') AS slot_start,
    to_char(b.slot_end, 'HH24:MI') AS slot_end,
    b.status,
    p.weight_kg::float8 AS actual_weight_kg,
    p.quality_grade,
    p.rate_per_kg::float8 AS rate_per_kg,
    pay.status AS payment_status,
    pay.amount::float8 AS total_amount,
    pay.reference_id AS payment_ref
  FROM bookings b
  JOIN users u ON u.id = b.farmer_id
  JOIN centres c ON c.id = b.centre_id
  LEFT JOIN procurements p ON p.booking_id = b.id
  LEFT JOIN payments pay ON pay.procurement_id = p.id
`;

export async function getBookingFull(bookingId) {
  const { rows } = await query(`${BOOKING_SELECT} WHERE b.id = $1`, [bookingId]);
  return rows[0] || null;
}

export async function listBookingsByFarmer(farmerId) {
  const { rows } = await query(
    `${BOOKING_SELECT} WHERE b.farmer_id = $1 ORDER BY b.booking_date DESC, b.token_no DESC`,
    [farmerId]
  );
  return rows;
}

export async function listBookingsByCentreAndDate(centreId, date) {
  const { rows } = await query(
    `${BOOKING_SELECT} WHERE b.centre_id = $1 AND b.booking_date = $2 ORDER BY b.token_no ASC`,
    [centreId, date]
  );
  return rows;
}

export async function findBookingByToken(centreId, date, tokenNo) {
  const { rows } = await query(
    `SELECT id FROM bookings WHERE centre_id = $1 AND booking_date = $2 AND token_no = $3`,
    [centreId, date, tokenNo]
  );
  return rows[0] || null;
}

async function ensureProcurement(bookingId) {
  const existing = await query('SELECT * FROM procurements WHERE booking_id = $1', [bookingId]);
  if (existing.rows[0]) return existing.rows[0];
  const created = await query(
    `INSERT INTO procurements (booking_id, status) VALUES ($1, 'pending') RETURNING *`,
    [bookingId]
  );
  return created.rows[0];
}

async function hasQueueEvent(bookingId, eventType) {
  const { rows } = await query(
    `SELECT 1 FROM queue_events WHERE booking_id = $1 AND event_type = $2 LIMIT 1`,
    [bookingId, eventType]
  );
  return rows.length > 0;
}

// Drives every booking status transition the operator/farmer app can trigger, whatever
// endpoint it came in through (generic PATCH /bookings/:id or the specific /procurement/*
// routes) -- one place implementing the state machine so both stay in sync.
export async function applyBookingUpdate(bookingId, updates) {
  const { status, actual_weight_kg, quality_grade, rate_per_kg } = updates;
  const bookingRes = await query('SELECT * FROM bookings WHERE id = $1', [bookingId]);
  const booking = bookingRes.rows[0];
  if (!booking) return null;

  switch (status) {
    case 'arrived': {
      await query(`UPDATE bookings SET status = 'arrived' WHERE id = $1`, [bookingId]);
      if (!(await hasQueueEvent(bookingId, 'arrived'))) {
        await query(`INSERT INTO queue_events (booking_id, event_type) VALUES ($1, 'arrived')`, [bookingId]);
      }
      break;
    }

    case 'weighing': {
      await ensureProcurement(bookingId);
      if (actual_weight_kg != null) {
        await query(
          `UPDATE procurements SET weight_kg = $1, status = 'weighing', updated_at = now() WHERE booking_id = $2`,
          [actual_weight_kg, bookingId]
        );
      } else {
        await query(`UPDATE procurements SET status = 'weighing', updated_at = now() WHERE booking_id = $1`, [bookingId]);
      }
      await query(`UPDATE bookings SET status = 'weighing' WHERE id = $1`, [bookingId]);
      if (!(await hasQueueEvent(bookingId, 'started'))) {
        await query(`INSERT INTO queue_events (booking_id, event_type) VALUES ($1, 'started')`, [bookingId]);
      }
      break;
    }

    case 'quality_check': {
      await ensureProcurement(bookingId);
      const proc = await query('SELECT weight_kg FROM procurements WHERE booking_id = $1', [bookingId]);
      const weight = proc.rows[0]?.weight_kg;
      const amount = weight != null && rate_per_kg != null ? Number(weight) * Number(rate_per_kg) : null;
      await query(
        `UPDATE procurements SET quality_grade = COALESCE($1, quality_grade),
           rate_per_kg = COALESCE($2, rate_per_kg), amount = COALESCE($3, amount),
           status = 'quality_check', updated_at = now() WHERE booking_id = $4`,
        [quality_grade || null, rate_per_kg ?? null, amount, bookingId]
      );
      await query(`UPDATE bookings SET status = 'quality_check' WHERE id = $1`, [bookingId]);
      break;
    }

    case 'completed': {
      const proc = await query(
        `UPDATE procurements SET status = 'completed', updated_at = now() WHERE booking_id = $1 RETURNING *`,
        [bookingId]
      );
      if (!proc.rows[0]) throw new Error('cannot complete a booking with no procurement record yet');
      await query(`UPDATE bookings SET status = 'completed' WHERE id = $1`, [bookingId]);
      if (!(await hasQueueEvent(bookingId, 'completed'))) {
        await query(`INSERT INTO queue_events (booking_id, event_type) VALUES ($1, 'completed')`, [bookingId]);
      }
      await refreshAvgProcessingTime(booking.centre_id);

      // Mock payment record, created automatically on completion (frontend section 4/12).
      const refId = `KS-${Date.now().toString(36).toUpperCase()}`;
      await query(
        `INSERT INTO payments (procurement_id, amount, status, reference_id)
         VALUES ($1, $2, 'processing', $3)
         ON CONFLICT (procurement_id) DO NOTHING`,
        [proc.rows[0].id, proc.rows[0].amount || 0, refId]
      );
      await query(
        `INSERT INTO notifications (farmer_id, booking_id, type, message)
         VALUES ($1, $2, 'completed', 'Procurement completed. Payment is being processed.')`,
        [booking.farmer_id, bookingId]
      );
      break;
    }

    case 'rejected': {
      await query(`UPDATE bookings SET status = 'rejected' WHERE id = $1`, [bookingId]);
      await query(
        `UPDATE procurements SET status = 'rejected', quality_grade = COALESCE($1, quality_grade), updated_at = now()
         WHERE booking_id = $2`,
        [quality_grade || null, bookingId]
      );
      break;
    }

    default:
      throw Object.assign(new Error(`unsupported status "${status}"`), { statusCode: 400 });
  }

  return getBookingFull(bookingId);
}
