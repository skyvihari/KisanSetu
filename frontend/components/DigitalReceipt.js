'use client';
import React from 'react';

export default function DigitalReceipt({ booking, payment, onClose }) {
  if (!booking) return null;

  // Rate calculation parameters
  const isMspCrop = ['Paddy', 'Maize', 'Wheat', 'Groundnut'].includes(booking.crop);
  const rateLabel = isMspCrop ? 'MSP Rate' : 'Procurement Rate';
  const ratePerQuintal = booking.rate_per_kg ? booking.rate_per_kg * 100 : 2200;
  
  // Total sum check and fallback
  const totalAmount = booking.total_amount || (payment && payment.amount) || (booking.actual_weight_kg ? booking.actual_weight_kg * (booking.rate_per_kg || 22) : 0);
  const paymentStatus = (payment && payment.payment_status) || booking.payment_status || 'processing';
  const paymentRef = (payment && payment.reference_id) || booking.payment_ref || 'DEMO-PAY-' + (100000 + Number(booking.id));
  const paymentDate = (payment && payment.payment_date) || booking.payment_date || booking.booking_date;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-[2px]">
      {/* Printable styles injected directly for local scoping */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * {
            visibility: hidden !important;
          }
          #ks-printable-receipt, #ks-printable-receipt * {
            visibility: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          #ks-printable-receipt {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .ks-no-print {
            display: none !important;
          }
        }
      `}} />

      <div 
        id="ks-printable-receipt"
        className="w-full max-w-md bg-white border border-gov-border rounded-2xl shadow-xl overflow-hidden flex flex-col justify-between break-words"
      >
        {/* Receipt Header branding */}
        <div className="border-b border-dashed border-gov-border p-5 text-center bg-gov-bg relative">
          <button 
            onClick={onClose}
            className="ks-no-print absolute top-3 right-3 text-gov-text-muted hover:text-gov-text-main font-extrabold text-base p-1"
            title="Close modal"
          >
            ✕
          </button>
          
          <img 
            src="/logo.png" 
            alt="KisanSetu Logo" 
            className="h-12 w-auto mx-auto object-contain mb-2" 
          />
          <h2 className="text-[15px] font-black text-gov-green-deep tracking-wide uppercase leading-tight">
            Digital Procurement Receipt
          </h2>
          <p className="text-[9px] text-gov-text-muted mt-0.5 font-bold tracking-wider">
            DIGITAL PROCUREMENT RECORD
          </p>
        </div>

        {/* Receipt Details Body */}
        <div className="p-5 space-y-4 text-sm">
          {/* Main summary grid */}
          <div className="space-y-3">
            <div className="flex justify-between items-start py-1.5 border-b border-slate-50 gap-2">
              <span className="text-gov-text-muted font-medium text-[11px] shrink-0">Registered Farmer</span>
              <span className="font-extrabold text-gov-text-main text-right break-words">{booking.farmer_name}</span>
            </div>

            <div className="flex justify-between items-center py-1.5 border-b border-slate-50 gap-2">
              <span className="text-gov-text-muted font-medium text-[11px] shrink-0">Token Number</span>
              <span className="font-black text-gov-green-deep text-[15px]">#{booking.token_no}</span>
            </div>

            <div className="flex justify-between items-start py-1.5 border-b border-slate-50 gap-2">
              <span className="text-gov-text-muted font-medium text-[11px] shrink-0">Crop Type</span>
              <span className="font-extrabold text-gov-text-main text-right">{booking.crop}</span>
            </div>

            <div className="flex justify-between items-start py-1.5 border-b border-slate-50 gap-2">
              <span className="text-gov-text-muted font-medium text-[11px] shrink-0">Final Weight</span>
              <div className="text-right">
                <span className="font-extrabold text-gov-text-main">
                  {booking.actual_weight_kg ? (booking.actual_weight_kg / 100).toFixed(2) : '0.00'} Quintals
                </span>
                <span className="text-[10px] text-gov-text-muted block mt-0.5">
                  ({booking.actual_weight_kg || 0} kg)
                </span>
              </div>
            </div>

            <div className="flex justify-between items-start py-1.5 border-b border-slate-50 gap-2">
              <span className="text-gov-text-muted font-medium text-[11px] shrink-0">Procurement Centre</span>
              <span className="font-extrabold text-gov-text-main text-right break-words text-[13px]">{booking.centre_name}</span>
            </div>

            <div className="flex justify-between items-center py-1.5 border-b border-slate-50 gap-2">
              <span className="text-gov-text-muted font-medium text-[11px] shrink-0">Procurement Date</span>
              <span className="font-semibold text-gov-text-main text-[13px]">{booking.booking_date}</span>
            </div>

            <div className="flex justify-between items-center py-1.5 border-b border-slate-50 gap-2">
              <span className="text-gov-text-muted font-medium text-[11px] shrink-0">{rateLabel}</span>
              <span className="font-bold text-gov-text-main text-right text-[13px]">
                ₹{ratePerQuintal} / Quintal <span className="text-[10px] text-gov-text-muted block sm:inline">({booking.rate_per_kg ? `₹${booking.rate_per_kg}/kg` : 'N/A'})</span>
              </span>
            </div>

            <div className="flex justify-between items-center py-1.5 border-b border-slate-50 gap-2">
              <span className="text-gov-text-muted font-medium text-[11px] shrink-0">Payment Status</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase shrink-0 ${
                paymentStatus === 'completed' 
                  ? 'bg-gov-green-light text-gov-green-deep' 
                  : paymentStatus === 'failed'
                    ? 'bg-red-50 text-status-error'
                    : 'bg-amber-50 text-status-pending'
              }`}>
                {paymentStatus === 'completed' ? 'Paid' : paymentStatus}
              </span>
            </div>

            {paymentStatus === 'completed' && (
              <>
                <div className="flex justify-between items-center py-1.5 border-b border-slate-50 gap-2">
                  <span className="text-gov-text-muted font-medium text-[11px] shrink-0">Payment Date</span>
                  <span className="font-semibold text-gov-text-main text-[13px]">{paymentDate}</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-slate-50 gap-2">
                  <span className="text-gov-text-muted font-medium text-[11px] shrink-0">Bank Ref</span>
                  <span className="font-mono text-[11px] text-gov-text-main font-bold break-all text-right">{paymentRef}</span>
                </div>
              </>
            )}

            <div className="flex justify-between items-center pt-2 gap-2">
              <span className="text-gov-text-muted font-bold text-[11px] uppercase shrink-0">Total Paid Value</span>
              <span className="text-xl font-black text-gov-green-deep">₹{totalAmount.toLocaleString('en-IN')}</span>
            </div>
          </div>

          {/* Prototype disclaimer */}
          <div className="p-3 bg-slate-50 rounded-xl border border-gov-border text-[9px] text-gov-text-muted leading-relaxed text-center italic mt-2">
            Demonstration record. Transaction values are simulated; no bank transfer occurred.
          </div>
        </div>

        {/* Modal footer print buttons */}
        <div className="ks-no-print bg-gov-bg border-t border-gov-border p-4 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 text-xs font-bold rounded-xl border border-gov-border bg-white text-gov-text-muted hover:bg-slate-50 transition-colors"
          >
            Close Receipt
          </button>
          
          <button
            onClick={handlePrint}
            className="flex-1 py-3 text-xs font-bold rounded-xl bg-gov-green-deep text-white hover:bg-gov-green-medium transition-colors shadow-sm flex items-center justify-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print / Save PDF
          </button>
        </div>
      </div>
    </div>
  );
}
