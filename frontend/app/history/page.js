'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../../components/Header';
import Navbar from '../../components/Navbar';
import { Card, Button } from '../../components/UI';
import { api } from '../../lib/api';
import DigitalReceipt from '../../components/DigitalReceipt';


export default function HistoryPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showReceipt, setShowReceipt] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('ks_user');
    if (!stored) {
      router.push('/');
      return;
    }
    const parsedUser = JSON.parse(stored);
    if (parsedUser.role !== 'farmer') {
      router.push(parsedUser.role === 'admin' ? '/admin' : '/operator');
      return;
    }
    setUser(parsedUser);
  }, [router]);

  useEffect(() => {
    if (user) {
      api.getFarmerBookings(user.id)
        .then((d) => {
          const completedOnly = (d.bookings || []).filter(b => b.status === 'completed');
          setBookings(completedOnly);
        })
        .catch(() => {});
    }
  }, [user]);

  function handleLogout() {
    localStorage.removeItem('ks_user');
    router.push('/');
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gov-bg pb-24 sm:pb-8">
      <Header user={user} role="farmer" onLogout={handleLogout} />
      <Navbar role="farmer" />

      <main className="max-w-xl mx-auto px-4 sm:px-6 py-8">
        <a href="/" className="mb-6 inline-flex items-center gap-1.5 text-sm font-bold text-gov-green-deep hover:underline ks-no-print">
          &larr; Back to Dashboard
        </a>

        <div className="mb-6">
          <span className="text-[10px] uppercase font-bold tracking-wider text-gov-green-deep block mb-1">Receipt History</span>
          <h1 className="text-2xl font-black text-gov-text-main">Previous Receipts</h1>
          <p className="text-sm text-gov-text-muted mt-0.5">View your completed crop procurement receipts, weight sheets, and payment references.</p>
        </div>

        <div className="space-y-4">
          {/* Dynamic Receipts from completed bookings */}
          {bookings.map((b) => {
            const displayWeight = b.actual_weight_kg ? (b.actual_weight_kg / 100).toFixed(2) : (b.quantity_kg / 100).toFixed(2);
            const ratePerQuintal = b.rate_per_kg ? b.rate_per_kg * 100 : 2200;
            const totalAmount = b.total_amount || (b.actual_weight_kg ? b.actual_weight_kg * (b.rate_per_kg || 22) : 0);
            const displayPaymentStatus = b.payment_status === 'completed' ? 'Paid' : b.payment_status === 'processing' ? 'Processing' : 'Pending';
            const paymentRef = b.payment_ref || 'DEMO-PAY-' + (100000 + Number(b.id));

            return (
              <Card key={b.id} className="bg-white border-gov-border shadow-sm">
                <div className="flex justify-between items-start border-b border-gov-border pb-3 mb-3">
                  <div>
                    <span className="text-[10px] text-gov-text-muted font-bold block uppercase tracking-wider">Receipt ID</span>
                    <span className="font-extrabold text-gov-text-main text-sm">REC-2026-0{b.id}</span>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase ${
                    displayPaymentStatus === 'Paid'
                      ? 'bg-green-100 text-gov-green-deep border border-green-200'
                      : 'bg-amber-100 text-status-pending border border-amber-200'
                  }`}>
                    {displayPaymentStatus}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-y-2.5 gap-x-4 text-sm mb-3.5">
                  <div>
                    <span className="text-xs text-gov-text-muted block">Procured Date</span>
                    <span className="font-semibold text-gov-text-main">{b.booking_date}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gov-text-muted block text-right">Procurement Centre</span>
                    <span className="font-semibold text-gov-text-main block text-right">{b.centre_name}</span>
                  </div>

                  <div>
                    <span className="text-xs text-gov-text-muted block">Crop & Total Weight</span>
                    <span className="font-bold text-gov-text-main">
                      {b.crop} · {displayWeight} Quintals ({b.actual_weight_kg} kg)
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-gov-text-muted block text-right">
                      {['Paddy', 'Maize', 'Wheat', 'Groundnut'].includes(b.crop) ? 'MSP Rate' : 'Procurement Rate'}
                    </span>
                    <span className="font-semibold text-gov-text-main block text-right">
                      ₹{ratePerQuintal} / Quintal <span className="text-xs text-gov-text-muted font-normal">(₹{b.rate_per_kg || 22}/kg)</span>
                    </span>
                  </div>

                  <div className="col-span-2 h-px bg-slate-100 my-1" />

                  <div>
                    <span className="text-xs text-gov-text-muted block">Total Amount</span>
                    <span className="text-lg font-black text-gov-green-deep">
                      ₹{totalAmount.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-gov-text-muted block text-right">Bank Reference (DBT)</span>
                    <span className="font-mono text-xs text-gov-text-main block text-right tracking-tight font-bold">
                      {paymentRef}
                    </span>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-3 flex justify-end">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="font-bold text-xs"
                    onClick={() => {
                      setSelectedBooking(b);
                      setShowReceipt(true);
                    }}
                  >
                    View Receipt
                  </Button>
                </div>
              </Card>
            );
          })}


        </div>
      </main>

      {showReceipt && selectedBooking && (
        <DigitalReceipt 
          booking={selectedBooking} 
          onClose={() => {
            setShowReceipt(false);
            setSelectedBooking(null);
          }} 
        />
      )}
    </div>
  );
}
