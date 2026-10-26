'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../../components/Header';
import Navbar from '../../components/Navbar';
import { Card } from '../../components/UI';

const MARKET_RATES = [
  { crop: 'Paddy (Grade A)', rate: 2340, unit: 'Quintal', msp: true, market: 'Mandal Mandi', updated: '30 Aug 2026, 10:30 AM' },
  { crop: 'Paddy (Common)', rate: 2300, unit: 'Quintal', msp: true, market: 'Mandal Mandi', updated: '30 Aug 2026, 10:30 AM' },
  { crop: 'Maize', rate: 2150, unit: 'Quintal', msp: true, market: 'Mandal Mandi', updated: '30 Aug 2026, 10:30 AM' },
  { crop: 'Cotton (Medium Staple)', rate: 7121, unit: 'Quintal', msp: true, market: 'Mandal Mandi', updated: '30 Aug 2026, 10:30 AM' },
  { crop: 'Groundnut', rate: 6780, unit: 'Quintal', msp: true, market: 'Mandal Mandi', updated: '30 Aug 2026, 10:30 AM' },
  { crop: 'Chilli (Dry Red)', rate: 7000, unit: 'Quintal', msp: false, market: 'Mandal Mandi', updated: '30 Aug 2026, 10:30 AM' },
  { crop: 'Sorghum (Jowar)', rate: 3180, unit: 'Quintal', msp: true, market: 'Mandal Mandi', updated: '30 Aug 2026, 10:30 AM' }
];

export default function RatesPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [search, setSearch] = useState('');

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

  function handleLogout() {
    localStorage.removeItem('ks_user');
    router.push('/');
  }

  if (!user) return null;

  const filteredRates = MARKET_RATES.filter(item => 
    item.crop.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gov-bg pb-24 sm:pb-8">
      <Header user={user} role="farmer" onLogout={handleLogout} />
      <Navbar role="farmer" />

      <main className="max-w-xl mx-auto px-4 sm:px-6 py-8">
        <a href="/" className="mb-6 inline-flex items-center gap-1.5 text-sm font-bold text-gov-green-deep hover:underline">
          &larr; Back to Dashboard
        </a>

        <div className="mb-6">
          <span className="text-[10px] uppercase font-bold tracking-wider text-gov-green-deep block mb-1">
            Market Information
          </span>
          <h1 className="text-2xl font-black text-gov-text-main">Market Rates</h1>
          <p className="text-sm text-gov-text-muted mt-0.5">
            Check the latest available rates for your crops.
          </p>
        </div>

        {/* Simple crop search input */}
        <div className="mb-5 relative">
          <input
            type="text"
            placeholder="Search crops... (e.g. Paddy, Maize)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs pr-10"
          />
          <div className="absolute right-3.5 top-3 text-gov-text-muted">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Rates cards list */}
        <div className="space-y-4">
          {filteredRates.length === 0 ? (
            <Card className="text-center py-10">
              <svg className="w-12 h-12 text-gov-text-muted mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-gov-text-muted text-sm font-semibold">
                No market rates are available for this crop.
              </p>
            </Card>
          ) : (
            filteredRates.map((item) => {
              const ratePerKg = (item.rate / 100).toFixed(2);
              
              return (
                <Card key={item.crop} className="bg-white border-gov-border shadow-sm">
                  <div className="flex justify-between items-start gap-4">
                    <div className="space-y-1">
                      <span className={`px-2.5 py-0.5 rounded text-[9px] font-extrabold uppercase border ${
                        item.msp 
                          ? 'bg-gov-green-light border-gov-green-medium/20 text-gov-green-deep' 
                          : 'bg-slate-50 border-slate-200 text-gov-text-muted'
                      }`}>
                        {item.msp ? 'MSP Rate' : 'Market Rate'}
                      </span>
                      
                      <h3 className="font-extrabold text-gov-text-main text-base pt-1">
                        {item.crop}
                      </h3>
                      
                      <div className="pt-1.5 flex items-baseline gap-1.5">
                        <span className="text-2xl font-black text-gov-green-deep">
                          ₹{item.rate.toLocaleString('en-IN')}
                        </span>
                        <span className="text-xs text-gov-text-muted font-bold">
                          / {item.unit}
                        </span>
                      </div>
                      
                      <p className="text-xs text-gov-text-muted font-bold">
                        Secondary: ₹{ratePerKg} / kg
                      </p>

                      <div className="text-[11px] text-gov-text-muted space-y-0.5 pt-2 border-t border-slate-50 mt-2">
                        <div>
                          <span className="font-medium">Market:</span>{' '}
                          <span className="font-bold text-gov-text-main">{item.market || 'Market information unavailable'}</span>
                        </div>
                        <div>
                          <span className="font-medium">Last updated:</span>{' '}
                          <span className="font-semibold">{item.updated}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>

        {/* Prototype disclaimers */}
        <div className="mt-6 p-4 rounded-xl border border-gov-border bg-white text-xs text-gov-text-muted leading-relaxed">
          <p className="font-bold text-gov-text-main mb-1">Disclaimer & Info</p>
          <p className="mb-2">
            Procurement prices are set by the Commission for Agricultural Costs and Prices (CACP) and are valid at all registered procurement purchase centres. Fair Average Quality (FAQ) parameters are strictly checked at the appraisal desk.
          </p>
          <p className="font-semibold text-gov-green-deep border-t border-dashed border-slate-100 pt-2 text-[10px]">
            Market-rate figures shown here are indicative demonstration data and may differ from current official rates.
          </p>
        </div>
      </main>
    </div>
  );
}
