'use client';
import { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/api';
import Header from '../../components/Header';
import Navbar from '../../components/Navbar';
import { Card, Button, StatusBadge, Alert } from '../../components/UI';

export default function AdminPage() {
  const [admin, setAdmin] = useState(null);
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [dashboard, setDashboard] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSync, setLastSync] = useState('');
  const [dashboardError, setDashboardError] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('ks_user');
    if (stored) {
      let parsedAdmin;
      try { parsedAdmin = JSON.parse(stored); } catch { localStorage.removeItem('ks_user'); return; }
      if (parsedAdmin.role !== 'admin') {
        window.location.href = parsedAdmin.role === 'operator' ? '/operator' : '/';
        return;
      }
      setAdmin(parsedAdmin);
    }
  }, []);

  const refresh = useCallback(async () => {
    if (!admin) return;
    setIsRefreshing(true);
    try {
      const [d, a] = await Promise.all([
        api.getDashboard(), 
        api.getAnalytics(null, 7)
      ]);
      setDashboard({ ...d, counts: d.counts || d.totals || { booked: 0, arrived: 0, processing: 0, completed: 0 }, bookings: d.bookings || [], centres: d.centres || [] });
      setAnalytics(a);
      setDashboardError('');
      setLastSync(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (err) { setDashboardError(err.message || 'Could not load admin dashboard.'); } finally {
      setIsRefreshing(false);
    }
  }, [admin]);

  useEffect(() => {
    refresh();
    const i = setInterval(refresh, 6000); // 6 seconds live poll
    return () => clearInterval(i);
  }, [refresh]);

  const activeQueueStates = ['booked', 'arrived', 'weighing', 'quality_check'];
  function getCentreQueue(centreId) {
    if (!dashboard?.bookings) return 0;
    return dashboard.bookings.filter(b => String(b.centre_id) === String(centreId) && activeQueueStates.includes(b.status)).length;
  }

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { user } = await api.login({ phone, role: 'admin' });
      if (user.role !== 'admin') {
        throw new Error('This phone number is not registered as an administrator.');
      }
      localStorage.setItem('ks_user', JSON.stringify(user));
      localStorage.setItem('ks_auth_method', 'staff-demo');
      setAdmin(user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem('ks_admin');
    localStorage.removeItem('ks_user');
    localStorage.removeItem('ks_auth_method');
    setAdmin(null);
    setDashboard(null);
    setAnalytics(null);
  }

  // ADMIN LOGIN SCREEN
  if (!admin) {
    return (
      <main className="min-h-screen bg-gov-bg flex flex-col justify-between">
        {/* Top Header branding */}
        <div className="bg-white border-b border-gov-border py-4 px-6 flex justify-between items-center shadow-sm">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="KisanSetu Logo" className="h-14 w-auto object-contain" />
          </div>
          <span className="bg-slate-100 border border-gov-border text-gov-text-main text-[10px] font-bold px-2 py-0.5 rounded tracking-wide">
            DISTRICT ADMIN PORTAL
          </span>
        </div>

        {/* Form Container */}
        <div className="flex-1 flex flex-col justify-center px-4 max-w-md mx-auto w-full py-8">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-black text-gov-text-main">District Admin Sign In</h1>
            <p className="mt-2 text-xs text-gov-text-muted leading-relaxed">
              Access the district-wide agricultural procurement overview, center analytics, active counter tallies, and wait-time statistics.
            </p>
          </div>

          <Card className="p-6 shadow-md border-gov-border">
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gov-text-muted mb-1.5 uppercase tracking-wider">
                  Administrator Phone
                </label>
                <input
                  type="tel"
                  aria-label="Administrator Phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter administrator mobile (e.g. 9000000000)"
                  required
                  autoFocus
                />
              </div>

              {error && <Alert type="danger">{error}</Alert>}

              <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full">
                Verify Administrator Credentials
              </Button>
            </form>
          </Card>

          <p className="mt-6 text-center text-xs text-gov-text-muted">
            Demo administrator phone: <span className="font-bold text-gov-text-main">9000000000</span>
          </p>
        </div>

        {/* Footer */}
        <footer className="bg-white border-t border-gov-border py-4 px-6 text-center text-[10px] text-gov-text-muted font-semibold">
          KisanSetu Agricultural Procurement Portal &copy; 2026
        </footer>
      </main>
    );
  }

  const maxFarmers = analytics?.daily?.length > 0 
    ? Math.max(...analytics.daily.map((d) => d.farmers), 1) 
    : 1;

  // ADMIN DASHBOARD
  return (
    <div className="min-h-screen bg-gov-bg pb-12">
      <Header user={admin} role="admin" onLogout={handleLogout} />
      <Navbar role="admin" />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {dashboardError && <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{dashboardError}</div>}
        
        {/* Title */}
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-gov-green-deep block mb-1">District Administration panel</span>
            <h1 className="text-2xl font-black text-gov-text-main">District Overview & Analytics</h1>
          </div>
          <div className="flex flex-col items-end">
            <button 
              onClick={refresh}
              disabled={isRefreshing}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gov-border bg-white text-xs font-bold text-gov-text-muted transition-all ${isRefreshing ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gov-bg hover:text-gov-text-main active:scale-[0.98]'}`}
            >
              <svg className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-gov-green-deep' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89H18" />
              </svg>
              {isRefreshing ? 'Syncing...' : 'Live Sync'}
            </button>
            {lastSync && <span className="text-[9px] text-gov-text-muted mt-1 mr-1">Last updated: {lastSync}</span>}
          </div>
        </div>

        {/* Counts summary grid */}
        {dashboard && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              ['Booked Today', (dashboard.counts || dashboard.totals || {}).booked ?? 0, 'border-gov-border text-gov-text-main'],
              ['Arrived at Scales', (dashboard.counts || dashboard.totals || {}).arrived ?? 0, 'border-gov-border text-status-info'],
              ['In Quality Appraisal', (dashboard.counts || dashboard.totals || {}).processing ?? 0, 'border-gov-border text-status-pending'],
              ['Procurements Locked', (dashboard.counts || dashboard.totals || {}).completed ?? 0, 'border-gov-border text-status-success'],
            ].map(([label, val, style]) => (
              <Card key={label} className={`p-4 text-center border shadow-sm ${style}`}>
                <p className="text-3xl font-black tracking-tight">{val}</p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gov-text-muted mt-1">{label}</p>
              </Card>
            ))}
          </div>
        )}

        {/* Main Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left: Centre Statuses (Span 2) */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gov-text-muted flex items-center gap-1.5">
              <svg className="w-4 h-4 text-gov-green-deep" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              Active Procurement Centres
            </h2>

            <div className="hidden md:block overflow-hidden border border-gov-border rounded-xl bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gov-border text-sm">
                  <thead className="bg-gov-bg">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gov-text-muted uppercase tracking-wider">Centre</th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-gov-text-muted uppercase tracking-wider">Counters</th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-gov-text-muted uppercase tracking-wider">Queue Load</th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-gov-text-muted uppercase tracking-wider">Avg Process</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-gov-text-muted uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gov-border">
                    {dashboard?.centres?.map((c) => {
                      const qLoad = getCentreQueue(c.id);
                      const isHighQueue = qLoad > (c.active_counters * 3);
                      const isBusyStatus = !isHighQueue && (c.status === 'busy' || c.status === 'delayed');
                      const isBottleneck = isHighQueue || isBusyStatus;
                      
                      return (
                        <tr key={c.id} className={`hover:bg-slate-50/50 transition-colors ${isBottleneck ? 'bg-orange-50/30' : ''}`}>
                          <td className="px-4 py-3">
                            <span className="font-bold text-gov-text-main flex items-center gap-2">
                              {c.name}
                              {isBottleneck && <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${isHighQueue ? 'bg-orange-100 text-orange-700 border-orange-200' : 'bg-amber-100 text-amber-700 border-amber-200'}`}>{isHighQueue ? 'High Queue Load' : 'Busy Status'}</span>}
                            </span>
                            <span className="text-xs text-gov-text-muted">{c.location}</span>
                          </td>
                          <td className="px-4 py-3 text-center font-semibold text-gov-text-main">
                            {c.active_counters}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`font-bold ${isBottleneck ? 'text-orange-600' : 'text-gov-text-main'}`}>
                              {qLoad} Waiting
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center font-bold text-gov-green-deep">
                            {Math.round(c.avg_process_secs / 60)} mins
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            <StatusBadge status={c.status} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile View: Stacked Centre Cards */}
            <div className="md:hidden space-y-4">
              {dashboard?.centres?.map((c) => {
                const qLoad = getCentreQueue(c.id);
                const isHighQueue = qLoad > (c.active_counters * 3);
                const isBusyStatus = !isHighQueue && (c.status === 'busy' || c.status === 'delayed');
                const isBottleneck = isHighQueue || isBusyStatus;

                return (
                  <Card key={c.id} className={`p-4 shadow-sm border-gov-border ${isBottleneck ? 'border-l-4 border-l-orange-400 bg-orange-50/30' : ''}`}>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="font-bold text-gov-text-main block">{c.name}</span>
                        <span className="text-xs text-gov-text-muted">{c.location}</span>
                      </div>
                      <StatusBadge status={c.status} />
                    </div>
                    
                    {isBottleneck && (
                      <div className={`mb-3 inline-block px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${isHighQueue ? 'bg-orange-100 text-orange-700 border-orange-200' : 'bg-amber-100 text-amber-700 border-amber-200'}`}>
                        {isHighQueue ? 'High Queue Load Warning' : 'Busy Status Warning'}
                      </div>
                    )}
                    
                    <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-100 text-center">
                      <div>
                        <p className="text-[10px] uppercase font-bold text-gov-text-muted">Counters</p>
                        <p className="font-bold text-gov-text-main text-sm">{c.active_counters}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-bold text-gov-text-muted">Queue</p>
                        <p className={`font-bold text-sm ${isBottleneck ? 'text-orange-600' : 'text-gov-text-main'}`}>{qLoad}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-bold text-gov-text-muted">Process</p>
                        <p className="font-bold text-gov-green-deep text-sm">{Math.round(c.avg_process_secs / 60)}m</p>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Right: Wait Times & 7 Day Chart */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gov-text-muted flex items-center gap-1.5">
              <svg className="w-4 h-4 text-gov-green-deep" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              District Wait Metrics
            </h2>

            {/* Average wait card */}
            {analytics && (
              <Card className="p-4 border-gov-border shadow-sm text-center">
                <p className="text-4xl font-black text-gov-green-deep">{Math.round((analytics.avgWaitSecs || 0) / 60)} min</p>
                <p className="text-xs font-bold text-gov-text-muted mt-1 uppercase tracking-wider">Average District Wait Time</p>
                <p className="text-[10px] text-gov-text-muted mt-1 leading-normal italic">
                  * Computed live from ticket scale verify-in to transaction locking timestamp.
                </p>
              </Card>
            )}

            <Card className="p-5 shadow-sm border-gov-border">
              <span className="text-[10px] font-bold text-gov-text-muted uppercase tracking-wider block mb-4">
                7-Day Processing Volume
              </span>

              {/* Simple Responsive CSS Bar Chart */}
              <div className="flex items-end justify-between gap-2 h-28 pt-2">
                {analytics?.daily?.map((d) => (
                  <div key={d.booking_date} className="flex flex-col items-center flex-1 gap-1">
                    <div className="flex w-full items-end justify-center gap-0.5 h-20">
                      {/* Booked bar (grey) */}
                      <div 
                        className="w-2.5 rounded-t bg-slate-200" 
                        style={{ height: `${(d.farmers / maxFarmers) * 100}%` }} 
                        title={`Booked: ${d.farmers}`} 
                      />
                      {/* Completed bar (green) */}
                      <div 
                        className="w-2.5 rounded-t bg-gov-green-medium" 
                        style={{ height: `${(d.completed / maxFarmers) * 100}%` }} 
                        title={`Completed: ${d.completed}`} 
                      />
                    </div>
                    <span className="text-[9px] text-gov-text-muted font-bold block pt-1">
                      {d.booking_date.slice(8)}/{d.booking_date.slice(5, 7)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Chart Legend */}
              <div className="flex items-center justify-center gap-4 mt-5 text-[10px] text-gov-text-muted border-t border-slate-100 pt-3">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-sm bg-slate-200" />
                  <span>Booked Tokens</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-sm bg-gov-green-medium" />
                  <span>Completed DBT</span>
                </div>
              </div>
            </Card>
          </div>
        </div>

      </main>
    </div>
  );
}
