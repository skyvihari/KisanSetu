import { query, pool } from './db.js';

// Deterministic demo dataset: 1 district, 4 centres, ~60 farmers, a few overloaded
// periods, plus market rates -- matches product doc section 19 so your demo is
// repeatable and rehearsable.

const CENTRES = [
  { name: 'Amaravati Central Procurement Centre', location: 'Amaravati', district: 'Guntur', daily_capacity: 40, active_counters: 3, avg_process_secs: 300, status: 'open' },
  { name: 'Mangalagiri Farmer Centre', location: 'Mangalagiri', district: 'Guntur', daily_capacity: 30, active_counters: 2, avg_process_secs: 360, status: 'open' },
  { name: 'Tenali Procurement Hub', location: 'Tenali', district: 'Guntur', daily_capacity: 25, active_counters: 2, avg_process_secs: 420, status: 'busy' },
  { name: 'Vijayawada Rural Centre', location: 'Vijayawada', district: 'Krishna', daily_capacity: 35, active_counters: 3, avg_process_secs: 330, status: 'open' },
];

const MARKET_RATES = [
  { crop: 'Paddy', msp_rate_per_quintal: 2300, mandi_rate_per_quintal: 2180, mandi_name: 'Amaravati Mandi' },
  { crop: 'Maize', msp_rate_per_quintal: 2225, mandi_rate_per_quintal: 2260, mandi_name: 'Tenali Mandi' },
  { crop: 'Wheat', msp_rate_per_quintal: 2425, mandi_rate_per_quintal: 2340, mandi_name: 'Vijayawada Mandi' },
  { crop: 'Groundnut', msp_rate_per_quintal: 6783, mandi_rate_per_quintal: 6550, mandi_name: 'Guntur Mandi' },
  { crop: 'Cotton', msp_rate_per_quintal: 7121, mandi_rate_per_quintal: 7300, mandi_name: 'Guntur Mandi' },
  { crop: 'Chilli', msp_rate_per_quintal: 12000, mandi_rate_per_quintal: 13500, mandi_name: 'Guntur Mandi' },
];

const CROPS = ['Paddy', 'Maize', 'Wheat', 'Groundnut', 'Cotton', 'Chilli'];
const FIRST_NAMES = ['Ramesh', 'Suresh', 'Lakshmi', 'Venkata', 'Anjali', 'Krishna', 'Padma', 'Ravi', 'Sita', 'Mahesh', 'Bhavani', 'Kiran'];
const VILLAGES = ['Peda Kakani', 'Nidamarru', 'Duggirala', 'Nunna', 'Kolluru', 'Tadepalli'];

function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function todayPlus(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

async function main() {
  console.log('Seeding KisanSetu demo data...');

  await query('TRUNCATE payments, procurements, queue_events, bookings, notifications, market_rates, centres, users RESTART IDENTITY CASCADE');

  for (const r of MARKET_RATES) {
    await query(
      `INSERT INTO market_rates (crop, msp_rate_per_quintal, mandi_rate_per_quintal, mandi_name)
       VALUES ($1,$2,$3,$4)`,
      [r.crop, r.msp_rate_per_quintal, r.mandi_rate_per_quintal, r.mandi_name]
    );
  }

  const centreIds = [];
  for (const c of CENTRES) {
    const { rows } = await query(
      `INSERT INTO centres (name, location, district, daily_capacity, active_counters, avg_process_secs, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [c.name, c.location, c.district, c.daily_capacity, c.active_counters, c.avg_process_secs, c.status]
    );
    centreIds.push(rows[0].id);
  }

  // Demo operator + admin accounts (phone acts as the login id -- see demo accounts, section 21)
  await query(`INSERT INTO users (role, name, phone, centre_id) VALUES ('operator','Operator Shastry','9000000001',$1)`, [centreIds[0]]);
  await query(`INSERT INTO users (role, name, phone) VALUES ('admin','District Director Verma','9000000000')`);
  // A pre-seeded farmer matching the demo accounts list so login-as-existing-user also works.
  await query(`INSERT INTO users (role, name, phone, village) VALUES ('farmer','Ramesh Kumar','9000000002','Peda Kakani')`);

  // ~60 farmers with bookings spread across today and the next 2 days, with centre 1
  // today intentionally overloaded to demonstrate the smart slot allocation / bottleneck UI.
  let farmerCount = 0;
  for (let dayOffset = 0; dayOffset <= 2; dayOffset++) {
    const date = todayPlus(dayOffset);
    for (const centreId of centreIds) {
      const isOverloadDemo = dayOffset === 0 && centreId === centreIds[0];
      const bookingsToday = isOverloadDemo ? 38 : 8 + Math.floor(Math.random() * 6);

      for (let i = 0; i < bookingsToday; i++) {
        farmerCount++;
        const phone = `70000${String(farmerCount).padStart(5, '0')}`;
        const name = `${rand(FIRST_NAMES)} ${rand(['Reddy', 'Rao', 'Naidu', 'Kumar'])}`;
        const village = rand(VILLAGES);

        const farmerRes = await query(
          `INSERT INTO users (role, name, phone, village, language) VALUES ('farmer',$1,$2,$3,'en') RETURNING id`,
          [name, phone, village]
        );
        const farmerId = farmerRes.rows[0].id;

        const tokenRes = await query(
          `SELECT COALESCE(MAX(token_no),0)+1 AS next FROM bookings WHERE centre_id=$1 AND booking_date=$2`,
          [centreId, date]
        );
        const token = tokenRes.rows[0].next;
        const slotHour = 8 + (i % 8);
        const crop = rand(CROPS);

        // On day 0, mark the first several bookings as progressing through the workflow
        // so the demo has a live, non-empty queue the moment you open it.
        let status = 'booked';
        if (dayOffset === 0 && i < 5) status = 'completed';
        else if (dayOffset === 0 && i < 8) status = 'quality_check';
        else if (dayOffset === 0 && i < 12) status = 'arrived';

        const bookingRes = await query(
          `INSERT INTO bookings (farmer_id, centre_id, crop, quantity_kg, booking_date, slot_start, slot_end, token_no, status)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
          [farmerId, centreId, crop, 200 + Math.floor(Math.random() * 800), date,
            `${slotHour}:00`, `${slotHour}:30`, token, status]
        );
        const bookingId = bookingRes.rows[0].id;

        if (status === 'completed') {
          const weight = 500;
          const rate = 22;
          const procRes = await query(
            `INSERT INTO procurements (booking_id, weight_kg, quality_grade, rate_per_kg, amount, status)
             VALUES ($1,$2,'A',$3,$4,'completed') RETURNING id`,
            [bookingId, weight, rate, weight * rate]
          );
          await query(
            `INSERT INTO payments (procurement_id, amount, status, reference_id) VALUES ($1,$2,'completed',$3)`,
            [procRes.rows[0].id, weight * rate, `KS-DEMO${bookingId}`]
          );
          await query(`INSERT INTO queue_events (booking_id, event_type) VALUES ($1,'arrived'),($1,'started'),($1,'completed')`, [bookingId]);
        } else if (status === 'quality_check') {
          await query(
            `INSERT INTO procurements (booking_id, weight_kg, quality_grade, status) VALUES ($1,$2,'B','quality_check')`,
            [bookingId, 450]
          );
          await query(`INSERT INTO queue_events (booking_id, event_type) VALUES ($1,'arrived'),($1,'started')`, [bookingId]);
        } else if (status === 'arrived') {
          await query(`INSERT INTO queue_events (booking_id, event_type) VALUES ($1,'arrived')`, [bookingId]);
        }
      }
    }
  }

  console.log(`Seeded ${centreIds.length} centres, ${MARKET_RATES.length} market rates, and ${farmerCount} farmer bookings.`);
  console.log('Demo operator login: phone 9000000001');
  console.log('Demo admin login:    phone 9000000000');
  console.log('Demo farmer login:   phone 9000000002 (Ramesh Kumar)');
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
