-- KisanSetu core schema
-- Run this once against your Postgres/Supabase database before seeding.
--
-- Status enums below are kept intentionally identical to what the frontend's Timeline UI
-- and role guards expect (see FINAL FRONTEND HANDOFF REPORT, sections 9/11/12) -- do not
-- rename these values without also changing the frontend.

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  role          TEXT NOT NULL CHECK (role IN ('farmer','operator','admin')),
  name          TEXT NOT NULL,
  phone         TEXT UNIQUE NOT NULL,
  village       TEXT,
  language      TEXT DEFAULT 'en',
  centre_id     INTEGER,          -- for operator: which centre they staff
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS centres (
  id               SERIAL PRIMARY KEY,
  name             TEXT NOT NULL,
  location         TEXT NOT NULL,
  district         TEXT NOT NULL DEFAULT '',
  daily_capacity   INTEGER NOT NULL DEFAULT 100,
  active_counters  INTEGER NOT NULL DEFAULT 2,
  avg_process_secs INTEGER NOT NULL DEFAULT 360, -- rolling average processing time per farmer
  status           TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','busy','closed')),
  created_at       TIMESTAMPTZ DEFAULT now()
);

-- Booking status enum matches section 11 of the frontend handoff EXACTLY:
-- booked -> arrived -> weighing -> quality_check -> completed (or rejected)
CREATE TABLE IF NOT EXISTS bookings (
  id             SERIAL PRIMARY KEY,
  farmer_id      INTEGER NOT NULL REFERENCES users(id),
  centre_id      INTEGER NOT NULL REFERENCES centres(id),
  crop           TEXT NOT NULL,
  quantity_kg    NUMERIC NOT NULL,
  booking_date   DATE NOT NULL,
  slot_start     TIME NOT NULL,
  slot_end       TIME NOT NULL,
  token_no       INTEGER NOT NULL,
  status         TEXT NOT NULL DEFAULT 'booked'
                 CHECK (status IN ('booked','arrived','weighing','quality_check','completed','rejected')),
  created_at     TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS queue_events (
  id          SERIAL PRIMARY KEY,
  booking_id  INTEGER NOT NULL REFERENCES bookings(id),
  event_type  TEXT NOT NULL, -- arrived | started | completed
  timestamp   TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS procurements (
  id            SERIAL PRIMARY KEY,
  booking_id    INTEGER NOT NULL UNIQUE REFERENCES bookings(id),
  weight_kg     NUMERIC,
  quality_grade TEXT,        -- A | B | C | Rejected
  rate_per_kg   NUMERIC,
  amount        NUMERIC,
  status        TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','weighing','quality_check','completed','rejected')),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- payment_status enum matches section 12 of the frontend handoff EXACTLY
CREATE TABLE IF NOT EXISTS payments (
  id              SERIAL PRIMARY KEY,
  procurement_id  INTEGER NOT NULL UNIQUE REFERENCES procurements(id),
  amount          NUMERIC NOT NULL,
  status          TEXT NOT NULL DEFAULT 'processing'
                  CHECK (status IN ('processing','pending','failed','completed')),
  reference_id    TEXT,
  timestamp       TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
  id              SERIAL PRIMARY KEY,
  farmer_id       INTEGER NOT NULL REFERENCES users(id),
  booking_id      INTEGER REFERENCES bookings(id),
  type            TEXT NOT NULL, -- booking_confirmed | approaching_turn | completed
  message         TEXT NOT NULL,
  channel         TEXT NOT NULL DEFAULT 'app',
  delivery_status TEXT NOT NULL DEFAULT 'sent',
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- Market Rates page: MSP vs nearby Mandi price comparison per crop (simulated data, per doc).
CREATE TABLE IF NOT EXISTS market_rates (
  id                     SERIAL PRIMARY KEY,
  crop                   TEXT UNIQUE NOT NULL,
  msp_rate_per_quintal   NUMERIC NOT NULL,
  mandi_rate_per_quintal NUMERIC NOT NULL,
  mandi_name             TEXT NOT NULL DEFAULT '',
  updated_at             TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bookings_centre_date ON bookings(centre_id, booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_farmer ON bookings(farmer_id);
