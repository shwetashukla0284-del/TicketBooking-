'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, Film, Music, Calendar, MapPin, Ticket, Sparkles, ArrowRight } from 'lucide-react';

export default function HomePage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    fetchEvents();
  }, [filterType]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      let url = '/api/events?status=PUBLISHED';
      if (filterType !== 'ALL') {
        url += `&type=${filterType}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setEvents(data.events);
      }
    } catch (err) {
      console.error('Failed to load events:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredEvents = events.filter((e) =>
    e.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
      {/* Hero Section */}
      <section className="relative rounded-3xl overflow-hidden glass-panel p-8 sm:p-12 border border-indigo-500/20 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 gradient-bg rounded-full blur-3xl opacity-20 pointer-events-none"></div>

        <div className="max-w-3xl relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" /> Next-Gen Booking Experience
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
            Reserve Your <span className="gradient-text">Perfect Seat</span> in Seconds
          </h1>

          <p className="text-slate-300 text-base sm:text-lg max-w-2xl leading-relaxed">
            Real-time visual seat selection, zero double bookings, temporary seat holds, and automated waitlist allocation for blockbuster movies and live concerts.
          </p>

          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search movies, concerts, or events..."
                className="w-full pl-12 pr-4 py-3 rounded-2xl bg-slate-900/80 border border-slate-700/80 text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFilterType('ALL')}
                className={`px-4 py-3 rounded-2xl text-xs font-semibold transition-all ${
                  filterType === 'ALL'
                    ? 'gradient-bg text-white shadow-lg shadow-indigo-500/25'
                    : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800'
                }`}
              >
                All Events
              </button>
              <button
                onClick={() => setFilterType('MOVIE')}
                className={`px-4 py-3 rounded-2xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  filterType === 'MOVIE'
                    ? 'gradient-bg text-white shadow-lg shadow-indigo-500/25'
                    : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Film className="w-3.5 h-3.5" /> Movies
              </button>
              <button
                onClick={() => setFilterType('CONCERT')}
                className={`px-4 py-3 rounded-2xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  filterType === 'CONCERT'
                    ? 'gradient-bg text-white shadow-lg shadow-indigo-500/25'
                    : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Music className="w-3.5 h-3.5" /> Concerts
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Events Grid */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Ticket className="w-6 h-6 text-indigo-400" /> Featured Shows & Events
          </h2>
          <span className="text-xs text-slate-400 font-mono">
            {filteredEvents.length} {filteredEvents.length === 1 ? 'Event' : 'Events'} Available
          </span>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-96 rounded-3xl glass-card animate-pulse"></div>
            ))}
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="glass-panel p-12 text-center rounded-3xl space-y-3">
            <p className="text-slate-400 text-sm">No events found matching your search criteria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map((event) => {
              const show = event.shows && event.shows.length > 0 ? event.shows[0] : null;
              const formattedDate = show
                ? new Date(show.startTime).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : 'TBD';

              return (
                <div
                  key={event.id}
                  className="group rounded-3xl glass-card overflow-hidden flex flex-col justify-between"
                >
                  <div className="relative h-56 overflow-hidden bg-slate-800">
                    <img
                      src={
                        event.imageUrl ||
                        'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=1000&auto=format&fit=crop'
                      }
                      alt={event.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-4 left-4 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-950/80 text-indigo-300 border border-indigo-500/30 backdrop-blur-md">
                      {event.type}
                    </div>
                  </div>

                  <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-white group-hover:text-indigo-400 transition-colors line-clamp-1">
                        {event.title}
                      </h3>
                      <p className="text-slate-400 text-xs mt-2 line-clamp-2 leading-relaxed">
                        {event.description}
                      </p>
                    </div>

                    <div className="space-y-2 pt-2 text-xs border-t border-slate-800/80">
                      <div className="flex items-center gap-2 text-slate-300">
                        <MapPin className="w-4 h-4 text-indigo-400 shrink-0" />
                        <span className="truncate">{event.venue?.name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-300">
                        <Calendar className="w-4 h-4 text-indigo-400 shrink-0" />
                        <span>{formattedDate}</span>
                      </div>
                    </div>

                    <Link
                      href={`/event/${event.id}`}
                      className="w-full py-3 rounded-xl gradient-button text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 group-hover:shadow-indigo-500/40 transition-all mt-4"
                    >
                      Select Seats <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
