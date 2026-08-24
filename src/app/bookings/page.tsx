'use client';

import { useState, useEffect } from 'react';
import { Ticket, Calendar, MapPin, QrCode, Ban, CheckCircle2, AlertCircle } from 'lucide-react';
import QRCode from 'qrcode';

export default function BookingsHistoryPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [qrCodeUrls, setQrCodeUrls] = useState<{ [ref: string]: string }>({});
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const res = await fetch('/api/bookings');
      const data = await res.json();
      if (data.success) {
        setBookings(data.bookings);
        // Generate QR Code data URLs for each confirmed booking
        data.bookings.forEach(async (b: any) => {
          if (b.status === 'CONFIRMED') {
            const url = await QRCode.toDataURL(b.reference, { width: 180, margin: 1 });
            setQrCodeUrls((prev) => ({ ...prev, [b.reference]: url }));
          }
        });
      }
    } catch (err) {
      console.error('Failed to fetch bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm('Are you sure you want to cancel this booking? Cancelled seats will be automatically offered to waitlisted customers.')) {
      return;
    }

    setCancellingId(bookingId);
    setActionMessage(null);

    try {
      const res = await fetch(`/api/bookings/${bookingId}/cancel`, {
        method: 'POST',
      });

      const data = await res.json();

      if (data.success) {
        setActionMessage(data.message);
        fetchBookings(); // Refresh list
      } else {
        alert(data.message || 'Failed to cancel booking.');
      }
    } catch (err) {
      alert('Network error while cancelling booking.');
    } finally {
      setCancellingId(null);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-400">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        Loading your ticket history...
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <Ticket className="w-8 h-8 text-indigo-400" /> My Digital Tickets
          </h1>
          <p className="text-sm text-slate-400 mt-1">View your confirmed tickets, QR check-in passes, and booking history.</p>
        </div>
      </div>

      {actionMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {bookings.length === 0 ? (
        <div className="glass-panel p-12 text-center rounded-3xl space-y-4">
          <p className="text-slate-400 text-sm">You have no booking records yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {bookings.map((b) => {
            const isConfirmed = b.status === 'CONFIRMED';
            const showTime = new Date(b.show.startTime).toLocaleString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={b.id}
                className={`glass-panel p-6 rounded-3xl border flex flex-col justify-between space-y-6 ${
                  isConfirmed ? 'border-slate-800' : 'border-rose-900/30 opacity-60'
                }`}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-indigo-400 tracking-wider">
                      {b.reference}
                    </span>
                    <span
                      className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        isConfirmed
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {b.status}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-white">{b.show.event.title}</h3>
                    <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-1">
                      <MapPin className="w-3.5 h-3.5 text-indigo-400" /> {b.show.event.venue?.name}
                    </p>
                    <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-1">
                      <Calendar className="w-3.5 h-3.5 text-indigo-400" /> {showTime}
                    </p>
                  </div>

                  {/* Reserved Seats List */}
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs space-y-1">
                    <span className="text-slate-400 block font-semibold mb-1">Seats Booked:</span>
                    {b.items.map((it: any) => (
                      <div key={it.id} className="flex justify-between text-slate-300">
                        <span>
                          Row {it.showSeat.venueSeat.row} - Seat {it.showSeat.venueSeat.seatNumber} ({it.showSeat.category.name})
                        </span>
                        <span className="font-mono text-emerald-400">${it.price.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  {/* QR Code Pass Card */}
                  {isConfirmed && qrCodeUrls[b.reference] && (
                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-center space-y-2">
                      <span className="text-[10px] uppercase font-mono tracking-widest text-slate-400 block">
                        Venue Gate Digital Pass
                      </span>
                      <img
                        src={qrCodeUrls[b.reference]}
                        alt={`QR Code for ${b.reference}`}
                        className="w-36 h-36 mx-auto rounded-lg border-2 border-white"
                      />
                      <span className="text-[10px] text-slate-500 block">Scan code at entry turnstile</span>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-400 block">Total Amount</span>
                    <span className="text-lg font-bold text-white font-mono">${b.totalAmount.toFixed(2)}</span>
                  </div>

                  {isConfirmed && (
                    <button
                      onClick={() => handleCancelBooking(b.id)}
                      disabled={cancellingId === b.id}
                      className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1.5 transition-colors"
                    >
                      <Ban className="w-3.5 h-3.5" />
                      {cancellingId === b.id ? 'Cancelling...' : 'Cancel Booking'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
