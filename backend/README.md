# KisanSetu Backend

A real Node/Express + Postgres API implementing the exact contract described in
`FINAL FRONTEND HANDOFF REPORT.md` (sections 9–13): same field names, same status
enums, same data shapes -- built so you can swap it in under `lib/api.js` without
touching any component.

## What's implemented

- **Auth:** farmer login uses real SMS OTP verification through Twilio Verify. OTP creation,
  expiry and verification are handled by Twilio; the backend applies request cooldowns and
  requires a short-lived signed proof before first-time farmer registration. Operator/admin
  login remains the existing seeded demo flow and is not production-secure.
- **Centres:** list + per-date availability / smart slot allocation (refuses new
  bookings once a centre hits its daily capacity for that date).
- **Bookings:** create, fetch by id, list by farmer (history), token→booking lookup
  (operator search), and a generic status-transition endpoint.
- **Queue:** live ETA (`farmers ahead × avg processing time ÷ active counters`) and
  arrival marking, polled every few seconds by the farmer app.
- **Procurement:** weigh → quality check → complete → (or reject), each auto-creating
  the payment record and notification on completion.
- **Payments:** fetch by procurement id, demo-only mark-paid endpoint.
- **Market Rates:** MSP vs Mandi comparison per crop (simulated data, matches the
  "Simulated Data" disclaimer requirement).
- **Operator Dashboard:** centre info + today's tallies + full scheduled-farmer list
  for one centre.
- **Admin Dashboard:** aggregated totals + a per-centre breakdown with the exact
  bottleneck formula from the handoff (queue load > 3× active counters ⇒ High Queue
  Load; else `busy` status ⇒ Busy Status) pre-computed, plus 7-day analytics.

Every booking-returning endpoint returns the flattened shape your components already
expect: `farmer_name`, `phone`, `centre_name`, `actual_weight_kg`, `quality_grade`,
`rate_per_kg`, `payment_status`, `total_amount`, `payment_ref` all joined onto one
object. Dates come back as plain `YYYY-MM-DD` and times as `HH:MM` strings, not
timestamps.

## Endpoints

```
POST   /auth/send-otp                           { phone }
POST   /auth/verify-otp                         { phone, code }
POST   /auth/register-farmer                    { phone, name, language?, verificationToken }
POST   /auth/login                              { phone, role } (seeded operator/admin demo only)
GET    /centres
GET    /centres/:id/availability?date=
GET    /market-rates?crop=

POST   /bookings                                { farmer_id, centre_id, crop, quantity_kg, booking_date, slot_start, slot_end }
GET    /bookings?farmer_id=
GET    /bookings/:id
GET    /bookings/lookup?centre_id=&date=&token_no=
PATCH  /bookings/:id                            { status, actual_weight_kg?, quality_grade?, rate_per_kg? }

GET    /queue/:bookingId
POST   /queue/:bookingId/arrival

POST   /procurement/:bookingId/weigh            { actual_weight_kg }
POST   /procurement/:bookingId/quality          { quality_grade, rate_per_kg }
POST   /procurement/:bookingId/complete
POST   /procurement/:bookingId/reject           { quality_grade? }

GET    /payments/:procurementId
POST   /payments/:id/mark-paid

GET    /operator/dashboard?centre_id=&date=
GET    /admin/dashboard?date=
GET    /admin/analytics?centre_id=&days=
```

`PATCH /bookings/:id` and the specific `/procurement/*` routes drive the exact same
state machine (see `src/bookingHelpers.js`) -- use whichever is more convenient to
call from the frontend.

## Status enums (do not change without also changing the frontend)

- Booking: `booked → arrived → weighing → quality_check → completed` (or `rejected`)
- Payment: `processing → completed` (or `pending` / `failed`)

## 1. Set up the database (Supabase — free tier)

1. supabase.com → New project.
2. Project Settings → Database → Connection string → URI (choose "Transaction"
   pooling mode). Copy it.
3. SQL Editor → paste the contents of `src/schema.sql` → Run.

## 2. Run locally

```bash
npm install
cp .env.example .env
# Configure DATABASE_URL, Twilio Verify credentials, and AUTH_TOKEN_SECRET in .env
# See "Configure real SMS OTP" below before testing farmer login.
npm run seed     # loads the deterministic demo dataset (4 centres, ~150 bookings, market rates)
npm run dev       # starts on http://localhost:4000
```

Visit `http://localhost:4000/health` — you should see `{"ok":true}`.

## Configure real SMS OTP (farmer login)

1. Create/sign in to a Twilio account and open **Verify → Services**.
2. Create a Verify Service and copy its Service SID (`VA...`).
3. Copy the Account SID (`AC...`) and Auth Token from Twilio Console.
4. Put these values in `backend/.env` as `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`,
   and `TWILIO_VERIFY_SERVICE_SID`. Never put these values in the frontend or commit `.env`.
5. Set `AUTH_TOKEN_SECRET` to a cryptographically random secret of at least 32 characters.
   For example, generate one locally with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
6. Restart the backend and test with a real phone number that can receive SMS. Provider charges,
   destination restrictions, trial-account verification requirements, and SMS availability depend
   on your Twilio account and region.

The frontend sends the 10-digit Indian mobile number to the backend. The backend converts it to
`+91...` for Twilio and keeps the existing 10-digit format in the users table. Twilio Verify
handles OTP generation, expiry and checking. A new farmer receives a short-lived signed
registration proof only after successful verification. If the Twilio settings are missing, the
API fails closed and does not silently fall back to a demo OTP.

**Important security scope:** this change makes farmer phone verification real, but it does not yet
add authorization middleware to every booking/operator/admin API route or a revocable login session.
The existing operator/admin login is still a demo flow and must be secured before production use.

Demo accounts after seeding:
- Farmer: phone `9000000002` (Ramesh Kumar)
- Operator: phone `9000000001` (Operator Shastry)
- Admin: phone `9000000000` (District Director Verma)

## 3. Connect the frontend

Replace `frontend/lib/api.js` with the version in this handoff (calls this API via
`fetch` and reshapes responses to match `lib/api.js`'s existing method signatures
exactly, so no component needs to change). Set `NEXT_PUBLIC_API_URL` in the
frontend's `.env.local` to this backend's URL.

## 4. Deploy the backend (Render — free tier)

1. Push this repo to GitHub.
2. render.com → New → Web Service → connect your repo, root directory `backend`.
3. Build command: `npm install`. Start command: `npm start`.
4. Environment variables: `DATABASE_URL` (same Supabase string), `CORS_ORIGIN` (your
   Vercel frontend URL), `PORT` (Render sets this automatically).
5. Deploy. Note the URL, e.g. `https://kisansetu-api.onrender.com`.

Free-tier Render services sleep after inactivity and take ~30s to wake up — send a
warm-up request a few minutes before your demo slot.

## Before the demo

- Re-run `npm run seed` against production data the morning of your demo so the
  overloaded-centre scenario (centre 1, today) is still in the future, not the past.
- If you're rehearsing status transitions quickly and repeatedly (e.g. testing
  complete-in-one-second), the live average-processing-time recalculation
  (`refreshAvgProcessingTime`) will pick up those artificially fast times — re-seed
  before the actual demo run so the ETA numbers look realistic again.
- Test the full script end-to-end on the deployed URLs, not just localhost.
