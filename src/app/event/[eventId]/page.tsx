'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import SeatMap from '@/components/SeatMap';
import { Calendar, MapPin, Film, Music, Clock, ArrowLeft, Ticket } from 'lucide-react';
import Link from 'next/link';

export default function EventPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = use(params);
  const [event, setEvent] = useState<any>(null);
  const [selectedShowId, setSelectedShowId] = useState<string | null>(null);
  const [seats, setSeats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [seatsLoading, setSeatsLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchEventDetails();
  }, [eventId]);

  useEffect(() => {
    if (selectedShowId) {
      fetchShowSeats(selectedShowId);
    }
  }, [selectedShowId]);

  const fetchEventDetails = async () => {
    try {
      const res = await fetch(`/api/events/${eventId}`);
      const data = await res.json();
      if (data.success) {
        setEvent(data.event);
        if (data.event.shows && data.event.shows.length > 0) {
          setSelectedShowId(data.event.shows[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch event details:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchShowSeats = async (showId: string) => {
    setSeatsLoading(true);
    try {
      const res = await fetch(`/api/shows/${showId}/seats`);
      const data = await res.json();
      if (data.success) {
        setSeats(data.seats);
      }
    } catch (err) {
      console.error('Failed to fetch show seats:', err);
    } finally {
      setSeatsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center text-slate-400">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        Loading event details...
      </div>
    );
  }

  if (!event) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center space-y-4">
        <p className="text-rose-400 text-lg">Event not found.</p>
        <Link href="/" className="inline-flex items-center gap-2 text-indigo-400 hover:underline">
          <ArrowLeft className="w-4 h-4" /> Return to Event List
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Back Link */}
      <Link href="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm">
        <ArrowLeft className="w-4 h-4" /> Back to Events
      </Link>

      {/* Event Header Banner */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800/80 flex flex-col md:flex-row gap-8 items-start">
        <div className="w-full md:w-64 h-64 rounded-2xl overflow-hidden bg-slate-800 shrink-0">
          <img
            src={
              event.imageUrl ||
              'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=1000&auto=format&fit=crop'
            }
            alt={event.title}
            className="w-full h-full object-cover"
          />
        </div>

        <div className="space-y-4 flex-1">
          <div className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
            {event.type}
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">{event.title}</h1>
          <p className="text-slate-300 text-sm leading-relaxed max-w-3xl">{event.description}</p>

          <div className="flex flex-wrap gap-6 pt-2 text-sm text-slate-300">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-indigo-400" />
              <span>{event.venue?.name} ({event.venue?.address})</span>
            </div>
            <div className="flex items-center gap-2">
              <Ticket className="w-4 h-4 text-indigo-400" />
              <span>Venue Capacity: {event.venue?.capacity} seats</span>
            </div>
          </div>

          {/* Show Times Selector */}
          {event.shows && event.shows.length > 0 && (
            <div className="pt-4 space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Select Show Time
              </label>
              <div className="flex flex-wrap gap-3">
                {event.shows.map((show: any) => {
                  const isSelected = show.id === selectedShowId;
                  const dateStr = new Date(show.startTime).toLocaleString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <button
                      key={show.id}
                      onClick={() => setSelectedShowId(show.id)}
                      className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
                        isSelected
                          ? 'gradient-bg text-white shadow-lg shadow-indigo-500/25 scale-105'
                          : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800 border border-slate-700/60'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      {dateStr}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Visual Seat Selection Grid */}
      {selectedShowId && (
        <section className="glass-panel p-6 sm:p-10 rounded-3xl border border-slate-800/80 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Interactive Seat Selection Map</h2>
              <p className="text-slate-400 text-xs mt-1">
                Click on available seats to add them to your reservation.
              </p>
            </div>
          </div>

          {seatsLoading ? (
            <div className="py-20 text-center text-slate-400">
              <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              Loading real-time seat availability...
            </div>
          ) : (
            <SeatMap
              showId={selectedShowId}
              eventTitle={event.title}
              venueName={event.venue?.name}
              seats={seats}
              onHoldSuccess={(holdId) => {
                router.push(`/checkout?holdId=${holdId}`);
              }}
            />
          )}
        </section>
      )}
    </div>
  );
}
