'use client';
import { QRCodeSVG } from 'qrcode.react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../lib/api';
import Header from '../../components/Header';
import Navbar from '../../components/Navbar';
import { Card, Button, Alert } from '../../components/UI';

const CROPS = ['Paddy', 'Maize', 'Cotton', 'Chilli', 'Groundnut'];
const SLOTS = ['08:00', '09:00', '10:00', '11:00', '13:00', '14:00', '15:00'];
const SLOT_BASE_CAPACITIES = {
  '08:00': 8,
  '09:00': 5,
  '10:00': 2,
  '11:00': 0, // FULL by default
  '13:00': 6,
  '14:00': 3,
  '15:00': 4
};

function renderCropIcon(cropName) {
  if (cropName === 'Paddy') {
    return (
      <svg viewBox="0 0 24 24" className="w-8 h-8 text-gov-green-deep" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2v20M12 4c2 1.5 3 3.5 3 5.5S13.5 13 12 14c-1.5-1-3-2.5-3-4.5S10 5.5 12 4zM12 10c2 1.5 3 3.5 3 5.5s-1.5 3.5-3 4.5c-1.5-1-3-2.5-3-4.5s1-4 3-5.5z"/>
      </svg>
    );
  }
  if (cropName === 'Maize') {
    return (
      <svg viewBox="0 0 24 24" className="w-8 h-8 text-gov-green-deep" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2C9.5 5 9.5 15 12 22c2.5-7 2.5-17 0-20zM8 12c3 1 5 1 8 0M9 8c2.5 1 3.5 1 6 0M9 16c2.5 1 3.5 1 6 0"/>
      </svg>
    );
  }
  if (cropName === 'Cotton') {
    return (
      <svg viewBox="0 0 24 24" className="w-8 h-8 text-gov-green-deep" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 8a3.5 3.5 0 117 0 3.5 3.5 0 11-7 0zm0 0a3.5 3.5 0 10-7 0 3.5 3.5 0 107 0zm0 0a3.5 3.5 0 110 7 3.5 3.5 0 110-7zm0 0a3.5 3.5 0 100-7 3.5 3.5 0 100 7z"/>
      </svg>
    );
  }
  if (cropName === 'Chilli') {
    return (
      <svg viewBox="0 0 24 24" className="w-8 h-8 text-gov-green-deep" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 3a7 7 0 011 .1c1.8 1.4 3 4.1 2 7.9-1.5 5.8-6.5 10-10 11C6.2 19 8.2 13 9 9.5c.8-3.5 1.7-5.5 3-6.5zm0 0c-.2-1-.8-2-1.5-2"/>
      </svg>
    );
  }
  if (cropName === 'Groundnut') {
    return (
      <svg viewBox="0 0 24 24" className="w-8 h-8 text-gov-green-deep" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9 7c1.5-.5 3 .5 3 2s-1.5 2.5-1.5 4c0 1.5 1.5 2.5 3 2s3-1.5 3-3-1.5-2.5-1.5-4c0-1.5 1.5-2.5 3-2s3 1.5 3 3c0 4-4.5 8-7.5 10C8.5 20 4 16 4 12c0-3.5 3.5-4.5 5-5z"/>
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="w-8 h-8 text-gov-green-deep" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2v20M12 2c5 5 5 9 0 14-5-5-5-9 0-14z"/>
    </svg>
  );
}

export default function BookPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [step, setStep] = useState(1);
  const [centres, setCentres] = useState([]);
  
  // Selection States
  const [crop, setCrop] = useState(CROPS[0]);
  const [quintals, setQuintals] = useState(10);
  const [centreId, setCentreId] = useState('');
  const [date, setDate] = useState('');
  const [slot, setSlot] = useState('');
  const [availability, setAvailability] = useState(null);
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [bookingResult, setBookingResult] = useState(null);
  const [shareOrigin, setShareOrigin] = useState('');

  const stepNames = [
    'Select Crop Type',
    'Enter Quantity',
    'Select Procurement Centre',
    'Choose Arrival Date',
    'Select Arrival Time Window',
    'Review Selections',
    'Creating Token',
    'Booking Confirmed'
  ];

  useEffect(() => {
    setShareOrigin(window.location.origin);
  }, []);

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
    
    api.getCentres().then((d) => {
      setCentres(d.centres || []);
      const activeCentres = (d.centres || []).filter(c => c.status !== 'closed');
      if (activeCentres.length > 0) {
        setCentreId(activeCentres[0].id);
      }
    }).catch(() => {});
  }, [router]);

  useEffect(() => {
    if (centreId && date) {
      api.getAvailability(centreId, date)
        .then(setAvailability)
        .catch(() => setAvailability(null));
    } else {
      setAvailability(null);
    }
  }, [centreId, date]);

  const selectedCentre = centres.find(c => c.id === centreId);

  // Generate next 7 consecutive dates
  const getDates = () => {
    const list = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      list.push(d);
    }
    return list;
  };

  const formatDateCard = (d) => {
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return {
      weekday: weekdays[d.getDay()],
      day: d.getDate(),
      month: months[d.getMonth()],
      dateStr: d.toISOString().slice(0, 10)
    };
  };

  // Deterministic remaining capacities per hour slot
  const getSlotRemaining = (timeString) => {
    const base = SLOT_BASE_CAPACITIES[timeString] ?? 5;
    if (typeof window === 'undefined') return base;
    const storedBookings = localStorage.getItem('ks_mock_bookings');
    if (!storedBookings) return base;
    try {
      const bookings = JSON.parse(storedBookings);
      const matched = bookings.filter(b => 
        b.centre_id === centreId && 
        b.booking_date === date && 
        b.slot_start === timeString
      ).length;
      return Math.max(0, base - matched);
    } catch (e) {
      return base;
    }
  };

  // Step Transitions
  const handleCropSelect = (c) => {
    setCrop(c);
  };

  const adjustQuintals = (val) => {
    setQuintals(prev => Math.max(1, prev + val));
  };

  const handleNextStep1 = () => {
    setStep(2);
  };

  const handleNextStep2 = () => {
    if (quintals <= 0) {
      setError('Please enter a valid quantity of at least 1 Quintal.');
      return;
    }
    setError('');
    setStep(3);
  };

  const handleNextStep3 = () => {
    if (!centreId) {
      setError('Please select a procurement centre.');
      return;
    }
    setError('');
    setStep(4);
  };

  const handleNextStep4 = () => {
    if (!date) {
      setError('Please select an arrival date.');
      return;
    }
    setError('');
    setStep(5);
  };

  const handleNextStep5 = () => {
    if (!slot) {
      setError('Please select a preferred time slot.');
      return;
    }
    setError('');
    setStep(6);
  };

  const handleConfirmBooking = async (e) => {
    e.preventDefault();
    setError('');
    setStep(7); // Loading state: "Creating your procurement token..."
    
    try {
      const [h] = slot.split(':');
      const slotEnd = `${String(Number(h) + 1).padStart(2, '0')}:00`;
      
      const { booking } = await api.createBooking({
        farmer_id: user.id,
        centre_id: centreId,
        crop,
        quantity_kg: Number(quintals) * 100, // convert quintals to kg
        booking_date: date,
        slot_start: slot,
        slot_end: slotEnd,
      });
      
      setBookingResult(booking);
      setStep(8); // Successful ticket screen
    } catch (err) {
      setError(err.message || 'Failed to complete booking. Please try again.');
      setStep(6); // Return to review step
    }
  };

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
        
        {/* Wizard Headers (Steps 1 to 6) */}
        {step <= 6 && (
          <>
            <button 
              onClick={() => {
                if (step > 1) {
                  setError('');
                  setStep(step - 1);
                } else {
                  router.push('/');
                }
              }} 
              className="mb-6 inline-flex items-center gap-1.5 text-sm font-bold text-gov-green-deep hover:underline"
            >
              &larr; {step === 1 ? 'Back to Dashboard' : 'Previous Step'}
            </button>

            <div className="mb-6">
              <span className="text-[10px] uppercase font-bold tracking-wider text-gov-green-deep block mb-1">
                Step {step} of 8
              </span>
              <h1 className="text-2xl font-black text-gov-text-main">{stepNames[step - 1]}</h1>
              <p className="text-sm text-gov-text-muted mt-0.5">
                {step === 1 && 'Choose the agricultural crop you are bringing for procurement.'}
                {step === 2 && 'Enter the crop volume you estimate to deliver.'}
                {step === 3 && 'Select a registered purchase centre located in your region.'}
                {step === 4 && 'Choose the date you plan to transport your harvest.'}
                {step === 5 && 'Select an hourly window to coordinate scales and avoid queues.'}
                {step === 6 && 'Verify your inputs before booking your procurement token.'}
              </p>
            </div>

            {/* Visual Step Progress bar */}
            <div className="mb-6 bg-white border border-gov-border rounded-xl p-3 shadow-sm">
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div 
                  className="bg-gov-green-deep h-full transition-all duration-300"
                  style={{ width: `${(step / 8) * 100}%` }}
                />
              </div>
            </div>
          </>
        )}

        {/* STEP 1: CROP SELECTION */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {CROPS.map((c) => {
                const isSelected = crop === c;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => handleCropSelect(c)}
                    className={`p-5 rounded-xl border text-left flex flex-col justify-between h-36 transition-all active:scale-[0.98] ${
                      isSelected 
                        ? 'border-gov-green-deep bg-gov-green-light/40 ring-2 ring-gov-green-deep/25' 
                        : 'border-gov-border bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="p-2 rounded-lg bg-gov-bg inline-block shrink-0">
                      {renderCropIcon(c)}
                    </div>
                    <div className="flex items-center justify-between w-full">
                      <span className="font-bold text-gov-text-main text-sm">{c}</span>
                      {isSelected && (
                        <span className="w-5 h-5 rounded-full bg-gov-green-deep text-white flex items-center justify-center text-[10px] font-black">
                          ✓
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <Button onClick={handleNextStep1} variant="primary" size="lg" className="w-full mt-4">
              Next: Enter Quantity &rarr;
            </Button>
          </div>
        )}

        {/* STEP 2: QUANTITY INPUT */}
        {step === 2 && (
          <Card className="shadow-md">
            <div className="space-y-6">
              <div className="text-center py-4 bg-gov-bg rounded-xl border border-gov-border">
                <span className="text-[10px] uppercase font-bold text-gov-text-muted tracking-wider">Estimated Delivery Volume</span>
                <div className="flex items-center justify-center gap-3 mt-3">
                  <span className="text-4xl font-black text-gov-text-main">{quintals}</span>
                  <span className="text-lg font-bold text-gov-green-deep">Quintals</span>
                </div>
                <p className="text-xs text-gov-text-muted mt-2 font-medium">
                  (= {Number(quintals) * 100} kg)
                </p>
              </div>

              {/* Increments Grid */}
              <div className="grid grid-cols-4 gap-2">
                <button 
                  onClick={() => adjustQuintals(-5)} 
                  className="py-2.5 rounded-lg border border-gov-border bg-white font-bold text-xs hover:bg-gov-bg active:scale-95 text-gov-text-muted"
                >
                  -5 Q
                </button>
                <button 
                  onClick={() => adjustQuintals(-1)} 
                  className="py-2.5 rounded-lg border border-gov-border bg-white font-bold text-xs hover:bg-gov-bg active:scale-95 text-gov-text-muted"
                >
                  -1 Q
                </button>
                <button 
                  onClick={() => adjustQuintals(1)} 
                  className="py-2.5 rounded-lg border border-gov-border bg-white font-bold text-xs hover:bg-gov-bg active:scale-95 text-gov-text-main"
                >
                  +1 Q
                </button>
                <button 
                  onClick={() => adjustQuintals(5)} 
                  className="py-2.5 rounded-lg border border-gov-border bg-white font-bold text-xs hover:bg-gov-bg active:scale-95 text-gov-text-main"
                >
                  +5 Q
                </button>
              </div>

              {/* Direct Keyboard Input */}
              <div>
                <label className="block text-[11px] font-bold text-gov-text-muted mb-1.5 uppercase tracking-wider">
                  Or enter exact value (Quintals)
                </label>
                <input
                  type="number"
                  value={quintals}
                  onChange={(e) => setQuintals(Math.max(1, Number(e.target.value)))}
                  className="w-full font-bold text-lg"
                  min={1}
                  required
                />
              </div>

              {error && <Alert type="danger">{error}</Alert>}

              <Button onClick={handleNextStep2} variant="primary" size="lg" className="w-full">
                Next: Select Centre &rarr;
              </Button>
            </div>
          </Card>
        )}

        {/* STEP 3: CENTRE SELECTION */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="space-y-3">
              {centres.map((c) => {
                const isSelected = centreId === c.id;
                const isClosed = c.status === 'closed';

                return (
                  <button
                    key={c.id}
                    type="button"
                    disabled={isClosed}
                    onClick={() => setCentreId(c.id)}
                    className={`w-full text-left p-4 rounded-xl border flex justify-between items-start transition-all ${
                      isClosed 
                        ? 'border-gov-border bg-slate-100/70 opacity-60 cursor-not-allowed'
                        : isSelected 
                          ? 'border-gov-green-deep bg-gov-green-light/40 ring-2 ring-gov-green-deep/20' 
                          : 'border-gov-border bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="space-y-1">
                      <h3 className="font-bold text-sm text-gov-text-main">{c.name}</h3>
                      <p className="text-xs text-gov-text-muted">{c.location}</p>
                      
                      <div className="pt-1.5 flex items-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
                          c.status === 'open' 
                            ? 'bg-gov-green-light text-gov-green-deep' 
                            : c.status === 'busy' 
                              ? 'bg-amber-50 text-status-pending'
                              : 'bg-red-50 text-status-error'
                        }`}>
                          {c.status}
                        </span>

                        <span className="text-[10px] text-gov-text-muted font-medium">
                          {c.status === 'open' && 'Available · High Capacity'}
                          {c.status === 'busy' && 'Available · Limited Slots'}
                          {c.status === 'closed' && 'Closed · Unavailable'}
                        </span>
                      </div>
                    </div>

                    {!isClosed && isSelected && (
                      <span className="w-5 h-5 rounded-full bg-gov-green-deep text-white flex items-center justify-center text-[10px] font-black shrink-0">
                        ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {error && <Alert type="danger">{error}</Alert>}

            <Button 
              onClick={handleNextStep3} 
              variant="primary" 
              size="lg" 
              disabled={!centreId || selectedCentre?.status === 'closed'} 
              className="w-full mt-4"
            >
              Next: Choose Date &rarr;
            </Button>
          </div>
        )}

        {/* STEP 4: DATE SELECTION */}
        {step === 4 && (
          <div className="space-y-6">
            {selectedCentre?.status === 'closed' ? (
              <Alert type="danger">
                This center is currently closed. Please go back and select an open center.
              </Alert>
            ) : (
              <>
                <span className="block text-xs font-bold text-gov-text-muted uppercase tracking-wider mb-2">
                  Select Arrival Date
                </span>
                
                {/* Horizontal Date scroll/grid list */}
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                  {getDates().map((d) => {
                    const formatted = formatDateCard(d);
                    const isSelected = date === formatted.dateStr;

                    return (
                      <button
                        key={formatted.dateStr}
                        type="button"
                        onClick={() => {
                          setDate(formatted.dateStr);
                          setSlot(''); // reset slot when date changes
                        }}
                        className={`p-3.5 rounded-xl border text-center flex flex-col justify-center gap-1 transition-all active:scale-[0.96] ${
                          isSelected 
                            ? 'border-gov-green-deep bg-gov-green-light/50 ring-2 ring-gov-green-deep/20 font-black' 
                            : 'border-gov-border bg-white hover:bg-slate-50'
                        }`}
                      >
                        <span className="text-[10px] font-bold text-gov-text-muted uppercase">{formatted.weekday}</span>
                        <span className="text-xl font-extrabold text-gov-text-main">{formatted.day}</span>
                        <span className="text-[10px] font-bold text-gov-green-deep uppercase">{formatted.month}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Capacity check loader / status */}
                {date && availability && (
                  <Card className="p-4 bg-slate-50 border-gov-border">
                    <div className="flex items-start gap-2.5 text-xs">
                      <span className={`w-2.5 h-2.5 rounded-full mt-1 shrink-0 ${
                        availability.overloaded ? 'bg-status-error' : 'bg-gov-green-deep'
                      }`} />
                      
                      <div className="space-y-1">
                        <p className="font-bold text-gov-text-main">
                          {availability.overloaded 
                            ? 'Centre capacity reached' 
                            : 'Procurement Centre Available'}
                        </p>
                        <p className="text-gov-text-muted">
                          {availability.overloaded 
                            ? 'Selected date is fully booked. Please choose a different date.'
                            : `Overall date capacity check: ${availability.remaining} of ${availability.capacity} base slots remaining.`}
                        </p>
                      </div>
                    </div>
                  </Card>
                )}

                {error && <Alert type="danger">{error}</Alert>}

                <Button 
                  onClick={handleNextStep4} 
                  variant="primary" 
                  size="lg" 
                  disabled={!date || availability?.overloaded} 
                  className="w-full"
                >
                  Next: Select Time Slot &rarr;
                </Button>
              </>
            )}
          </div>
        )}

        {/* STEP 5: TIME SLOT */}
        {step === 5 && (
          <div className="space-y-6">
            <span className="block text-xs font-bold text-gov-text-muted uppercase tracking-wider mb-2">
              Select Hourly Slot ({date})
            </span>

            <div className="space-y-2">
              {SLOTS.map((s) => {
                const remaining = getSlotRemaining(s);
                const isFull = remaining === 0;
                const isSelected = slot === s;

                return (
                  <button
                    key={s}
                    type="button"
                    disabled={isFull}
                    onClick={() => setSlot(s)}
                    className={`w-full p-4 rounded-xl border flex justify-between items-center transition-all ${
                      isFull 
                        ? 'border-gov-border bg-slate-100 opacity-50 cursor-not-allowed'
                        : isSelected 
                          ? 'border-gov-green-deep bg-gov-green-light/40 ring-2 ring-gov-green-deep/20' 
                          : 'border-gov-border bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${isFull ? 'bg-status-error' : 'bg-gov-green-deep'}`} />
                      <span className="font-bold text-sm text-gov-text-main">{s}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-extrabold uppercase ${
                        isFull ? 'text-status-error' : remaining <= 2 ? 'text-status-pending' : 'text-gov-green-deep'
                      }`}>
                        {isFull ? 'FULL' : remaining <= 2 ? 'LIMITED' : 'AVAILABLE'}
                      </span>
                      
                      <span className="text-xs text-gov-text-muted font-medium border-l border-gov-border pl-3">
                        {isFull ? '0 spots left' : `${remaining} spots left`}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {error && <Alert type="danger">{error}</Alert>}

            <Button 
              onClick={handleNextStep5} 
              variant="primary" 
              size="lg" 
              disabled={!slot} 
              className="w-full"
            >
              Next: Review Booking &rarr;
            </Button>
          </div>
        )}

        {/* STEP 6: BOOKING REVIEW */}
        {step === 6 && (
          <form onSubmit={handleConfirmBooking} className="space-y-6">
            <Card className="shadow-md border-gov-border">
              <h3 className="text-base font-bold text-gov-text-main border-b border-gov-border pb-3 mb-4">
                Booking Details Review
              </h3>

              <div className="space-y-4 text-sm">
                <div className="flex justify-between items-start py-1 border-b border-slate-50">
                  <span className="text-gov-text-muted font-medium">Selected Crop</span>
                  <span className="font-extrabold text-gov-text-main flex items-center gap-1.5">
                    {renderCropIcon(crop)}
                    {crop}
                  </span>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-slate-50">
                  <span className="text-gov-text-muted font-medium">Quantity</span>
                  <span className="font-extrabold text-gov-text-main">
                    {quintals} Quintals <span className="text-xs text-gov-text-muted">({quintals * 100} kg)</span>
                  </span>
                </div>

                <div className="flex justify-between items-start py-1 border-b border-slate-50">
                  <span className="text-gov-text-muted font-medium shrink-0">Procurement Centre</span>
                  <div className="text-right">
                    <p className="font-extrabold text-gov-text-main">{selectedCentre?.name}</p>
                    <p className="text-xs text-gov-text-muted mt-0.5">{selectedCentre?.location}</p>
                  </div>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-slate-50">
                  <span className="text-gov-text-muted font-medium">Scheduled Date</span>
                  <span className="font-extrabold text-gov-text-main">{date}</span>
                </div>

                <div className="flex justify-between items-center py-1">
                  <span className="text-gov-text-muted font-medium">Time Window</span>
                  <span className="font-extrabold text-gov-text-main">{slot}</span>
                </div>
              </div>
            </Card>

            <Alert type="info">
              By confirming, you schedule an arrival slot at the designated centre. Please ensure the harvest quality matches standard Fair Average Quality (FAQ) guidelines.
            </Alert>

            {error && <Alert type="danger">{error}</Alert>}

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setStep(5)}
                className="py-3 border border-gov-border text-xs font-bold rounded-lg text-gov-text-muted hover:bg-gov-bg"
              >
                Change Time
              </button>

              <Button type="submit" variant="primary" size="lg" loading={loading}>
                Confirm & Book Slot
              </Button>
            </div>
          </form>
        )}

        {/* STEP 7: SIMULATED LOADING TRANSITION */}
        {step === 7 && (
          <Card className="py-12 text-center shadow-md border-gov-border">
            <div className="flex flex-col items-center justify-center gap-4">
              <svg className="animate-spin h-10 w-10 text-gov-green-deep" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <div className="space-y-1">
                <h3 className="font-bold text-gov-text-main">Creating your procurement token...</h3>
                <p className="text-xs text-gov-text-muted">Confirming your procurement slot in the system.</p>
              </div>
            </div>
          </Card>
        )}

        {/* STEP 8: BOOKING CONFIRMED (TOKEN TICKET) */}
        {step === 8 && bookingResult && (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-gov-green-light text-gov-green-deep flex items-center justify-center font-extrabold mx-auto text-xl border border-gov-green-medium/20 shadow-sm">
                ✓
              </div>
              <h2 className="text-xl font-black text-gov-text-main">Booking Confirmed</h2>
              <p className="text-xs text-gov-text-muted">Your crop procurement slot registration is complete.</p>
            </div>

            {/* Token Card */}
            <Card className="shadow-md border-gov-border overflow-hidden">
              <div className="bg-gov-green-deep py-4 text-center text-white">
                <span className="text-[10px] font-bold uppercase tracking-widest text-gov-green-light block mb-1">
                  Procurement Token ID
                </span>
                <span className="text-3xl font-black">
                  #{bookingResult.token_no}
                </span>
              </div>

              <div className="p-6 space-y-6 bg-white">
                {/* Real QR code linking to a public, privacy-filtered booking summary */}
                <div className="flex flex-col items-center justify-center p-4 bg-slate-50 border border-gov-border rounded-xl">
                  <QRCodeSVG
                    value={`${shareOrigin}/share/${encodeURIComponent(bookingResult.id)}`}
                    size={160}
                    level="M"
                    includeMargin
                    title="Scan to view shared KisanSetu booking details"
                  />
                  <span className="text-[9px] font-bold text-gov-text-muted mt-2 uppercase tracking-wider">
                    Shareable booking details
                  </span>
                  <a
                    href={`/share/${encodeURIComponent(bookingResult.id)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-bold text-gov-green-deep mt-1 underline"
                  >
                    Open booking details page
                  </a>
                </div>

                {/* Info Table */}
                <table className="w-full text-xs border-collapse">
                  <tbody>
                    <tr className="border-b border-gov-border py-2">
                      <td className="py-2.5 font-bold text-gov-text-muted">Registered Farmer</td>
                      <td className="py-2.5 text-right font-bold text-gov-text-main">{user.name}</td>
                    </tr>
                    <tr className="border-b border-gov-border py-2">
                      <td className="py-2.5 font-bold text-gov-text-muted">Procurement Centre</td>
                      <td className="py-2.5 text-right font-bold text-gov-text-main">{selectedCentre?.name}</td>
                    </tr>
                    <tr className="border-b border-gov-border py-2">
                      <td className="py-2.5 font-bold text-gov-text-muted">Crop / Quantity</td>
                      <td className="py-2.5 text-right font-bold text-gov-text-main">
                        {crop} · {quintals} Quintals
                      </td>
                    </tr>
                    <tr className="py-2">
                      <td className="py-2.5 font-bold text-gov-text-muted">Arrival Date & Slot</td>
                      <td className="py-2.5 text-right font-bold text-gov-green-deep">
                        {date} at {slot}
                      </td>
                    </tr>
                  </tbody>
                </table>

                <Alert type="info">
                  Please show this token number or QR code at the weighbridge arrival counter.
                </Alert>
              </div>
            </Card>

            <div className="space-y-2">
              <Button 
                onClick={() => router.push(`/status/${bookingResult.id}`)} 
                variant="primary" 
                size="lg" 
                className="w-full"
              >
                View Live Queue
              </Button>
              
              <button 
                onClick={() => router.push('/')} 
                className="w-full py-3 bg-white border border-gov-border text-xs font-bold rounded-lg text-gov-text-main hover:bg-slate-50 transition-colors"
              >
                Back to Farmer Dashboard
              </button>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
