'use client';
import React from 'react';
import DemoBadge from './DemoBadge';

export default function Header({ user, role = 'farmer', onLogout }) {
  const isFarmer = role === 'farmer';
  const isOperator = role === 'operator';
  const isAdmin = role === 'admin';

  return (
    <header className="w-full bg-white border-b border-gov-border sticky top-0 z-30 shadow-sm">
      {/* Top Bar with Demo Indicator and Language switcher */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-1.5 flex items-center justify-between border-b border-gov-border text-xs text-gov-text-muted bg-gov-bg">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-gov-green-deep animate-pulse" />
          <span>KisanSetu • Agricultural Procurement Portal</span>
          <DemoBadge />
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 11.37 7.31 16.5 3 19" />
            </svg>
            <select 
              defaultValue="en" 
              className="bg-transparent border-none text-xs text-gov-text-muted focus:ring-0 p-0 cursor-pointer font-medium hover:text-gov-green-deep"
              onChange={(e) => {
                if (typeof window !== 'undefined') {
                  localStorage.setItem('ks_lang', e.target.value);
                  window.dispatchEvent(new Event('languageChange'));
                }
              }}
            >
              <option value="en">English</option>
              <option value="hi">हिन्दी (Hindi)</option>
              <option value="te">తెలుగు (Telugu)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Header Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
        {/* Brand Logo & Name */}
        <a href={isFarmer ? "/" : isOperator ? "/operator" : "/admin"} className="flex items-center gap-3 active:opacity-90">
          <img 
            src="/logo.png" 
            alt="KisanSetu Logo" 
            className="h-16 w-auto object-contain shrink-0" 
            style={{ maxHeight: '64px' }}
          />
          <div className="hidden sm:block border-l border-gov-border pl-3">
            <span className="text-[10px] uppercase font-bold tracking-wider text-gov-green-deep block leading-tight">AGRICULTURAL PROCUREMENT PORTAL</span>
            <span className="text-xs text-gov-text-muted">KisanSetu • Agricultural Procurement Portal</span>
          </div>
        </a>

        {/* User Actions & Role Indicator */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden md:block">
            {user ? (
              <>
                <p className="text-xs text-gov-text-muted font-medium">Signed in as</p>
                <p className="text-sm font-semibold text-gov-text-main">{user.name || user.phone}</p>
              </>
            ) : (
              <span className="text-xs text-gov-text-muted">Not logged in</span>
            )}
          </div>

          {/* Role badge */}
          <span className={`px-2.5 py-1 rounded text-xs font-bold shrink-0 ${
            isFarmer 
              ? 'bg-gov-green-light text-gov-green-deep border border-gov-green-deep/20' 
              : isOperator 
              ? 'bg-blue-50 text-status-info border border-status-info/20' 
              : 'bg-slate-100 text-gov-text-main border border-gov-border'
          }`}>
            {isFarmer ? 'FARMER' : isOperator ? 'STAFF / OPERATOR' : 'ADMIN'}
          </span>

          {user && (
            <button
              onClick={onLogout}
              className="p-2 rounded-lg text-gov-text-muted hover:text-status-error hover:bg-red-50 transition-colors focus-visible:ring-2 focus-visible:ring-status-error shrink-0"
              title="Logout"
              aria-label="Logout"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
