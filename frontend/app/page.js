'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../lib/api';
import Header from '../components/Header';
import Navbar from '../components/Navbar';
import { Card, Button, StatusBadge, Alert } from '../components/UI';
import DigitalReceipt from '../components/DigitalReceipt';

export default function HomePage() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [otp, setOtp] = useState('');
  const [otpDeliveryMode, setOtpDeliveryMode] = useState('twilio');
  const [verificationToken, setVerificationToken] = useState('');
  const [needsName, setNeedsName] = useState(false);
  
  // step-by-step login: 'lang' -> 'phone' -> 'otp' -> 'name_reg' (if new user name needed)
  const [loginStep, setLoginStep] = useState('lang');
  const [selectedLang, setSelectedLang] = useState('en');
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [queues, setQueues] = useState({});
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showReceipt, setShowReceipt] = useState(false);

  // Load language and user session
  useEffect(() => {
    const storedUser = typeof window !== 'undefined' && localStorage.getItem('ks_user');
    const storedLang = typeof window !== 'undefined' && localStorage.getItem('ks_lang');
    
    if (storedLang) setSelectedLang(storedLang);
    // Discard sessions created by the previous demo OTP flow. Only restore a farmer
    // profile after this browser has completed the new SMS-OTP flow.
    const authMethod = typeof window !== 'undefined' && localStorage.getItem('ks_auth_method');
    if (storedUser && authMethod === 'otp') {
      try { setUser(JSON.parse(storedUser)); }
      catch { localStorage.removeItem('ks_user'); localStorage.removeItem('ks_auth_method'); }
    } else if (storedUser) {
      localStorage.removeItem('ks_user');
      localStorage.removeItem('ks_auth_method');
    }
  }, []);

  // Fetch farmer bookings
  useEffect(() => {
    if (user) {
      api.getFarmerBookings(user.id)
        .then((d) => setBookings(d.bookings || []))
        .catch(() => {});
    }
  }, [user]);

  // Fetch queue details for active bookings
  useEffect(() => {
    if (bookings.length > 0) {
      bookings.forEach(async (b) => {
        if (['booked', 'arrived', 'weighing', 'quality_check'].includes(b.status)) {
          try {
            const q = await api.getQueue(b.id);
            setQueues(prev => ({ ...prev, [b.id]: q }));
          } catch (e) {}
        }
      });
    }
  }, [bookings]);

  // Handle logout
  function handleLogout() {
    localStorage.removeItem('ks_user');
    localStorage.removeItem('ks_auth_method');
    setUser(null);
    setPhone('');
    setName('');
    setOtp('');
    setVerificationToken('');
    setNeedsName(false);
    setLoginStep('lang');
  }

  // Handle language confirmation
  function selectLanguage(lang) {
    setSelectedLang(lang);
    localStorage.setItem('ks_lang', lang);
    setLoginStep('phone');
  }

  // Send the OTP only after the backend/provider confirms the request was accepted.
  async function handlePhoneSubmit(e) {
    e.preventDefault();
    if (phone.length !== 10 || !/^[6-9]\d{9}$/.test(phone)) {
      setError('Please enter a valid 10-digit Indian mobile number.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const response = await api.sendOtp({ phone });
      setOtpDeliveryMode(response.mode || 'twilio');
      setOtp('');
      setLoginStep('otp');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // OTP is verified by the backend through the SMS provider, never in the browser.
  async function handleOtpVerify(e) {
    e.preventDefault();
    if (!/^\d{4,10}$/.test(otp)) {
      setError('Enter the verification code from your SMS.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const result = await api.verifyOtp({ phone, code: otp });
      if (result.user) {
        localStorage.setItem('ks_user', JSON.stringify(result.user));
        localStorage.setItem('ks_auth_method', 'otp');
        setUser(result.user);
      } else if (result.needsRegistration && result.verificationToken) {
        setVerificationToken(result.verificationToken);
        setNeedsName(true);
        setLoginStep('name_reg');
      } else {
        setError('Could not complete verification. Please try again.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // New farmer registration requires proof that this phone passed OTP verification.
  async function handleNameSubmit(e) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Name is required.');
      return;
    }
    if (!verificationToken) {
      setError('Phone verification expired. Please verify your mobile number again.');
      setLoginStep('phone');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const { user: u } = await api.registerFarmer({
        phone,
        name: name.trim(),
        language: selectedLang,
        verificationToken,
      });
      localStorage.setItem('ks_user', JSON.stringify(u));
      localStorage.setItem('ks_auth_method', 'otp');
      setUser(u);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Multi-language strings for farmer-friendliness
  const text = {
    en: {
      tag: 'Secure & Simplified Agricultural Procurement',
      sub: 'Know when to arrive at the centre. Track your crop weight, quality checks, and payment status in real time.',
      selectLang: 'Choose Language / भाषा चुनें / భాషను ఎంచుకోండి',
      enterPhone: 'Enter Mobile Number',
      phoneLabel: '10-Digit Mobile Number',
      phoneSub: 'We will prepare a verification code for this mobile number.',
      btnContinue: 'Send Verification Code',
      verifyOtp: 'Enter Verification Code',
      otpLabel: 'Verification Code',
      otpSub: 'Enter the verification code for this mobile number.',
      btnVerify: 'Verify & Enter Portal',
      regName: 'Complete Your Profile',
      nameLabel: 'Farmer Full Name (As in Aadhaar/Bank)',
      btnFinish: 'Create Profile & Continue',
      welcome: 'Welcome, Farmer',
      activeTokens: 'Your Procurement Bookings',
      noBookings: 'No active procurement bookings found.',
      btnNewBooking: 'Book Procurement Slot',
      quickActions: 'Quick Navigation',
      actionBook: 'Book New Slot',
      actionRates: 'Live Crop Rates',
      actionHistory: 'Previous Receipts',
      actionProfile: 'My Profile Details',
    },
    hi: {
      tag: 'सुरक्षित और सरल कृषि खरीद पोर्टल',
      sub: 'केन्द्र पर कब पहुँचना है जानें। अपनी फसल का वजन, गुणवत्ता जाँच और भुगतान की स्थिति वास्तविक समय में ट्रैक करें।',
      selectLang: 'भाषा चुनें / Choose Language / భాషను ఎంచుకోండి',
      enterPhone: 'मोबाइल नंबर दर्ज करें',
      phoneLabel: '10-अंकों का मोबाइल नंबर',
      phoneSub: 'इस मोबाइल नंबर के लिए सत्यापन कोड तैयार किया जाएगा।',
      btnContinue: 'सत्यापन कोड भेजें',
      verifyOtp: 'सत्यापन कोड दर्ज करें',
      otpLabel: 'सत्यापन कोड',
      otpSub: 'इस मोबाइल नंबर के लिए सत्यापन कोड दर्ज करें।',
      btnVerify: 'सत्यापित करें और प्रवेश करें',
      regName: 'अपनी प्रोफाइल पूरी करें',
      nameLabel: 'किसान का पूरा नाम (आधार/बैंक के अनुसार)',
      btnFinish: 'प्रोफाइल बनाएं और आगे बढ़ें',
      welcome: 'स्वागत है, किसान भाई',
      activeTokens: 'आपकी उपज खरीद बुकिंग',
      noBookings: 'कोई सक्रिय खरीद बुकिंग नहीं मिली।',
      btnNewBooking: 'उपज बेचने के लिए स्लॉट बुक करें',
      quickActions: 'त्वरित नेविगेशन',
      actionBook: 'नया स्लॉट बुक करें',
      actionRates: 'फसल का बाजार भाव',
      actionHistory: 'पिछली रसीदें',
      actionProfile: 'मेरी प्रोफाइल',
    },
    te: {
      tag: 'సురక్షితమైన & సరళీకృత వ్యవసాయ కొనుగోలు',
      sub: 'కొనుగోలు కేంద్రానికి ఎప్పుడు రావాలో తెలుసుకోండి. మీ పంట బరువు, నాణ్యత తనిఖీ మరియు చెల్లింపు స్థితిని నిజ సమయములో ట్రాక్ చేయండి.',
      selectLang: 'భాషను ఎంచుకోండి / Choose Language / भाषा चुनें',
      enterPhone: 'మొబైల్ సంఖ్యను నమోదు చేయండి',
      phoneLabel: '10-అంకెల మొబైల్ సంఖ్య',
      phoneSub: 'ఈ మొబైల్ నంబర్ కోసం ధృవీకరణ కోడ్ సిద్ధం చేస్తాము.',
      btnContinue: 'ధృవీకరణ కోడ్‌ను పంపండి',
      verifyOtp: 'ధృవీకరణ కోడ్‌ను నమోదు చేయండి',
      otpLabel: 'ధృవీకరణ కోడ్',
      otpSub: 'ఈ మొబైల్ నంబర్ కోసం ధృవీకరణ కోడ్‌ను నమోదు చేయండి.',
      btnVerify: 'ధృవీకరించండి & ప్రవేశించండి',
      regName: 'మీ ప్రొఫైల్ పూర్తి చేయండి',
      nameLabel: 'రైతు పూర్తి పేరు (ఆధార్/బ్యాంకు ప్రకారం)',
      btnFinish: 'ప్రొఫైల్ సృష్టించి కొనసాగండి',
      welcome: 'స్వాగతం, రైతు సోదరా',
      activeTokens: 'మీ పంట కొనుగోలు బుకింగ్‌లు',
      noBookings: 'ఎటువంటి కొనుగోలు బుకింగ్‌లు లేవు.',
      btnNewBooking: 'కొనుగోలు స్లాట్ బుక్ చేయండి',
      quickActions: 'త్వరిత నావిగేషన్',
      actionBook: 'కొత్త స్లాట్ బుకింగ్',
      actionRates: 'పంటల మద్దతు ధరలు',
      actionHistory: 'మునుపటి రశీదులు',
      actionProfile: 'నా ప్రొఫైల్ వివరాలు',
    }
  };

  const t = text[selectedLang] || text.en;
  const activeBooking = bookings.find(b => b.status !== 'completed');
  const activeBookingId = activeBooking ? activeBooking.id : (bookings[0] ? bookings[0].id : null);

  // LOGGED IN VIEW
  if (user) {
    return (
      <div className="min-h-screen bg-gov-bg pb-24 sm:pb-8">
        <Header user={user} role="farmer" onLogout={handleLogout} />
        <Navbar role="farmer" activeBookingId={activeBookingId} />

        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Welcome Banner */}
          <div className="bg-white rounded-2xl border border-gov-border p-6 shadow-sm mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-gov-green-deep block mb-1">KisanSetu Portal</span>
              <h1 className="text-2xl font-bold text-gov-text-main">{t.welcome}, {user.name}</h1>
              <p className="text-sm text-gov-text-muted mt-0.5">Mobile: +91 {user.phone} · Role: Farmer</p>
            </div>
            
            <a href="/book" className="w-full md:w-auto shrink-0">
              <Button variant="primary" size="lg" className="shadow-sm">
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {t.btnNewBooking}
              </Button>
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left: Bookings list (Span 2) */}
            <div className="md:col-span-2 space-y-4">
              <h2 className="text-lg font-bold text-gov-text-main flex items-center gap-2">
                <svg className="w-5 h-5 text-gov-green-deep" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                {t.activeTokens}
              </h2>

              {bookings.length === 0 ? (
                <Card className="text-center py-10">
                  <svg className="w-12 h-12 text-gov-text-muted mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-gov-text-muted mb-4">{t.noBookings}</p>
                  <a href="/book">
                    <Button variant="secondary" size="md">
                      {t.btnNewBooking}
                    </Button>
                  </a>
                </Card>
              ) : (
                <div className="space-y-3">
                  {bookings.map((b) => {
                    const isCompleted = b.status === 'completed';
                    const displayWeight = b.actual_weight_kg ? (b.actual_weight_kg / 100).toFixed(2) : (b.quantity_kg / 100).toFixed(2);
                    const displayPaymentStatus = b.payment_status === 'completed' ? 'Paid' : b.payment_status === 'processing' ? 'Processing' : 'Pending';

                    return (
                      <Card 
                        key={b.id} 
                        className="cursor-pointer hover:border-gov-green-medium transition-all"
                        onClick={() => router.push(`/status/${b.id}`)}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-bold text-gov-green-deep text-lg">Token #{b.token_no}</span>
                              <span className="text-gov-text-muted text-xs font-semibold">·</span>
                              <span className="font-bold text-gov-text-main text-base">{b.crop}</span>
                            </div>
                            <p className="text-sm text-gov-text-main font-medium">{b.centre_name}</p>
                            <p className="text-xs text-gov-text-muted mt-0.5">
                              Date: {b.booking_date} · Slot: {b.slot_start}
                            </p>
                            
                            {isCompleted ? (
                              <p className="text-xs text-gov-text-muted mt-0.5 font-medium">
                                Procurement Completed · {b.crop} · <span className="font-bold text-gov-text-main">{displayWeight} Quintals</span> · Payment: <span className="font-bold text-gov-green-deep">{displayPaymentStatus}</span>
                              </p>
                            ) : (
                              <p className="text-xs text-gov-text-muted mt-0.5">
                                Estimated quantity: <span className="font-semibold text-gov-text-main">{b.quantity_kg} kg</span>
                              </p>
                            )}

                            {/* Live summary snippet */}
                            {!isCompleted && queues[b.id] && (
                              <div className="mt-2 bg-slate-50 border border-gov-border rounded-lg p-2 text-[11px] text-gov-text-main font-medium inline-block">
                                <span className="text-gov-green-deep font-bold">{queues[b.id].farmersAhead} farmers ahead</span>
                                <span className="mx-1.5 text-gov-text-muted">·</span>
                                <span>ETA: <span className="font-bold text-gov-green-deep">{queues[b.id].etaMinutes} min</span></span>
                              </div>
                            )}
                          </div>
                          <div className="flex sm:flex-col items-start sm:items-end justify-between sm:justify-center gap-2">
                            <StatusBadge status={b.status} />
                            {isCompleted ? (
                              <Button
                                size="xs"
                                variant="secondary"
                                className="mt-1 font-bold text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedBooking(b);
                                  setShowReceipt(true);
                                }}
                              >
                                View Receipt
                              </Button>
                            ) : (
                              <span className="text-xs text-gov-green-deep font-bold hover:underline flex items-center gap-0.5 mt-1">
                                View Live Queue
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                </svg>
                              </span>
                            )}
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right: Quick actions menu */}
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-gov-text-main flex items-center gap-2">
                <svg className="w-5 h-5 text-gov-green-deep" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z" />
                </svg>
                {t.quickActions}
              </h2>

              <div className="grid grid-cols-2 md:grid-cols-1 gap-3">
                <Card 
                  className="p-4 hover:border-gov-green-medium cursor-pointer flex items-center gap-3 active:scale-[0.98] transition-transform"
                  onClick={() => router.push('/book')}
                >
                  <div className="w-10 h-10 rounded-lg bg-gov-green-light flex items-center justify-center text-gov-green-deep shrink-0">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <span className="font-bold text-sm text-gov-text-main">{t.actionBook}</span>
                </Card>

                <Card 
                  className="p-4 hover:border-gov-green-medium flex flex-col gap-3.5 bg-white border-gov-border"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-status-pending shrink-0">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <span className="font-bold text-sm text-gov-text-main">{t.actionRates}</span>
                  </div>
                  
                  <div className="space-y-1.5 text-xs border-t border-slate-100 pt-2.5">
                    <div className="flex justify-between font-semibold">
                      <span className="text-gov-text-muted">Paddy (Grade A)</span>
                      <span className="text-gov-green-deep">₹2,340 / Q</span>
                    </div>
                    <div className="flex justify-between font-semibold">
                      <span className="text-gov-text-muted">Maize</span>
                      <span className="text-gov-green-deep">₹2,150 / Q</span>
                    </div>
                  </div>

                  <Button 
                    size="sm" 
                    variant="secondary" 
                    className="w-full text-xs font-bold mt-1"
                    onClick={() => router.push('/rates')}
                  >
                    View Market Rates
                  </Button>
                </Card>

                <Card 
                  className="p-4 hover:border-gov-green-medium cursor-pointer flex items-center gap-3 active:scale-[0.98] transition-transform"
                  onClick={() => router.push('/history')}
                >
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-status-info shrink-0">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <span className="font-bold text-sm text-gov-text-main">{t.actionHistory}</span>
                </Card>

                <Card 
                  className="p-4 hover:border-gov-green-medium cursor-pointer flex items-center gap-3 active:scale-[0.98] transition-transform"
                  onClick={() => router.push('/profile')}
                >
                  <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-gov-text-muted shrink-0">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <span className="font-bold text-sm text-gov-text-main">{t.actionProfile}</span>
                </Card>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // NOT LOGGED IN VIEW (Simplified, Farmer-friendly entry flow)
  return (
    <main className="min-h-screen bg-gov-bg flex flex-col justify-between">
      {/* Small Header */}
      <div className="bg-white border-b border-gov-border py-4 px-6 flex justify-center items-center shadow-sm">
        <img 
          src="/logo.png" 
          alt="KisanSetu Logo" 
          className="h-14 w-auto object-contain" 
        />
      </div>

      {/* Main card area */}
      <div className="flex-1 flex flex-col justify-center px-4 max-w-md mx-auto w-full py-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-black text-gov-green-deep tracking-tight">{t.tag}</h1>
          <p className="mt-2 text-xs text-gov-text-muted leading-relaxed px-2">
            {t.sub}
          </p>
        </div>

        {/* Dynamic step rendering */}
        <Card className="p-6 border border-gov-border shadow-md">
          {loginStep === 'lang' && (
            <div className="space-y-4">
              <h2 className="text-base font-bold text-gov-text-main text-center pb-2 border-b border-gov-border">
                {t.selectLang}
              </h2>
              
              <div className="flex flex-col gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => selectLanguage('en')}
                  className="w-full text-left font-bold text-sm px-4 py-3.5 border border-gov-border rounded-xl hover:border-gov-green-deep hover:bg-gov-green-light/40 transition-all flex justify-between items-center"
                >
                  English
                  <span className="text-gov-green-deep">&rarr;</span>
                </button>
                
                <button
                  type="button"
                  onClick={() => selectLanguage('hi')}
                  className="w-full text-left font-bold text-sm px-4 py-3.5 border border-gov-border rounded-xl hover:border-gov-green-deep hover:bg-gov-green-light/40 transition-all flex justify-between items-center"
                >
                  हिन्दी (Hindi)
                  <span className="text-gov-green-deep">&rarr;</span>
                </button>

                <button
                  type="button"
                  onClick={() => selectLanguage('te')}
                  className="w-full text-left font-bold text-sm px-4 py-3.5 border border-gov-border rounded-xl hover:border-gov-green-deep hover:bg-gov-green-light/40 transition-all flex justify-between items-center"
                >
                  తెలుగు (Telugu)
                  <span className="text-gov-green-deep">&rarr;</span>
                </button>
              </div>
            </div>
          )}

          {loginStep === 'phone' && (
            <form onSubmit={handlePhoneSubmit} className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-gov-border">
                <h2 className="text-base font-bold text-gov-text-main">{t.enterPhone}</h2>
                <button 
                  type="button" 
                  onClick={() => setLoginStep('lang')} 
                  className="text-xs text-gov-green-deep font-bold"
                >
                  &larr; Back
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gov-text-muted mb-1.5 uppercase tracking-wider">
                  {t.phoneLabel}
                </label>
                <div className="relative flex rounded-lg overflow-hidden border border-gov-border focus-within:ring-2 focus-within:ring-gov-green-deep/20 focus-within:border-gov-green-deep">
                  <span className="bg-slate-100 px-3.5 flex items-center justify-center text-sm font-bold text-gov-text-muted border-r border-gov-border">
                    +91
                  </span>
                  <input
                    type="tel"
                    aria-label="Phone Number"
                    maxLength={10}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter 10 digit number"
                    className="flex-1 rounded-none border-none py-3 px-3.5 focus:ring-0"
                    required
                    autoFocus
                  />
                </div>
                <p className="text-[11px] text-gov-text-muted mt-1.5">{t.phoneSub}</p>
              </div>

              {error && <Alert type="danger">{error}</Alert>}

              <Button type="submit" variant="primary" size="lg" loading={loading}>
                {t.btnContinue}
              </Button>
            </form>
          )}

          {loginStep === 'otp' && (
            <form onSubmit={handleOtpVerify} className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-gov-border">
                <h2 className="text-base font-bold text-gov-text-main">{t.verifyOtp}</h2>
                <button 
                  type="button" 
                  onClick={() => setLoginStep('phone')} 
                  className="text-xs text-gov-green-deep font-bold"
                >
                  &larr; Back
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gov-text-muted mb-1.5 uppercase tracking-wider">
                  {t.otpLabel}
                </label>
                <input
                  type="password"
                  maxLength={10}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter verification code"
                  className="w-full text-center tracking-widest text-lg font-bold py-3.5"
                  required
                  autoFocus
                />
                <p className="text-[11px] text-gov-text-muted mt-1.5">{otpDeliveryMode === 'mock' ? (selectedLang === 'hi' ? 'स्थानीय टेस्ट मोड: कोड देखने के लिए backend terminal देखें।' : selectedLang === 'te' ? 'స్థానిక పరీక్ష మోడ్: కోడ్ కోసం backend terminal చూడండి.' : 'Local test mode: check the backend terminal for your code.') : t.otpSub}</p>
              </div>

              {error && <Alert type="danger">{error}</Alert>}

              <Button type="submit" variant="primary" size="lg" loading={loading}>
                {t.btnVerify}
              </Button>
            </form>
          )}

          {loginStep === 'name_reg' && (
            <form onSubmit={handleNameSubmit} className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-gov-border">
                <h2 className="text-base font-bold text-gov-text-main">{t.regName}</h2>
                <button 
                  type="button" 
                  onClick={() => setLoginStep('phone')} 
                  className="text-xs text-gov-green-deep font-bold"
                >
                  &larr; Restart
                </button>
              </div>

              <div className="rounded-lg bg-gov-green-light/40 border border-gov-green-deep/20 p-3 text-xs text-gov-green-deep font-semibold">
                This mobile number (+91 {phone}) is not registered yet. Please enter your name to create your farmer profile.
              </div>

              <div>
                <label className="block text-xs font-semibold text-gov-text-muted mb-1.5 uppercase tracking-wider">
                  {t.nameLabel}
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full"
                  required
                  autoFocus
                />
              </div>

              {error && <Alert type="danger">{error}</Alert>}

              <Button type="submit" variant="primary" size="lg" loading={loading}>
                {t.btnFinish}
              </Button>
            </form>
          )}
        </Card>

        {/* Switch portal links */}
        <p className="mt-8 text-center text-xs text-gov-text-muted font-medium">
          Centre Staff? <a href="/operator" className="text-gov-green-deep hover:underline font-bold">Operator Dashboard</a>
          <span className="mx-2">&middot;</span>
          District Admin? <a href="/admin" className="text-gov-green-deep hover:underline font-bold">Admin Portal</a>
        </p>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gov-border py-4 px-6 text-center text-[10px] text-gov-text-muted font-semibold">
        KisanSetu Agricultural Procurement Portal &copy; 2026
      </footer>

      {showReceipt && selectedBooking && (
        <DigitalReceipt 
          booking={selectedBooking} 
          onClose={() => {
            setShowReceipt(false);
            setSelectedBooking(null);
          }} 
        />
      )}
    </main>
  );
}
