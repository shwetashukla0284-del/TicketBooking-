'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import HoldTimer from '@/components/HoldTimer';
import { Ticket, MapPin, Calendar, CheckCircle2, ShieldCheck, Sparkles, AlertCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

function CheckoutContent() {
  const searchParams = useSearchParams();
  const holdId = searchParams.get('holdId');
  const router = useRouter();

  const [bookingData, setBookingData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<any>(null);

  useEffect(() => {
    if (!holdId) {
      setErrorMsg('No active seat hold found.');
      setLoading(false);
      return;
    }
    fetchHoldDetails();
  }, [holdId]);

  const fetchHoldDetails = async () => {
    try {
      // Re-fetch current user sessions and verify hold
      const res = await fetch('/api/bookings', { method: 'GET' });
      const data = await res.json();
      if (!data.success && res.status === 401) {
        router.push(`/login?redirect=/checkout?holdId=${holdId}`);
        return;
      }
    } catch (err) {}
    setLoading(false);
  };

  const handleConfirmBooking = async () => {
    if (!holdId) return;
    setConfirming(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ holdId }),
      });

      const data = await res.json();

      if (!data.success) {
        setErrorMsg(data.message || 'Failed to complete booking.');
      } else {
        setConfirmedBooking(data.booking);
      }
    } catch (err) {
      setErrorMsg('A network error occurred while confirming booking.');
    } finally {
      setConfirming(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-400">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        Loading checkout details...
      </div>
    );
  }

  if (confirmedBooking) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 space-y-6 text-center animate-in fade-in zoom-in-95">
        <div className="w-20 h-20 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/20">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold text-white">Booking Confirmed!</h1>
          <p className="text-slate-300 text-sm">
            Your digital ticket has been issued and sent to your email.
          </p>
        </div>

        <div className="glass-panel p-6 rounded-3xl border border-slate-800 text-left space-y-4 font-mono text-sm">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <span className="text-slate-400">Booking Reference</span>
            <span className="text-indigo-400 font-bold text-base tracking-wider">{confirmedBooking.reference}</span>
          </div>

          <div className="space-y-2 text-xs text-slate-300">
            <div className="flex justify-between">
              <span className="text-slate-400">Event:</span>
              <span className="text-white font-semibold">{confirmedBooking.eventTitle}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Venue:</span>
              <span className="text-white">{confirmedBooking.venueName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Show Time:</span>
              <span className="text-white">{new Date(confirmedBooking.showTime).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Reserved Seats:</span>
              <span className="text-emerald-400 font-semibold">{confirmedBooking.seats?.join(', ')}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-slate-800">
              <span className="text-slate-400">Total Paid:</span>
              <span className="text-emerald-400 font-bold text-base">${confirmedBooking.totalAmount?.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
          <Link
            href="/bookings"
            className="px-6 py-3 gradient-button text-white font-semibold text-sm rounded-xl shadow-lg shadow-indigo-500/30"
          >
            View Digital Tickets in History
          </Link>
          <Link
            href="/"
            className="px-6 py-3 bg-slate-800/80 hover:bg-slate-800 text-slate-300 font-semibold text-sm rounded-xl border border-slate-700/60"
          >
            Return to Homepage
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      <Link href="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm">
        <ArrowLeft className="w-4 h-4" /> Cancel & Return
      </Link>

      <div className="glass-panel p-6 sm:p-10 rounded-3xl border border-indigo-500/20 shadow-2xl space-y-8">
        <div className="flex items-center justify-between border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-indigo-400" /> Checkout & Payment
            </h1>
            <p className="text-xs text-slate-400 mt-1">Review your seat reservation details and complete booking.</p>
          </div>
        </div>

        {/* Live Hold Expiration Timer */}
        {/* Generates a 10 minute window for checkout */}
        <HoldTimer
          expiresAt={new Date(Date.now() + 10 * 60 * 1000)}
          onExpire={() => {
            setErrorMsg('Your seat hold countdown expired! Please select seats again.');
          }}
        />

        {errorMsg && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Mock Payment & Confirmation Box */}
        <div className="space-y-6">
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Payment Gateway</span>
              <span className="text-indigo-400 font-semibold">Instant Ticket Pass</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Security</span>
              <span className="text-emerald-400 font-semibold">256-Bit SSL Encrypted</span>
            </div>
          </div>

          <button
            onClick={handleConfirmBooking}
            disabled={confirming}
            className="w-full py-4 gradient-button text-white font-bold text-base rounded-2xl shadow-xl shadow-indigo-500/30 flex items-center justify-center gap-3"
          >
            {confirming ? (
              <>Processing Booking...</>
            ) : (
              <>
                <Sparkles className="w-5 h-5" /> Complete Booking & Issue Ticket
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-slate-400">Loading Checkout...</div>}>
      <CheckoutContent />
    </Suspense>
  );
}
