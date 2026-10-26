'use client';
import { useState, useEffect, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { api } from '../../../lib/api';
import Header from '../../../components/Header';
import Navbar from '../../../components/Navbar';
import { Card, StatusBadge, Alert, Button } from '../../../components/UI';
import DigitalReceipt from '../../../components/DigitalReceipt';

const STAGES = ['booked', 'arrived', 'weighing', 'quality_check', 'completed'];
const STAGE_LABELS = {
  booked: 'Token Booked',
  arrived: 'Arrived at Centre',
  weighing: 'Crop Weighing',
  quality_check: 'Quality Check & Rate Appraisal',
  completed: 'Procurement Complete & Paid',
};

export default function StatusPage({ params }) {
  const { bookingId } = params;
  const [booking, setBooking] = useState(null);
  const [queue, setQueue] = useState(null);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);
  const [lastUpdated, setLastUpdated] = useState('');
  const [showReceipt, setShowReceipt] = useState(false);
  const [payment, setPayment] = useState(null);
  const [shareUrl, setShareUrl] = useState('');

  useEffect(() => {
    setShareUrl(`${window.location.origin}/share/${encodeURIComponent(bookingId)}`);
    const stored = localStorage.getItem('ks_user');
    if (stored) {
      const parsedUser = JSON.parse(stored);
      if (parsedUser.role !== 'farmer') {
        window.location.href = parsedUser.role === 'admin' ? '/admin' : '/operator';
        return;
      }
      setUser(parsedUser);
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      const [b, q] = await Promise.all([api.getBooking(bookingId), api.getQueue(bookingId)]);
      setBooking(b.booking);
      setQueue(q);
      
      // Fetch payment details if completed
      if (b.booking.status === 'completed') {
        const p = await api.getPayment(bookingId);
        setPayment(p.payment);
      }
      
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      setError(err.message);
    }
  }, [bookingId]);

  useEffect(() => {
    refresh();
    let i;
    const startPolling = () => {
      if (!i) i = setInterval(() => {
        if (!document.hidden) refresh();
      }, 3000);
    };
    const stopPolling = () => {
      if (i) {
        clearInterval(i);
        i = null;
      }
    };
    
    startPolling();
    
    const handleVisibilityChange = () => {
      if (document.hidden) stopPolling();
      else {
        refresh();
        startPolling();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refresh]);

  function handleLogout() {
    localStorage.removeItem('ks_user');
    window.location.href = '/';
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gov-bg">
        <Header user={user} role="farmer" onLogout={handleLogout} />
        <main className="max-w-md mx-auto px-4 py-12">
          <Alert type="danger">
            <p className="font-bold">Error loading booking details</p>
            <p className="text-xs mt-1">{error}</p>
          </Alert>
          <a href="/" className="mt-4 block text-center text-sm font-bold text-gov-green-deep hover:underline">
            Back to Dashboard
          </a>
        </main>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-gov-bg">
        <Header user={user} role="farmer" onLogout={handleLogout} />
        <main className="max-w-md mx-auto px-4 py-20 text-center">
          <div className="animate-spin h-8 w-8 text-gov-green-deep mx-auto mb-4" />
          <p className="text-gov-text-muted font-medium">Fetching live token details...</p>
        </main>
      </div>
    );
  }

  const stageIndex = STAGES.indexOf(booking.status === 'accepted' ? 'quality_check' : booking.status);

  return (
    <div className="min-h-screen bg-gov-bg pb-24 sm:pb-8">
      <Header user={user} role="farmer" onLogout={handleLogout} />
      <Navbar role="farmer" activeBookingId={bookingId} />

      <main className="max-w-md mx-auto px-4 py-6">
        {/* Back Link */}
        <a href="/" className="mb-4 inline-flex items-center gap-1.5 text-xs font-bold text-gov-green-deep hover:underline">
          &larr; Back to Dashboard
        </a>

        {/* Token Card Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-gov-green-deep block leading-tight">Live Status</span>
            <h1 className="text-2xl font-black text-gov-text-main">Token #{booking.token_no}</h1>
          </div>
          <StatusBadge status={booking.status} />
        </div>

        {/* Ticket Details with QR Code */}
        <Card className="p-4 mb-4 flex items-center gap-4 bg-white border-gov-border shadow-sm">
          <div className="bg-slate-50 p-2.5 rounded-lg border border-gov-border shrink-0 flex items-center justify-center">
            <QRCodeSVG value={shareUrl || `/share/${encodeURIComponent(booking.id)}`} size={96} level="M" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gov-text-main truncate text-base">{booking.centre_name}</p>
            <p className="text-xs text-gov-text-muted font-semibold uppercase tracking-wider mt-0.5">{booking.crop}</p>
            <div className="h-px bg-gov-border my-2" />
            <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
              <span className="text-gov-text-muted">Declared:</span>
              <span className="font-bold text-gov-text-main text-right">{booking.quantity_kg} kg</span>
              <span className="text-gov-text-muted">Date:</span>
              <span className="font-semibold text-gov-text-main text-right">{booking.booking_date}</span>
              <span className="text-gov-text-muted">Arrival Slot:</span>
              <span className="font-bold text-gov-green-deep text-right">{booking.slot_start}</span>
            </div>
          </div>
        </Card>
        <a
          href={shareUrl || `/share/${encodeURIComponent(booking.id)}`}
          target="_blank"
          rel="noreferrer"
          className="mb-4 flex items-center justify-center gap-2 rounded-lg border border-gov-border bg-white px-4 py-3 text-sm font-bold text-gov-green-deep hover:bg-gov-green-light/30"
        >
          View shareable booking details ↗
        </a>

        {/* Notification UI Alerts (no emojis) */}
        {queue && booking.status !== 'completed' && (
          <>
            {queue.farmersAhead === 0 && (
              <Alert type="warning" className="mb-4 font-bold flex items-center gap-1.5 text-sm">
                Your turn is next. Please stand by at the weighbridge.
              </Alert>
            )}
            {queue.farmersAhead > 0 && queue.farmersAhead <= 2 && (
              <Alert type="warning" className="mb-4 font-bold flex items-center gap-1.5 text-sm">
                Your token is approaching. Please stay near the scales.
              </Alert>
            )}
            {queue.farmersAhead === 3 && (
              <Alert type="info" className="mb-4 font-bold flex items-center gap-1.5 text-sm">
                Please start travelling to the procurement centre.
              </Alert>
            )}
          </>
        )}

        {/* Live Queue Grid Card */}
        {queue && booking.status !== 'completed' && (
          <Card className="shadow-md border-gov-border mb-4 p-5 bg-white">
            <div className="text-center pb-4 border-b border-gov-border mb-4">
              <span className="text-[10px] uppercase font-bold text-gov-text-muted tracking-wider block">
                Your Token Number
              </span>
              <span className="text-4xl font-black text-gov-green-deep block mt-1">
                #{booking.token_no}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-center mb-4">
              <div className="bg-gov-bg p-3.5 rounded-xl border border-gov-border">
                <span className="text-[10px] uppercase font-bold text-gov-text-muted tracking-wider block">
                  Now Serving
                </span>
                <span className="text-2xl font-black text-gov-text-main block mt-1">
                  #{queue.nowServing}
                </span>
              </div>

              <div className="bg-gov-bg p-3.5 rounded-xl border border-gov-border">
                <span className="text-[10px] uppercase font-bold text-gov-text-muted tracking-wider block">
                  People Ahead
                </span>
                <span className="text-2xl font-black text-gov-text-main block mt-1">
                  {queue.farmersAhead}
                </span>
              </div>
            </div>

            <div className="bg-gov-green-light/30 border border-gov-green-deep/10 rounded-xl p-4 text-center mb-4">
              <span className="text-[10px] uppercase font-bold text-gov-green-deep tracking-wider block">
                Estimated waiting time
              </span>
              <span className="text-2xl font-black text-gov-green-deep block mt-1">
                Estimated wait: {queue.etaMinutes} min
              </span>
              <span className="text-[10px] text-gov-text-muted mt-1.5 block font-medium">
                Wait time may change as the queue moves.
              </span>
            </div>

            <div className="space-y-2.5 text-xs border-t border-gov-border pt-4">
              <div className="flex justify-between items-center">
                <span className="text-gov-text-muted font-medium">Centre Status:</span>
                <span className="font-bold text-gov-text-main">
                  {queue.centreStatus === 'busy' ? 'Centre is busy' : 'Processing normally'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gov-text-muted font-medium">Active Counters:</span>
                <span className="font-bold text-gov-text-main">
                  {queue.activeCounters} / {queue.totalCounters}
                </span>
              </div>

              {/* Arrival Guidance based on queue positions */}
              <div className="flex justify-between items-start pt-2 border-t border-slate-100 mt-2">
                <span className="text-gov-text-muted font-medium shrink-0">Arrival Guidance:</span>
                <span className="font-extrabold text-gov-green-deep text-right">
                  {queue.farmersAhead >= 4 && 'Your turn is not near yet.'}
                  {queue.farmersAhead === 3 && 'Please start preparing to travel.'}
                  {queue.farmersAhead === 2 && 'Please reach the centre now.'}
                  {queue.farmersAhead === 1 && 'Please proceed to the verification counter.'}
                  {queue.farmersAhead === 0 && 'Your turn is next.'}
                </span>
              </div>
            </div>

            {lastUpdated && (
              <p className="text-[10px] text-gov-text-muted text-center italic mt-4 border-t border-slate-50 pt-2.5">
                Last updated at {lastUpdated} (live polling active)
              </p>
            )}
          </Card>
        )}

        {/* Weighing scale details card */}
        {booking.actual_weight_kg && (
          <Card className="p-4 mb-4 bg-white border-gov-border shadow-sm text-xs space-y-2">
            <h3 className="font-bold text-gov-text-muted uppercase tracking-wider">Scale Weighing Parameters</h3>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-gov-text-muted font-medium">Recorded Weight:</span>
              <span className="font-extrabold text-gov-text-main">
                {(booking.actual_weight_kg / 100).toFixed(2)} Quintals ({booking.actual_weight_kg.toLocaleString()} kg)
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-gov-text-muted font-medium">Approximate Booking Quantity:</span>
              <span className="text-gov-text-muted">
                {(booking.quantity_kg / 100).toFixed(2)} Quintals ({booking.quantity_kg.toLocaleString()} kg)
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-gov-text-muted font-medium">Procurement Centre:</span>
              <span className="font-semibold text-gov-text-main">{booking.centre_name}</span>
            </div>
          </Card>
        )}

        {/* Quality check details card */}
        {booking.quality_grade && (
          <Card className="p-4 mb-4 bg-white border-gov-border shadow-sm text-xs space-y-2">
            <h3 className="font-bold text-gov-text-muted uppercase tracking-wider">Quality Appraisal</h3>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-gov-text-muted font-medium">Appraisal Status:</span>
              <span className="font-extrabold text-gov-green-deep">Passed</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-gov-text-muted font-medium">Assessed Quality Grade:</span>
              <span className="font-extrabold text-gov-text-main">Grade {booking.quality_grade}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-gov-text-muted font-medium">
                {['Paddy', 'Maize', 'Wheat', 'Groundnut'].includes(booking.crop) ? 'MSP Rate:' : 'Procurement Rate:'}
              </span>
              <span className="font-bold text-gov-green-deep">
                ₹{booking.rate_per_kg * 100} / Quintal <span className="text-xs text-gov-text-muted">(₹{booking.rate_per_kg}/kg)</span>
              </span>
            </div>
          </Card>
        )}

        {/* Timeline Status */}
        <h2 className="text-sm font-bold uppercase tracking-wider text-gov-text-muted mb-3 flex items-center gap-1.5">
          <svg className="w-4 h-4 text-gov-green-deep" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          Procurement Progress Tracker
        </h2>

        <Card className="p-5 shadow-sm mb-4">
          <ol className="relative border-l-2 border-slate-200 ml-3.5 space-y-5">
            {STAGES.map((s, i) => {
              const isActive = i <= stageIndex;
              const isCurrent = i === stageIndex;

              return (
                <li key={s} className="relative pl-7 text-left">
                  {/* Timeline bullet */}
                  <span className={`absolute -left-[11px] top-0.5 flex h-5.5 w-5.5 items-center justify-center rounded-full border-2 transition-colors duration-200 text-[10px] font-bold ${
                    isActive 
                      ? 'bg-gov-green-deep border-gov-green-deep text-white shadow-sm' 
                      : 'bg-white border-slate-200 text-gov-text-muted'
                  }`}>
                    {isActive ? '✓' : i + 1}
                  </span>
                  
                  {/* Step title */}
                  <h3 className={`text-sm font-bold leading-tight ${isActive ? 'text-gov-text-main' : 'text-gov-text-muted'}`}>
                    {STAGE_LABELS[s]}
                  </h3>
                  
                  {/* Optional short description for UX context */}
                  {isCurrent && s === 'booked' && (
                    <p className="text-[11px] text-gov-text-muted mt-0.5">Please arrive at the centre during your selected slot.</p>
                  )}
                  {isCurrent && s === 'arrived' && (
                    <p className="text-[11px] text-gov-text-muted mt-0.5">Staff has marked your arrival. Waiting for weighing scale allocation.</p>
                  )}
                  {isCurrent && s === 'weighing' && (
                    <p className="text-[11px] text-gov-text-muted mt-0.5">Your crop bags are currently being weighed on the scales.</p>
                  )}
                  {isCurrent && s === 'quality_check' && (
                    <p className="text-[11px] text-gov-text-muted mt-0.5">Grading crop quality & appraising standard Government MSP rates.</p>
                  )}
                  {isActive && s === 'completed' && (
                    <p className="text-[11px] text-status-success font-semibold mt-0.5">Receipt generated & payment processed successfully.</p>
                  )}
                </li>
              );
            })}
          </ol>
        </Card>

        {/* Procurement Completed Summary & Payment status cards */}
        {booking.status === 'completed' && (
          <div className="space-y-4 mb-4">
            <Card className="border-gov-green-medium bg-gov-green-light/20 p-5 shadow-sm">
              <h3 className="text-xs font-bold text-gov-green-deep uppercase tracking-wider mb-2">
                Procurement Completed
              </h3>
              
              <div className="space-y-2 text-xs text-gov-text-muted">
                <div className="flex justify-between">
                  <span>Crop:</span>
                  <span className="font-bold text-gov-text-main">{booking.crop}</span>
                </div>
                <div className="flex justify-between">
                  <span>Final Weight:</span>
                  <span className="font-bold text-gov-text-main">
                    {(booking.actual_weight_kg / 100).toFixed(2)} Quintals ({booking.actual_weight_kg.toLocaleString()} kg)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Centre:</span>
                  <span className="font-bold text-gov-text-main">{booking.centre_name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Date:</span>
                  <span className="font-bold text-gov-text-main">{booking.booking_date}</span>
                </div>
              </div>
            </Card>

            {payment && (
              <Card className="p-5 border-gov-border shadow-sm bg-white">
                <h3 className="text-xs font-bold text-gov-text-main uppercase tracking-wider mb-3">
                  Payment Details
                </h3>
                
                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-gov-text-muted font-medium">Payment Status:</span>
                    <span className={`px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                      payment.payment_status === 'completed' 
                        ? 'bg-gov-green-light text-gov-green-deep' 
                        : payment.payment_status === 'failed'
                          ? 'bg-red-50 text-status-error'
                          : 'bg-amber-50 text-status-pending'
                    }`}>
                      {payment.payment_status === 'completed' ? 'Payment Completed' : payment.payment_status === 'processing' ? 'Payment Processing' : payment.payment_status}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gov-text-muted font-medium">Amount:</span>
                    <span className="font-black text-gov-green-deep text-sm">
                      ₹{payment.amount.toLocaleString('en-IN')}
                    </span>
                  </div>
                  {payment.payment_status === 'completed' && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gov-text-muted font-medium">Payment Date:</span>
                        <span className="font-semibold text-gov-text-main">{payment.payment_date}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gov-text-muted font-medium">Reference ID:</span>
                        <span className="font-mono font-bold text-gov-text-main">{payment.reference_id}</span>
                      </div>
                    </>
                  )}
                </div>

                <p className="mt-3.5 text-[9px] text-gov-text-muted italic border-t border-slate-50 pt-2.5 text-center">
                  Demonstration record. Transaction values are simulated; no bank transfer occurred.
                </p>
              </Card>
            )}

            <Button 
              onClick={() => setShowReceipt(true)} 
              variant="primary" 
              size="lg" 
              className="w-full shadow-sm"
            >
              View Digital Receipt
            </Button>
          </div>
        )}
      </main>

      {showReceipt && (
        <DigitalReceipt 
          booking={booking} 
          payment={payment} 
          onClose={() => setShowReceipt(false)} 
        />
      )}
    </div>
  );
}
