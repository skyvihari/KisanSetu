# KisanSetu --- Agricultural Procurement Portal

KisanSetu is a web-based agricultural procurement coordination portal
designed to help farmers book procurement slots and track their
progress, while centre operators manage arrivals and procurement
activities and administrators monitor centre-level operations.

The application provides separate role-specific experiences for
**farmers**, **centre operators**, and **district administrators**. It
includes booking and queue tracking, market-rate comparisons using demo
data, procurement status updates, and QR-based sharing of a booking
summary.

> **Project status:** This repository is intended for local development,
> demonstration, and testing. Mock OTP, seeded staff accounts, and
> simulated payment/market data are for demonstration only. Complete
> production-grade authentication, authorization, and deployment
> security checks before using real farmer data or deploying publicly.

## What the website is for

### Farmer portal

-   Sign in using a one-time password (OTP).
-   View procurement centres and market-rate comparisons.
-   Book a procurement slot for a crop and quantity.
-   View booking history and live booking/queue status.
-   View profile and booking details.
-   Scan or share a booking QR code that opens a separate
    booking-summary page.

### Centre operator portal

-   View bookings associated with the operator's centre.
-   Track scheduled farmers and arrivals.
-   Progress procurement through weighing, quality checking, completion,
    or rejection, according to the available workflow.

### District administrator portal

-   View aggregated booking and procurement statistics.
-   Review centre-level queue and operational information.
-   View administrative analytics provided by the backend.

### QR booking summary

Booking confirmation and status pages can display a QR code linking to a
separate share page. The share page is designed to show a
privacy-filtered summary such as requested crop and quantity, booking
date/time, centre, and current status, plus available
procurement/payment status fields. It should not expose a farmer's phone
number or account credentials.

**Important:** A QR code containing a `localhost` URL only works on the
computer running the site. To scan it from a phone, use a reachable LAN
URL while both devices are on the same network, or deploy the
application and encode the public URL. Do not publish sensitive booking
information without reviewing the sharing endpoint and access
requirements.

## Technology stack

-   **Frontend:** Next.js, React, Tailwind CSS
-   **Backend:** Node.js, Express
-   **Database:** PostgreSQL (configured for Supabase)
-   **OTP:** Local mock OTP for development; Twilio Verify can be
    configured for real SMS
-   **QR codes:** `qrcode.react`

## Requirements

Install the following before starting:

-   Node.js 18 or newer
-   npm
-   A PostgreSQL database (for example, a Supabase project)

## Project structure

``` text
Kisansetu-main/
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   └── schema.sql
│   ├── .env.example
│   └── package.json
└── frontend/
    ├── app/
    ├── lib/
    ├── .env.local.example
    └── package.json
```

## Run the website locally

Run the backend and frontend in **two separate terminal windows**. Keep
both terminals open while using the website.

### 1. Configure the database

1.  Create or open your PostgreSQL/Supabase project.
2.  In Supabase, open **Project Settings → Database → Connection string
    → URI** and copy a suitable connection URI. The example
    configuration is intended for a transaction-pooler URI.
3.  If this is a new, empty database, run the SQL in
    `backend/src/schema.sql` using the Supabase SQL Editor.
4.  If the database already contains project data, **do not re-run the
    schema or seed script blindly**. Back up data and review the SQL
    first.

If the database password contains reserved URL characters (such as `@`,
`:`, `/`, `#`, or `%`), URL-encode the password portion of the
connection URI.

### 2. Configure the backend

Open Terminal 1 at the project root, then run:

``` bash
cd backend
```

Create the environment file:

**Windows CMD**

``` bat
copy .env.example .env
```

**macOS/Linux**

``` bash
cp .env.example .env
```

Edit `backend/.env` and set the values for your environment:

``` env
DATABASE_URL=YOUR_POSTGRES_CONNECTION_URI
CORS_ORIGIN=http://localhost:3000
PORT=4000
OTP_MODE=mock
AUTH_TOKEN_SECRET=REPLACE_WITH_A_RANDOM_SECRET_AT_LEAST_32_CHARACTERS_LONG
```

Keep any Twilio variables from `.env.example` only if you plan to
configure real SMS OTP. Never commit or share `.env`.

For local testing, `OTP_MODE=mock` prints the OTP in the backend
terminal. The code expires after five minutes. Use the code printed for
the phone number being tested.

Generate a local random secret with:

``` bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Install dependencies and start the backend:

``` bash
npm install
npm run dev
```

The backend should listen on `http://localhost:4000`. Check its health
endpoint at:

<http://localhost:4000/health>

Expected response:

``` json
{"ok":true}
```

### 3. Configure and start the frontend

Open Terminal 2 at the project root:

``` bash
cd frontend
```

Create the frontend environment file:

**Windows CMD**

``` bat
copy .env.local.example .env.local
```

**macOS/Linux**

``` bash
cp .env.local.example .env.local
```

For local development, make sure `frontend/.env.local` contains:

``` env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

Install dependencies and start Next.js:

``` bash
npm install
npm run dev
```

Open the website:

<http://localhost:3000>

Keep both the backend and frontend terminals running. If you change an
environment file, restart the relevant development server.

## Role-specific pages

-   **Farmer portal:** <http://localhost:3000/>
-   **Centre operator portal:** <http://localhost:3000/operator>
-   **District administrator portal:** <http://localhost:3000/admin>

Local demo staff identifiers in the seeded dataset: - Operator:
`9000000001` - Administrator: `9000000000`

Farmer login in mock mode uses the OTP printed in the backend terminal.
These seeded staff login flows are for demonstration and must not be
treated as production authentication.

## Suggested end-to-end test

1.  Start the backend and frontend.
2.  Sign in as a farmer using the local mock OTP.
3.  Create a test booking for a procurement centre and slot.
4.  Open the booking history/status page and confirm the booking is
    displayed.
5.  Open the operator portal and verify the booking appears for the
    relevant centre.
6.  Test the available arrival, weighing, quality, and
    completion/rejection workflow.
7.  Open the administrator portal and confirm the aggregate totals and
    centre information reflect the same database records.
8.  Scan the booking QR code. For phone testing, ensure its URL is
    reachable from the phone; a `localhost` QR is not reachable from
    another device.
9.  Test invalid OTPs, missing fields, unavailable slots, and
    server/database errors.

## Database safety

-   **Do not run `npm run seed` on a database containing records you
    want to preserve.** The seed script truncates and recreates demo
    data.
-   Seed only when you intentionally want to reset a disposable demo
    database.
-   Keep backups of any database containing useful test or real data.
-   Never commit `.env`, `.env.local`, database credentials,
    authentication secrets, or provider tokens.

## OTP and production notes

Mock OTP is for local development only. It is not suitable for public
deployment. For real SMS, configure a verification provider such as
Twilio Verify, store credentials only in the backend environment, and
verify the provider's billing/trial restrictions.

Before any public or production deployment:

-   Enforce server-side authentication, role-based access control, and
    record ownership checks on every protected API route.
-   Secure operator and administrator authentication.
-   Use production-grade secrets and HTTPS.
-   Review database access policies and least-privilege access.
-   Rate-limit authentication and public sharing endpoints.
-   Review exactly which booking fields are exposed by the QR/share
    endpoint.
-   Replace simulated payment and market-rate values with clearly
    sourced, verified integrations if the application requires live
    data.
-   Test the complete farmer → operator → administrator workflow against
    the deployed services.

The project may contain simulated market rates and payment records.
These values are not proof of a real bank transfer and must not be
represented as official live rates unless verified from a trusted
source.

## Troubleshooting

### Frontend cannot reach the backend

-   Confirm the backend is running on port `4000`.
-   Check `NEXT_PUBLIC_API_URL` in `frontend/.env.local`.
-   Check `CORS_ORIGIN` in `backend/.env`.
-   Restart the relevant server after changing environment variables.

### Farmer OTP is not visible

-   Confirm `OTP_MODE=mock` in `backend/.env`.
-   Check the backend terminal, not the frontend terminal.
-   Make sure the backend was restarted after editing `.env`.
-   Mock mode is not permitted when `NODE_ENV=production`.

### Database connection fails

-   Verify the connection URI, host, port, database name, and password.
-   URL-encode reserved characters in the password.
-   Confirm the Supabase project is active and the selected connection
    mode matches the URI.
-   Do not paste database credentials into screenshots, public issues,
    or chat.

### QR page does not open on a phone

-   A `localhost` URL refers to the phone itself, not the laptop.
-   Use a reachable LAN URL for same-network testing, or deploy the site
    and backend to reachable public URLs.
-   Ensure the share page's API requests point to the reachable backend
    URL.

------------------------------------------------------------------------

KisanSetu is designed to demonstrate a coordinated agricultural
procurement workflow from farmer booking through centre processing and
district-level monitoring.
