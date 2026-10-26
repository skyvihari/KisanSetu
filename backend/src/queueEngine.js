import { query } from './db.js';

// ETA ≈ (farmers ahead × avg processing time per farmer) ÷ active processing capacity
// Kept transparent on purpose -- no black-box "AI" claim, matches product doc section 9.
export async function computeEta(bookingId) {
  const { rows } = await query(
    `SELECT b.*, c.active_counters, c.avg_process_secs
     FROM bookings b JOIN centres c ON c.id = b.centre_id
     WHERE b.id = $1`,
    [bookingId]
  );
  const booking = rows[0];
  if (!booking) return null;

  const aheadRes = await query(
    `SELECT COUNT(*)::int AS ahead FROM bookings
     WHERE centre_id = $1 AND booking_date = $2
       AND status IN ('arrived','weighing','quality_check')
       AND id < $3`,
    [booking.centre_id, booking.booking_date, bookingId]
  );
  const farmersAhead = aheadRes.rows[0].ahead;
  const etaSeconds = Math.round(
    (farmersAhead * booking.avg_process_secs) / Math.max(booking.active_counters, 1)
  );

  return {
    bookingId: Number(bookingId),
    farmersAhead,
    activeCounters: booking.active_counters,
    avgProcessSecs: booking.avg_process_secs,
    etaSeconds,
    etaMinutes: Math.round(etaSeconds / 60),
  };
}

// Recomputes the centre's rolling average processing time from its last N completed procurements.
// Called after every "completed" transition so the ETA formula stays accurate during the demo.
export async function refreshAvgProcessingTime(centreId, sampleSize = 10) {
  const { rows } = await query(
    `SELECT EXTRACT(EPOCH FROM (qe_end.timestamp - qe_start.timestamp))::int AS secs
     FROM bookings b
     JOIN queue_events qe_start ON qe_start.booking_id = b.id AND qe_start.event_type = 'started'
     JOIN queue_events qe_end ON qe_end.booking_id = b.id AND qe_end.event_type = 'completed'
     WHERE b.centre_id = $1
     ORDER BY qe_end.timestamp DESC
     LIMIT $2`,
    [centreId, sampleSize]
  );
  if (rows.length === 0) return;
  const avg = Math.round(rows.reduce((s, r) => s + r.secs, 0) / rows.length);
  await query('UPDATE centres SET avg_process_secs = $1 WHERE id = $2', [avg, centreId]);
}

// Smart slot allocation: is this centre/date still safe to book into?
export async function checkSlotAvailability(centreId, date) {
  const centreRes = await query('SELECT daily_capacity FROM centres WHERE id = $1', [centreId]);
  const capacity = centreRes.rows[0]?.daily_capacity ?? 0;

  const bookedRes = await query(
    `SELECT COUNT(*)::int AS booked FROM bookings
     WHERE centre_id = $1 AND booking_date = $2 AND status != 'rejected'`,
    [centreId, date]
  );
  const booked = bookedRes.rows[0].booked;

  return {
    capacity,
    booked,
    remaining: Math.max(capacity - booked, 0),
    overloaded: booked >= capacity,
  };
}
