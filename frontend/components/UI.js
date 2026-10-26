import React from 'react';

/**
 * Clean accessible Card component
 */
export function Card({ children, className = '', ...props }) {
  return (
    <div
      className={`bg-white rounded-xl border border-gov-border shadow-sm p-5 hover:shadow-md transition-shadow duration-200 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * Standard accessible Button component with loading and disabled states
 */
export function Button({
  children,
  onClick,
  type = 'button',
  variant = 'primary', // primary, secondary, danger, outline
  size = 'md',        // lg, md, sm
  disabled = false,
  loading = false,
  className = '',
  ...props
}) {
  const baseStyle = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 active:scale-[0.98] disabled:opacity-60 disabled:pointer-events-none focus-visible:ring-2 focus-visible:ring-offset-2';
  
  const variants = {
    primary: 'bg-gov-green-deep hover:bg-gov-green-medium text-white focus-visible:ring-gov-green-deep',
    secondary: 'bg-gov-green-light hover:bg-green-200 text-gov-green-deep focus-visible:ring-gov-green-medium',
    danger: 'bg-status-error hover:bg-red-700 text-white focus-visible:ring-status-error',
    outline: 'border border-gov-border hover:bg-gov-bg text-gov-text-main focus-visible:ring-gov-green-deep',
  };

  const sizes = {
    lg: 'px-6 py-4 text-base w-full',
    md: 'px-4 py-3 text-sm',
    sm: 'px-3 py-1.5 text-xs',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <svg className="animate-spin h-4 w-4 text-current" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Loading...
        </span>
      ) : children}
    </button>
  );
}

/**
 * StatusBadge matching government service design states
 */
export function StatusBadge({ status, className = '' }) {
  const styles = {
    // Farmer statuses
    booked: 'bg-gov-green-light text-gov-green-deep border-gov-green-medium/20',
    arrived: 'bg-blue-50 text-status-info border-status-info/20',
    weighing: 'bg-amber-50 text-status-pending border-status-pending/20',
    quality_check: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    completed: 'bg-green-50 text-status-success border-status-success/20',
    accepted: 'bg-green-50 text-status-success border-status-success/20',
    rejected: 'bg-red-50 text-status-error border-status-error/20',
    
    // Centre statuses
    open: 'bg-green-50 text-status-success border-status-success/20',
    busy: 'bg-amber-50 text-status-pending border-status-pending/20',
    closed: 'bg-red-50 text-status-error border-status-error/20',
  };

  const labelMap = {
    booked: 'Booked',
    arrived: 'Arrived',
    weighing: 'Weighing',
    quality_check: 'Quality Check',
    completed: 'Completed & Paid',
    accepted: 'Accepted',
    rejected: 'Rejected',
    open: 'Open',
    busy: 'Busy',
    closed: 'Closed',
  };

  const currentStyle = styles[status.toLowerCase()] || 'bg-slate-50 text-slate-600 border-slate-200';
  const label = labelMap[status.toLowerCase()] || status;

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wide ${currentStyle} ${className}`}>
      {label}
    </span>
  );
}

/**
 * Accessible Alert Banner
 */
export function Alert({ children, type = 'info', className = '' }) {
  const styles = {
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    success: 'bg-green-50 border-green-200 text-gov-green-deep',
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
    danger: 'bg-red-50 border-red-200 text-red-800',
  };

  const icons = {
    info: (
      <svg className="h-5 w-5 text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    success: (
      <svg className="h-5 w-5 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    warning: (
      <svg className="h-5 w-5 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    danger: (
      <svg className="h-5 w-5 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  };

  return (
    <div className={`flex items-start gap-3 rounded-lg border p-4 text-sm ${styles[type]} ${className}`} role="alert">
      {icons[type]}
      <div className="flex-1">{children}</div>
    </div>
  );
}
