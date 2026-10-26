'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../../components/Header';
import Navbar from '../../components/Navbar';
import { Card, Button, Alert } from '../../components/UI';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);

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

  return (
    <div className="min-h-screen bg-gov-bg pb-24 sm:pb-8">
      <Header user={user} role="farmer" onLogout={handleLogout} />
      <Navbar role="farmer" />

      <main className="max-w-xl mx-auto px-4 sm:px-6 py-8">
        <a href="/" className="mb-6 inline-flex items-center gap-1.5 text-sm font-bold text-gov-green-deep hover:underline">
          &larr; Back to Dashboard
        </a>

        <div className="mb-6">
          <span className="text-[10px] uppercase font-bold tracking-wider text-gov-green-deep block mb-1">Account & Settings</span>
          <h1 className="text-2xl font-black text-gov-text-main">My Profile Details</h1>
          <p className="text-sm text-gov-text-muted mt-0.5">Manage your personal information, Aadhaar linkage, and bank account settings.</p>
        </div>

        <div className="space-y-4">
          <Card className="bg-white border-gov-border shadow-sm">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gov-text-muted border-b border-gov-border pb-2.5 mb-3.5">
              Personal Credentials
            </h3>
            
            <div className="space-y-3.5 text-sm">
              <div className="flex justify-between items-center py-1">
                <span className="text-gov-text-muted">Farmer Full Name</span>
                <span className="font-bold text-gov-text-main text-right">{user.name}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-gov-text-muted">Registered Mobile</span>
                <span className="font-bold text-gov-text-main text-right">+91 {user.phone}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-gov-text-muted">User ID Reference</span>
                <span className="font-mono text-xs text-gov-text-main bg-slate-50 border border-gov-border px-2 py-0.5 rounded text-right truncate">
                  FMR-{user.id.slice(0, 8).toUpperCase()}
                </span>
              </div>
            </div>
          </Card>

          <Card className="bg-white border-gov-border shadow-sm">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gov-text-muted border-b border-gov-border pb-2.5 mb-3.5">
              Direct Benefit Transfer (DBT) Status
            </h3>

            <div className="space-y-3">
              <div className="flex items-center gap-3 bg-gov-green-light/40 border border-gov-green-deep/20 rounded-xl p-3.5">
                <div className="w-9 h-9 rounded-full bg-gov-green-deep text-white flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div>
                  <span className="font-bold text-gov-green-deep text-sm block">Aadhaar Linked Successfully</span>
                  <span className="text-[11px] text-gov-text-muted">Direct payment transfer is active. Funds will credit directly to primary bank account.</span>
                </div>
              </div>

              <div className="h-px bg-slate-100 my-2" />

              <div className="grid grid-cols-2 gap-y-2 text-sm">
                <div className="text-gov-text-muted">Aadhaar Number</div>
                <div className="font-semibold text-gov-text-main text-right">xxxx-xxxx-4982</div>
                
                <div className="text-gov-text-muted">Linked Bank</div>
                <div className="font-bold text-gov-text-main text-right">State Bank of India</div>
                
                <div className="text-gov-text-muted">Account Number</div>
                <div className="font-mono text-gov-text-main text-right">xxxx-xxxx-1209</div>
              </div>
            </div>
          </Card>

          <Button 
            variant="outline" 
            size="lg" 
            onClick={handleLogout}
            className="w-full text-status-error border-red-200 hover:bg-red-50"
          >
            Sign Out of Account
          </Button>
        </div>
      </main>
    </div>
  );
}
