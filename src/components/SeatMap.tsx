'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldAlert, CheckCircle2, Clock, Lock, Sparkles, UserCheck } from 'lucide-react';

export interface Seat {
  id: string;
  venueSeatId: string;
  row: string;
  seatNumber: number;
  category: string;
  categoryId: string;
  price: number;
  status: string; // AVAILABLE, HELD, BOOKED
}

interface SeatMapProps {
  showId: string;
  eventTitle: string;
  venueName: string;
  seats: Seat[];
  onHoldSuccess?: (holdId: string, expiresAt: string) => void;
}

export default function SeatMap({ showId, eventTitle, venueName, seats, onHoldSuccess }: SeatMapProps) {
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [waitlistLoading, setWaitlistLoading] = useState<string | null>(null);
  const [waitlistSuccess, setWaitlistSuccess] = useState<string | null>(null);
  const router = useRouter();

  // Group seats by row
  const rows = Array.from(new Set(seats.map((s) => s.row))).sort();

  // Get distinct categories
  const categories = Array.from(
    new Map(seats.map((s) => [s.categoryId, { id: s.categoryId, name: s.category, price: s.price }])).values()
  );

  const toggleSeatSelection = (seat: Seat) => {
    if (seat.status !== 'AVAILABLE') return;
    setErrorMessage(null);

    if (selectedSeatIds.includes(seat.id)) {
      setSelectedSeatIds(selectedSeatIds.filter((id) => id !== seat.id));
    } else {
      setSelectedSeatIds([...selectedSeatIds, seat.id]);
    }
  };

  const selectedSeats = seats.filter((s) => selectedSeatIds.includes(s.id));
  const totalPrice = selectedSeats.reduce((sum, s) => sum + s.price, 0);

  const handleCreateHold = async () => {
    if (selectedSeatIds.length === 0) return;
    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/shows/${showId}/holds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ showSeatIds: selectedSeatIds }),
      });

      const data = await res.json();

      if (!data.success) {
        if (res.status === 401) {
          router.push(`/login?redirect=/event/${showId}`);
          return;
        }
        setErrorMessage(data.message || 'Seat hold failed.');
        setSelectedSeatIds([]); // Reset selection on conflict
      } else {
        if (onHoldSuccess) {
          onHoldSuccess(data.holdId, data.expiresAt);
        } else {
          router.push(`/checkout?holdId=${data.holdId}`);
        }
      }
    } catch (err) {
      setErrorMessage('A network error occurred while holding seats.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinWaitlist = async (categoryId: string) => {
    setWaitlistLoading(categoryId);
    setWaitlistSuccess(null);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/shows/${showId}/waitlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryId }),
      });

      const data = await res.json();

      if (!data.success) {
        if (res.status === 401) {
          router.push(`/login?redirect=/event/${showId}`);
          return;
        }
        setErrorMessage(data.message || 'Failed to join waitlist.');
      } else {
        setWaitlistSuccess(`You have joined the waitlist at Queue Position #${data.position}!`);
      }
    } catch (err) {
      setErrorMessage('Failed to join waitlist.');
    } finally {
      setWaitlistLoading(null);
    }
  };

  return (
    <div className="w-full flex flex-col items-center">
      {/* Screen Curved Header */}
      <div className="w-full max-w-2xl mb-12">
        <div className="cinema-screen h-12 flex items-center justify-center">
          <span className="text-xs font-semibold uppercase tracking-widest text-sky-300/80">
            SCREEN / STAGE DIRECTION
          </span>
        </div>
      </div>

      {/* Legend Bar */}
      <div className="flex flex-wrap justify-center items-center gap-6 mb-8 px-4 py-3 rounded-2xl glass-panel text-xs">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md seat-available flex items-center justify-center">A</div>
          <span className="text-slate-300">Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md seat-selected flex items-center justify-center">✓</div>
          <span className="text-indigo-300 font-semibold">Selected</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md seat-held flex items-center justify-center">H</div>
          <span className="text-amber-300">Held</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md seat-booked flex items-center justify-center">X</div>
          <span className="text-rose-400">Booked</span>
        </div>
      </div>

      {/* Category Pricing Badges */}
      <div className="flex flex-wrap justify-center gap-3 mb-8">
        {categories.map((cat) => {
          const categorySeats = seats.filter((s) => s.categoryId === cat.id);
          const availableCount = categorySeats.filter((s) => s.status === 'AVAILABLE').length;
          const isSoldOut = availableCount === 0;

          return (
            <div
              key={cat.id}
              className={`px-4 py-2 rounded-xl text-xs flex items-center gap-3 border ${
                isSoldOut
                  ? 'bg-rose-950/30 border-rose-800/40 text-rose-300'
                  : 'bg-slate-800/50 border-slate-700/60 text-slate-200'
              }`}
            >
              <div>
                <span className="font-semibold text-slate-100">{cat.name}</span>
                <span className="text-indigo-400 ml-2 font-mono">${cat.price.toFixed(2)}</span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-slate-900/60 text-slate-400">
                {isSoldOut ? 'SOLD OUT' : `${availableCount} Left`}
              </span>
              {isSoldOut && (
                <button
                  onClick={() => handleJoinWaitlist(cat.id)}
                  disabled={waitlistLoading === cat.id}
                  className="px-2.5 py-1 text-[11px] font-medium bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg transition-colors"
                >
                  {waitlistLoading === cat.id ? 'Joining...' : 'Join Waitlist'}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Error & Waitlist Notification Messages */}
      {errorMessage && (
        <div className="w-full max-w-xl mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center gap-3">
          <ShieldAlert className="w-5 h-5 shrink-0 text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {waitlistSuccess && (
        <div className="w-full max-w-xl mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
          <span>{waitlistSuccess}</span>
        </div>
      )}

      {/* Visual Seat Grid Matrix */}
      <div className="w-full overflow-x-auto pb-6">
        <div className="min-w-[600px] max-w-3xl mx-auto flex flex-col gap-3">
          {rows.map((rowName) => {
            const rowSeats = seats
              .filter((s) => s.row === rowName)
              .sort((a, b) => a.seatNumber - b.seatNumber);

            return (
              <div key={rowName} className="flex items-center justify-center gap-3">
                {/* Row Label */}
                <div className="w-6 text-center font-bold text-slate-400 text-xs font-mono">{rowName}</div>

                {/* Seat Buttons */}
                <div className="flex items-center gap-2">
                  {rowSeats.map((seat) => {
                    const isSelected = selectedSeatIds.includes(seat.id);
                    let seatClass = 'seat-available';

                    if (isSelected) {
                      seatClass = 'seat-selected';
                    } else if (seat.status === 'HELD') {
                      seatClass = 'seat-held';
                    } else if (seat.status === 'BOOKED') {
                      seatClass = 'seat-booked';
                    }

                    return (
                      <button
                        key={seat.id}
                        onClick={() => toggleSeatSelection(seat)}
                        disabled={seat.status !== 'AVAILABLE'}
                        className={`w-9 h-9 rounded-lg text-xs font-semibold font-mono flex items-center justify-center transition-all ${seatClass}`}
                        title={`${seat.category} - Row ${seat.row} Seat ${seat.seatNumber} ($${seat.price}) - ${seat.status}`}
                      >
                        {seat.seatNumber}
                      </button>
                    );
                  })}
                </div>

                {/* Row Label Right */}
                <div className="w-6 text-center font-bold text-slate-400 text-xs font-mono">{rowName}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selection Summary Drawer Bar */}
      {selectedSeatIds.length > 0 && (
        <div className="fixed bottom-6 inset-x-4 max-w-2xl mx-auto glass-panel p-5 rounded-2xl shadow-2xl z-40 border border-indigo-500/30 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom-6">
          <div>
            <div className="text-xs text-indigo-300 uppercase tracking-wider font-mono">Selected Seats</div>
            <div className="text-sm font-semibold text-white mt-0.5">
              {selectedSeats.map((s) => `${s.row}${s.seatNumber}`).join(', ')} ({selectedSeats.length} seats)
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              Total Amount: <span className="text-emerald-400 font-bold text-sm">${totalPrice.toFixed(2)}</span>
            </div>
          </div>

          <button
            onClick={handleCreateHold}
            disabled={loading}
            className="w-full sm:w-auto px-6 py-3 gradient-button text-white font-semibold text-sm rounded-xl shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Clock className="w-4 h-4 animate-spin" /> Holding Seats...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" /> Reserve & Proceed to Checkout
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
