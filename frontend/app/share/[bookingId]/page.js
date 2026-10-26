'use client';

import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import { Card, Alert } from '../../../components/UI';

function Detail({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-gov-border py-3 last:border-0">
      <span className="text-sm text-gov-text-muted">{label}</span>
      <span className="max-w-[62%] text-right text-sm font-bold text-gov-text-main break-words">{value ?? 'Not available yet'}</span>
    </div>
  );
}

export default function SharedBookingPage({ params }) {
  const bookingId = params.bookingId;
  const [booking, setBooking] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api.getPublicBooking(bookingId)
      .then((result) => { if (active) setBooking(result.booking); })
      .catch((err) => { if (active) setError(err.message || 'Could not load booking details.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [bookingId]);

  const statusLabel = (status) => ({
    booked: 'Booked', arrived: 'Arrived at centre', weighing: 'Weighing in progress',
    quality_check: 'Quality check', accepted: 'Accepted', completed: 'Procurement completed',
    rejected: 'Rejected',
  }[status] || status?.replaceAll('_', ' ') || 'Unknown');

  return (
    <main className="min-h-screen bg-gov-bg px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-2xl">
        <header className="mb-6 flex items-center justify-between gap-4">
          <a href="/" className="flex items-center gap-2 text-sm font-bold text-gov-green-deep hover:underline">
            <span aria-hidden="true">←</span> KisanSetu
          </a>
          <span className="rounded-full border border-gov-border bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-gov-text-muted">
            Shared booking view
          </span>
        </header>

        <div className="mb-6">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-gov-green-deep">Agricultural Procurement Portal</p>
          <h1 className="text-3xl font-black tracking-tight text-gov-text-main">Booking details</h1>
          <p className="mt-2 text-sm text-gov-text-muted">This page shows the requested crop and procurement details linked to the QR code.</p>
        </div>

        {loading && (
          <Card className="p-8 text-center">
            <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-gov-border border-t-gov-green-deep" />
            <p className="text-sm font-medium text-gov-text-muted">Loading booking details…</p>
          </Card>
        )}

        {!loading && error && (
          <Card className="p-5">
            <Alert type="danger">
              <p className="font-bold">Booking details unavailable</p>
              <p className="mt-1 text-sm">{error}</p>
            </Alert>
            <p className="mt-4 text-xs text-gov-text-muted">Check the QR code or ask the booking owner for a valid link.</p>
          </Card>
        )}

        {!loading && booking && (
          <>
            <Card className="overflow-hidden border-gov-border bg-white shadow-sm">
              <div className="flex items-start justify-between gap-4 bg-gov-green-deep p-5 text-white">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gov-green-light">Procurement token</p>
                  <h2 className="mt-1 text-3xl font-black">#{booking.token_no}</h2>
                  <p className="mt-2 text-sm text-white/85">{booking.centre_name}</p>
                </div>
                <div className="rounded-xl bg-white p-2 text-gov-green-deep" aria-hidden="true">
                  <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 14h2v6h-6v-2" />
                  </svg>
                </div>
              </div>
              <div className="p-5 sm:p-6">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-bold text-gov-text-main">Current booking status</p>
                  <span className="rounded-full border border-gov-border bg-gov-bg px-3 py-1 text-xs font-bold capitalize text-gov-text-main">{statusLabel(booking.status)}</span>
                </div>
                <div className="divide-y divide-gov-border">
                  <Detail label="Requested crop" value={booking.crop} />
                  <Detail label="Requested quantity" value={`${Number(booking.quantity_kg).toLocaleString()} kg`} />
                  <Detail label="Booking date" value={booking.booking_date} />
                  <Detail label="Arrival slot" value={`${booking.slot_start}–${booking.slot_end}`} />
                  <Detail label="Procurement centre" value={booking.centre_name} />
                  <Detail label="Centre location" value={[booking.centre_location, booking.centre_district].filter(Boolean).join(', ')} />
                  {booking.actual_weight_kg != null && <Detail label="Recorded weight" value={`${Number(booking.actual_weight_kg).toLocaleString()} kg`} />}
                  {booking.quality_grade && <Detail label="Quality grade" value={booking.quality_grade} />}
                  {booking.rate_per_kg != null && <Detail label="Rate per kg" value={`₹${Number(booking.rate_per_kg).toFixed(2)}`} />}
                  {booking.procurement_amount != null && <Detail label="Procurement amount" value={`₹${Number(booking.procurement_amount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`} />}
                  {booking.payment_status && <Detail label="Payment status" value={booking.payment_status} />}
                </div>
              </div>
            </Card>
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-900">
              <strong>Privacy note:</strong> This shareable page intentionally does not display the farmer’s name, phone number or account details. Payment information, if shown, reflects the application’s recorded status and is not proof of a bank transfer.
            </div>
            <footer className="mt-6 text-center text-xs text-gov-text-muted">KisanSetu · Agricultural Procurement Portal</footer>
          </>
        )}
      </div>
    </main>
  );
}
