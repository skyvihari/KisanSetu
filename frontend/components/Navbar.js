'use client';
import React from 'react';
import { useRouter, usePathname } from 'next/navigation';

export default function Navbar({ role = 'farmer', activeBookingId = null }) {
  const pathname = usePathname();
  const router = useRouter();

  const isFarmer = role === 'farmer';

  if (!isFarmer) {
    // Staff/Admin top nav bar (simple, clean tabs)
    const staffTabs = role === 'operator' 
      ? [
          { name: 'Dashboard', path: '/operator' },
        ]
      : [
          { name: 'Dashboard', path: '/admin' },
        ];

    return (
      <nav className="w-full bg-white border-b border-gov-border hidden md:block">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {staffTabs.map((tab) => {
              const active = pathname === tab.path;
              return (
                <button
                  key={tab.name}
                  onClick={() => router.push(tab.path)}
                  className={`inline-flex items-center px-1 pt-4 pb-3 border-b-2 text-sm font-semibold transition-colors duration-150 ${
                    active
                      ? 'border-gov-green-deep text-gov-green-deep'
                      : 'border-transparent text-gov-text-muted hover:text-gov-text-main hover:border-gov-border'
                  }`}
                >
                  {tab.name}
                </button>
              );
            })}
          </div>
        </div>
      </nav>
    );
  }

  // Farmer tabs (Home, Book Slot, Live Queue, Market Rates, History, Profile)
  const farmerTabs = [
    {
      name: 'Home',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11V11a2 2 0 01-2 2H5" />
        </svg>
      ),
      path: '/',
    },
    {
      name: 'Book Slot',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      path: '/book',
    },
    {
      name: 'Live Tracker',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      path: activeBookingId ? `/status/${activeBookingId}` : '#tracker',
      disabled: !activeBookingId,
    },
    {
      name: 'Market Rates',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      path: '/rates',
    },
    {
      name: 'History',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
      path: '/history',
    },
    {
      name: 'Profile',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      path: '/profile',
    },
  ];

  return (
    <>
      {/* Mobile Bottom Navigation (PWA-style layout, sticky bottom) */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gov-border z-40 flex justify-around items-center py-2 px-1 shadow-lg">
        {farmerTabs.map((tab) => {
          const isActive = pathname === tab.path || (tab.path !== '/' && tab.path !== '#tracker' && pathname.startsWith(tab.path));
          const isDisabled = tab.disabled;

          return (
            <button
              key={tab.name}
              disabled={isDisabled}
              onClick={() => {
                if (tab.path === '#tracker') {
                  alert('You do not have any active booking to track. Please book a slot first.');
                } else {
                  router.push(tab.path);
                }
              }}
              className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-lg transition-colors relative ${
                isDisabled 
                  ? 'opacity-40 cursor-not-allowed text-gov-text-muted' 
                  : isActive
                  ? 'text-gov-green-deep font-semibold'
                  : 'text-gov-text-muted hover:text-gov-text-main'
              }`}
            >
              {tab.icon}
              <span className="text-[10px] mt-1 tracking-tight text-center">{tab.name}</span>
              {isActive && (
                <span className="absolute top-0 w-8 h-0.5 bg-gov-green-deep rounded-full" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Desktop Top Navigation Bar (Shown on large screens) */}
      <nav className="hidden sm:block w-full bg-white border-b border-gov-border sticky top-[69px] z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-6 py-1">
            {farmerTabs.map((tab) => {
              const isActive = pathname === tab.path || (tab.path !== '/' && tab.path !== '#tracker' && pathname.startsWith(tab.path));
              const isDisabled = tab.disabled;

              return (
                <button
                  key={tab.name}
                  disabled={isDisabled}
                  onClick={() => {
                    if (tab.path === '#tracker') {
                      alert('You do not have any active booking to track. Please book a slot first.');
                    } else {
                      router.push(tab.path);
                    }
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-3 text-sm font-semibold border-b-2 transition-all duration-150 ${
                    isDisabled
                      ? 'opacity-40 cursor-not-allowed border-transparent text-gov-text-muted'
                      : isActive
                      ? 'border-gov-green-deep text-gov-green-deep'
                      : 'border-transparent text-gov-text-muted hover:text-gov-text-main hover:border-gov-border'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>
    </>
  );
}
