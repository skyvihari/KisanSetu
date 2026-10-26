'use client';
import { useState, useEffect } from 'react';
import { api } from '../../../../lib/api';
import Header from '../../../../components/Header';
import { Card, Button, Alert, StatusBadge } from '../../../../components/UI';

export default function ProcurementEntryPage({ params }) {
  const { bookingId } = params;
  const [booking, setBooking] = useState(null);
  const [weight, setWeight] = useState('');
  const [grade, setGrade] = useState('A');
  const [rate, setRate] = useState(22);
  const [step, setStep] = useState('loading'); // arrival -> weigh -> quality -> complete -> done
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [operator, setOperator] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem('ks_user');
    if (!stored) {
      window.location.href = '/operator';
      return;
    }
    if (stored) {
      let parsedUser;
      try { parsedUser = JSON.parse(stored); } catch { localStorage.removeItem('ks_user'); window.location.href = '/operator'; return; }
      if (parsedUser.role !== 'operator') {
        window.location.href = parsedUser.role === 'admin' ? '/admin' : '/';
        return;
      }
      setOperator(parsedUser);
    }
    
    api.getBooking(bookingId)
      .then((d) => {
        setBooking(d.booking);
        if (d.booking) {
          setWeight(d.booking.quantity_kg);
          if (d.booking.crop === 'Paddy') setRate(23);
          else if (d.booking.crop === 'Maize') setRate(22);
          else if (d.booking.crop === 'Cotton') setRate(71);
          else setRate(67);

          if (d.booking.status === 'booked') setStep('arrival');
          else if (d.booking.status === 'arrived') setStep('weigh');
          else if (d.booking.status === 'weighing') setStep('quality');
          else if (d.booking.status === 'quality_check') setStep('complete');
          else if (d.booking.status === 'completed') setStep('done');
          else setStep('arrival');
        }
      })
      .catch((e) => setError(e.message));
  }, [bookingId]);

  async function handleArrival() {
    setError('');
    setLoading(true);
    try {
      await api.markArrival(bookingId);
      setStep('weigh');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleWeigh(e) {
    e.preventDefault();
    if (!weight || Number(weight) <= 0) {
      setError('Please enter a valid weight.');
      return;
    }
    
    setError('');
    setLoading(true);
    try {
      await api.weigh(bookingId, Number(weight));
      setStep('quality');
    } catch (err) { 
      setError(err.message); 
    } finally {
      setLoading(false);
    }
  }

  async function handleQuality(e) {
    e.preventDefault();
    if (!rate || Number(rate) <= 0) {
      setError('Please enter a valid MSP rate.');
      return;
    }
    
    setError('');
    setLoading(true);
    try {
      await api.quality(bookingId, grade, Number(rate));
      setStep('complete');
    } catch (err) { 
      setError(err.message); 
    } finally {
      setLoading(false);
    }
  }

  async function handleComplete() {
    setError('');
    setLoading(true);
    try {
      await api.completeProcurement(bookingId);
      setStep('done');
    } catch (err) { 
      setError(err.message); 
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem('ks_operator');
    localStorage.removeItem('ks_user');
    localStorage.removeItem('ks_auth_method');
    window.location.href = '/operator';
  }

  if (error && !booking) {
    return (
      <div className="min-h-screen bg-gov-bg">
        <Header user={operator} role="operator" onLogout={handleLogout} />
        <main className="max-w-md mx-auto px-4 py-12">
          <Alert type="danger">
            <p className="font-bold">Error loading procurement session</p>
            <p className="text-xs mt-1">{error}</p>
          </Alert>
          <a href="/operator" className="mt-4 block text-center text-sm font-bold text-gov-green-deep hover:underline">
            Back to Dashboard
          </a>
        </main>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-gov-bg">
        <Header user={operator} role="operator" onLogout={handleLogout} />
        <main className="max-w-md mx-auto px-4 py-20 text-center">
          <div className="animate-spin h-8 w-8 text-gov-green-deep mx-auto mb-4" />
          <p className="text-gov-text-muted font-medium">Loading farmer token details...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gov-bg pb-12">
      <Header user={operator} role="operator" onLogout={handleLogout} />
      
      <main className="max-w-md mx-auto px-4 py-8">
        {/* Back navigation */}
        {step !== 'done' && (
          <a href="/operator" className="mb-4 inline-flex items-center gap-1.5 text-xs font-bold text-gov-green-deep hover:underline">
            &larr; Back to Operator Panel
          </a>
        )}

        {/* Header summary */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-gov-green-deep block">Procurement Registry Terminal</span>
            <StatusBadge status={booking.status} />
          </div>
          <h1 className="text-2xl font-black text-gov-text-main">Verify Token #{booking.token_no}</h1>
          <p className="text-sm text-gov-text-muted mt-0.5">
            Farmer declared crop: <span className="font-bold text-gov-text-main">{booking.crop}</span> · Declared weight: <span className="font-bold text-gov-text-main">{booking.quantity_kg} kg</span>
          </p>
        </div>

        {error && <Alert type="danger" className="mb-4">{error}</Alert>}

        {/* STEP 0: ARRIVAL */}
        {step === 'arrival' && (
          <Card className="shadow-md">
            <h2 className="text-base font-bold text-gov-text-main pb-2 border-b border-gov-border mb-4 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-gov-green-deep text-white font-bold text-xs flex items-center justify-center shrink-0">✓</span>
              Confirm Farmer Arrival
            </h2>
            <div className="text-sm space-y-3 mb-6">
              <p className="text-gov-text-muted">Verify the farmer identity before proceeding to the weighing bridge.</p>
              <div className="bg-slate-50 p-4 rounded-lg border border-gov-border space-y-2">
                <div className="flex justify-between">
                  <span className="text-gov-text-muted text-xs font-bold uppercase tracking-wide">Farmer</span>
                  <span className="font-bold">{booking.farmer_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gov-text-muted text-xs font-bold uppercase tracking-wide">Contact</span>
                  <span className="font-mono text-sm">{booking.phone}</span>
                </div>
              </div>
            </div>
            <Button onClick={handleArrival} variant="primary" size="lg" loading={loading} className="w-full">
              Mark Arrived & Go to Scale
            </Button>
          </Card>
        )}

        {/* STEP 1: WEIGHING */}
        {step === 'weigh' && (
          <Card className="shadow-md">
            <h2 className="text-base font-bold text-gov-text-main pb-2 border-b border-gov-border mb-4 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-gov-green-deep text-white font-bold text-xs flex items-center justify-center shrink-0">1</span>
              Weighing Scale Entry
            </h2>

            <form onSubmit={handleWeigh} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gov-text-muted mb-1.5 uppercase tracking-wider">
                  Actual Weighed Weight (kg)
                </label>
                <div className="relative flex rounded-lg overflow-hidden border border-gov-border focus-within:ring-2 focus-within:ring-gov-green-deep/20 focus-within:border-gov-green-deep">
                  <input 
                    type="number" 
                    value={weight} 
                    onChange={(e) => setWeight(e.target.value)}
                    onFocus={(e) => e.target.select()}
                    className="flex-1 rounded-none border-none py-3 px-3.5 focus:ring-0 font-black text-lg" 
                    required 
                    autoFocus 
                  />
                  <span className="bg-slate-100 px-3.5 flex items-center justify-center text-sm font-bold text-gov-text-muted border-l border-gov-border">
                    KG
                  </span>
                </div>
                <div className="mt-2 flex justify-between items-start text-[11px] text-gov-text-muted leading-tight">
                  <span className="max-w-[60%]">Confirm the reading shown on the connected digital weighing bridge.</span>
                  {weight && (
                    <span className={`font-bold text-right ${Math.abs(weight - booking.quantity_kg) / booking.quantity_kg > 0.1 ? 'text-status-danger' : 'text-status-success'}`}>
                      Declared: {booking.quantity_kg} kg<br/>
                      <span className="text-[10px] opacity-80">({weight - booking.quantity_kg > 0 ? '+' : ''}{weight - booking.quantity_kg} kg variance)</span>
                    </span>
                  )}
                </div>
              </div>

              <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full">
                Confirm Weight & Go to Quality
              </Button>
            </form>
          </Card>
        )}

        {/* STEP 2: QUALITY ANALYSIS */}
        {step === 'quality' && (
          <Card className="shadow-md">
            <h2 className="text-base font-bold text-gov-text-main pb-2 border-b border-gov-border mb-4 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-gov-green-deep text-white font-bold text-xs flex items-center justify-center shrink-0">2</span>
              Quality Appraisal & MSP Grading
            </h2>

            <form onSubmit={handleQuality} className="space-y-5">
              <div>
                <span className="block text-xs font-bold text-gov-text-muted mb-2 uppercase tracking-wider">
                  Assessed Quality Grade
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {['A', 'B', 'C', 'Rejected'].map((g) => (
                    <button 
                      type="button" 
                      key={g} 
                      onClick={() => setGrade(g)}
                      className={`rounded-lg border py-2.5 text-xs font-bold transition-all active:scale-[0.97] ${
                        grade === g 
                          ? 'border-gov-green-deep bg-gov-green-light text-gov-green-deep ring-2 ring-gov-green-deep/20' 
                          : 'border-gov-border text-gov-text-main hover:bg-gov-bg'
                      }`}
                    >
                      Grade {g}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gov-text-muted mb-1.5 uppercase tracking-wider">
                  Government Appraised Rate (₹ / kg)
                </label>
                <div className="relative flex rounded-lg overflow-hidden border border-gov-border focus-within:ring-2 focus-within:ring-gov-green-deep/20 focus-within:border-gov-green-deep">
                  <span className="bg-slate-100 px-3.5 flex items-center justify-center text-sm font-bold text-gov-text-muted border-r border-gov-border">
                    ₹
                  </span>
                  <input 
                    type="number" 
                    value={rate} 
                    onChange={(e) => setRate(e.target.value)}
                    onFocus={(e) => e.target.select()}
                    className="flex-1 rounded-none border-none py-3 px-3.5 focus:ring-0 font-bold" 
                    required 
                  />
                  <span className="bg-slate-100 px-3.5 flex items-center justify-center text-xs font-semibold text-gov-text-muted border-l border-gov-border">
                    Per KG
                  </span>
                </div>
                <p className="text-[11px] text-gov-text-muted mt-1.5">
                  Appraised based on standard Minimum Support Price (MSP) FAQ criteria.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gov-text-muted mb-1.5 uppercase tracking-wider">
                  Remarks (Optional)
                </label>
                <textarea 
                  className="w-full border border-gov-border rounded-lg p-3 text-sm focus:ring-2 focus:ring-gov-green-deep/20 focus:border-gov-green-deep transition-all"
                  placeholder="Any notes on crop quality..."
                  rows="2"
                />
              </div>

              <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full">
                Confirm Appraisal parameters
              </Button>
            </form>
          </Card>
        )}

        {/* STEP 3: CONFIRM & COMPLETE */}
        {step === 'complete' && (
          <Card className="shadow-md text-center space-y-4">
            <h2 className="text-base font-bold text-gov-text-main pb-2 border-b border-gov-border text-left flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-gov-green-deep text-white font-bold text-xs flex items-center justify-center shrink-0">3</span>
              Final Registry Confirmation
            </h2>

            <div className="p-4 bg-slate-50 border border-gov-border rounded-xl space-y-2 text-sm text-left">
              <div className="flex justify-between">
                <span className="text-gov-text-muted">Farmer:</span>
                <span className="font-bold text-gov-text-main">{booking.farmer_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gov-text-muted">Confirmed Crop:</span>
                <span className="font-bold text-gov-text-main">{booking.crop}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gov-text-muted">Confirmed Weight:</span>
                <span className="font-bold text-gov-green-deep text-base">{weight} KG</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gov-text-muted">Quality Grade:</span>
                <span className="font-bold text-gov-text-main">Grade {grade}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gov-text-muted">Appraised Rate:</span>
                <span className="font-bold text-gov-text-main">₹ {rate} / kg</span>
              </div>
              <div className="h-px bg-gov-border my-2" />
              <div className="flex justify-between text-base">
                <span className="text-gov-text-main font-bold">Total Payment value:</span>
                <span className="font-black text-gov-green-deep">₹ {(Number(weight) * Number(rate)).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-xs mt-2 pt-2 border-t border-gov-border border-dashed">
                <span className="text-gov-text-muted font-bold">Payment Status (Post-Lock):</span>
                <span className="font-bold text-status-pending">Processing / Pending</span>
              </div>
            </div>

            <p className="text-xs text-gov-text-muted leading-relaxed">
              Upon confirmation, this transaction is locked. The farmer's PWA will show instant receipt reference and DBT processing countdown.
            </p>

            <Button onClick={handleComplete} variant="primary" size="lg" loading={loading} className="w-full shadow-sm">
              Lock Registry & Release Receipt
            </Button>
          </Card>
        )}

        {/* DONE SCREEN */}
        {step === 'done' && (
          <Card className="border-gov-green-deep bg-gov-green-light/20 shadow-md text-center p-6 space-y-4">
            <div className="w-12 h-12 bg-gov-green-deep text-white rounded-full flex items-center justify-center mx-auto text-xl font-bold">
              ✓
            </div>
            
            <div>
              <h2 className="text-lg font-black text-gov-green-deep">Registry Locked & Completed</h2>
              <p className="text-xs text-gov-text-muted mt-1 leading-normal">
                Transaction ID sheet recorded. Farmer's mobile app is now updated with live payment coordination ETA.
              </p>
            </div>

            <div className="h-px bg-gov-green-deep/20" />

            <Button onClick={() => window.location.href = '/operator'} variant="primary" size="lg" className="w-full">
              Back to Operator Panel
            </Button>
          </Card>
        )}
      </main>
    </div>
  );
}
