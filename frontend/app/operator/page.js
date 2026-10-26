'use client';
import { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/api';
import Header from '../../components/Header';
import Navbar from '../../components/Navbar';
import { Card, Button, StatusBadge, Alert } from '../../components/UI';

export default function OperatorPage() {
  const [operator, setOperator] = useState(null);
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [tokenInput, setTokenInput] = useState('');
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('ks_user');
    if (stored) {
      let parsedUser;
      try { parsedUser = JSON.parse(stored); } catch { localStorage.removeItem('ks_user'); return; }
      if (parsedUser.role !== 'operator') {
        window.location.href = parsedUser.role === 'admin' ? '/admin' : '/';
        return;
      }
      setOperator(parsedUser);
    }
  }, []);

  const refresh = useCallback(async () => {
    if (!operator) return;
    try {
      const d = await api.getDashboard(operator.centre_id);
      setDashboard({ ...d, centres: d.centres || (d.centre ? [d.centre] : []), counts: d.counts || { booked: 0, arrived: 0, processing: 0, completed: 0 }, bookings: d.bookings || [] });
      setDashboardError('');
    } catch (err) { setDashboardError(err.message || 'Could not load operator dashboard.'); }
  }, [operator]);

  useEffect(() => {
    refresh();
    const i = setInterval(refresh, 4000); // 4 seconds live refresh
    return () => clearInterval(i);
  }, [refresh]);

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { user } = await api.login({ phone, role: 'operator' });
      if (user.role !== 'operator' && user.role !== 'manager' && user.role !== 'admin') {
        throw new Error('This phone number is not registered as centre staff.');
      }
      localStorage.setItem('ks_user', JSON.stringify(user));
      localStorage.setItem('ks_auth_method', 'staff-demo');
      setOperator(user);
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
    setOperator(null);
    setDashboard(null);
  }

  async function handleVerify(e) {
    e.preventDefault();
    if (!tokenInput.trim()) return;
    
    setError('');
    setLoading(true);
    try {
      const cleanToken = tokenInput.trim().replace('#', '').replace('KISANSETU-BOOKING-', '');
      const { booking } = await api.getBooking(cleanToken);
      window.location.href = `/operator/procurement/${booking.id}`;
    } catch (err) {
      setError('No booking found for that token / booking ID.');
    } finally {
      setLoading(false);
    }
  }

  // LOGIN SCREEN
  if (!operator) {
    return (
      <main className="min-h-screen bg-gov-bg flex flex-col justify-between">
        {/* Top Header branding */}
        <div className="bg-white border-b border-gov-border py-4 px-6 flex justify-between items-center shadow-sm">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="KisanSetu Logo" className="h-14 w-auto object-contain" />
          </div>
          <span className="bg-blue-50 border border-status-info/20 text-status-info text-[10px] font-bold px-2 py-0.5 rounded tracking-wide">
            STAFF / OPERATOR PORTAL
          </span>
        </div>

        {/* Form Container */}
        <div className="flex-1 flex flex-col justify-center px-4 max-w-md mx-auto w-full py-8">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-black text-gov-text-main">Centre Operator Sign In</h1>
            <p className="mt-2 text-xs text-gov-text-muted leading-relaxed">
              Access the procurement scale interface to verify arrivals, weigh crop harvest bags, and appraise quality parameters.
            </p>
          </div>

          <Card className="p-6 shadow-md border-gov-border">
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gov-text-muted mb-1.5 uppercase tracking-wider">
                  Staff Phone Number
                </label>
                <input
                  type="tel"
                  aria-label="Operator Phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter registered mobile (e.g. 9000000001)"
                  required
                  autoFocus
                />
              </div>

              {error && <Alert type="danger">{error}</Alert>}

              <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full">
                Verify Credentials
              </Button>
            </form>
          </Card>

          <p className="mt-6 text-center text-xs text-gov-text-muted">
            Demo staff account phone: <span className="font-bold text-gov-text-main">9000000001</span>
          </p>
        </div>

        {/* Footer */}
        <footer className="bg-white border-t border-gov-border py-4 px-6 text-center text-[10px] text-gov-text-muted font-semibold">
          KisanSetu Agricultural Procurement Portal &copy; 2026
        </footer>
      </main>
    );
  }

  // OPERATOR DASHBOARD
  return (
    <div className="min-h-screen bg-gov-bg pb-12">
      <Header user={operator} role="operator" onLogout={handleLogout} />
      <Navbar role="operator" />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Welcome Section */}
        <div className="bg-white rounded-2xl border border-gov-border p-6 shadow-sm mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-gov-green-deep block mb-1">Procurement Scale Panel</span>
            <h1 className="text-xl font-bold text-gov-text-main">Centre: {operator.centre_name || 'Assigned Mandal Centre'}</h1>
            <p className="text-xs text-gov-text-muted mt-0.5">Operator: +91 {operator.phone} · Scale Terminal Active</p>
          </div>
          {dashboard && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gov-text-muted">Centre Status:</span>
              <StatusBadge status={dashboard.centres?.find(c => c.id === operator.centre_id)?.status || 'open'} />
            </div>
          )}
        </div>

        {/* Stats Grid */}
        {dashboard && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              ['Today\'s Bookings', dashboard.counts.booked, 'bg-gov-green-light/40 border-gov-green-deep/10 text-gov-green-deep'],
              ['Arrived at Scale', dashboard.counts.arrived, 'bg-blue-50 border-status-info/10 text-status-info'],
              ['Being Checked', dashboard.counts.processing, 'bg-amber-50 border-status-pending/10 text-status-pending'],
              ['Completed today', dashboard.counts.completed, 'bg-green-50 border-status-success/10 text-status-success'],
            ].map(([label, val, style]) => (
              <Card key={label} className={`p-4 text-center border shadow-sm ${style}`}>
                <p className="text-3xl font-black tracking-tight">{val}</p>
                <p className="text-xs font-bold uppercase tracking-wide opacity-80 mt-1">{label}</p>
              </Card>
            ))}
          </div>
        )}

        {/* Scan / Verification form */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Main Action: Token Verification (Span 2) */}
          <div className="md:col-span-2 space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gov-text-muted flex items-center gap-1.5">
              <svg className="w-4 h-4 text-gov-green-deep" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
              Verify Farmer Token
            </h2>

            <Card className="shadow-sm border-gov-border">
              <form onSubmit={handleVerify} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gov-text-muted mb-1.5 uppercase tracking-wider">
                    Scan Ticket QR or Enter Token Number
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={tokenInput}
                      onChange={(e) => setTokenInput(e.target.value)}
                      placeholder="Enter Token No. (e.g. 101)"
                      className="flex-1 font-bold"
                      required
                    />
                    <Button type="submit" variant="primary" size="md" loading={loading}>
                      Verify Token
                    </Button>
                  </div>
                </div>

                {error && <Alert type="danger">{error}</Alert>}
              </form>
            </Card>

            <Alert type="info">
              <span className="font-bold">Booking verification:</span> Use the booking identifier or reference number to open a procurement record.
            </Alert>
          </div>

          {/* Right: Desk Parameters */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gov-text-muted flex items-center gap-1.5">
              <svg className="w-4 h-4 text-gov-green-deep" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              Terminal Parameters
            </h2>

            <Card className="shadow-sm border-gov-border text-sm space-y-3">
              <div className="flex justify-between">
                <span className="text-gov-text-muted">Connected Scale:</span>
                <span className="font-bold text-status-success">Online · COM3</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gov-text-muted">Terminal ID:</span>
                <span className="font-mono text-xs font-bold text-gov-text-main">TRM-0921-A</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gov-text-muted">Appraised Crop:</span>
                <span className="font-semibold text-gov-text-main">Paddy / Maize</span>
              </div>
              <div className="h-px bg-gov-border" />
              <div className="flex justify-between text-xs">
                <span className="text-gov-text-muted">Last calibrated:</span>
                <span className="text-gov-text-main font-semibold">Today, 08:00 AM</span>
              </div>
            </Card>
          </div>
        </div>

        {/* Today's Bookings / Queue */}
        <div className="mt-8">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gov-text-muted mb-4 flex items-center gap-1.5">
            <svg className="w-4 h-4 text-gov-green-deep" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Today's Scheduled Farmers
          </h2>

          {!dashboard?.bookings || dashboard.bookings.length === 0 ? (
            <Card className="p-8 text-center shadow-sm border-gov-border">
              <p className="text-gov-text-muted font-bold text-sm">No bookings scheduled for today at this centre.</p>
            </Card>
          ) : (
            <>
              {/* Desktop View: Table */}
              <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gov-border overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 border-b border-gov-border">
                    <tr>
                      <th className="py-3 px-4 font-bold text-gov-text-muted">Token</th>
                      <th className="py-3 px-4 font-bold text-gov-text-muted">Farmer</th>
                      <th className="py-3 px-4 font-bold text-gov-text-muted">Crop / Est.</th>
                      <th className="py-3 px-4 font-bold text-gov-text-muted">Time Slot</th>
                      <th className="py-3 px-4 font-bold text-gov-text-muted">Status</th>
                      <th className="py-3 px-4 font-bold text-gov-text-muted text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gov-border">
                    {dashboard.bookings.map(b => (
                      <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 font-black text-gov-text-main">#{b.token_no}</td>
                        <td className="py-3 px-4 font-bold">{b.farmer_name}</td>
                        <td className="py-3 px-4 text-xs">
                          <span className="font-bold text-gov-green-deep">{b.crop}</span><br/>
                          <span className="text-gov-text-muted">{b.quantity_kg} kg</span>
                        </td>
                        <td className="py-3 px-4 font-mono text-xs">{b.slot_start} - {b.slot_end}</td>
                        <td className="py-3 px-4"><StatusBadge status={b.status} /></td>
                        <td className="py-3 px-4 text-right">
                          <Button size="sm" variant="secondary" onClick={() => window.location.href = `/operator/procurement/${b.id}`}>
                            {b.status === 'completed' ? 'View' : 'Process'}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile View: Cards */}
              <div className="md:hidden space-y-3">
                {dashboard.bookings.map(b => (
                  <Card key={b.id} className="p-4 shadow-sm border-gov-border">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-black text-gov-text-main text-lg">#{b.token_no}</span>
                      <StatusBadge status={b.status} />
                    </div>
                    <div className="text-sm space-y-1 mb-3">
                      <p className="font-bold">{b.farmer_name} <span className="font-normal text-gov-text-muted">· {b.crop}</span></p>
                      <p className="text-xs text-gov-text-muted font-mono">{b.slot_start} - {b.slot_end}</p>
                    </div>
                    <Button size="sm" variant="secondary" className="w-full text-xs font-bold" onClick={() => window.location.href = `/operator/procurement/${b.id}`}>
                      {b.status === 'completed' ? 'View Details' : 'Verify & Process'}
                    </Button>
                  </Card>
                ))}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
