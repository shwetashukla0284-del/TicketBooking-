'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Film,
  Ticket,
  DollarSign,
  TrendingUp,
  PlusCircle,
  BarChart3,
  Calendar,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

export default function OrganiserDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [venues, setVenues] = useState<any[]>([]);

  // Form State
  const [title, setTitle] = useState('');
  const [type, setType] = useState('MOVIE');
  const [description, setDescription] = useState('');
  const [venueId, setVenueId] = useState('');
  const [creating, setCreating] = useState(false);
  const [formMsg, setFormMsg] = useState<string | null>(null);

  const router = useRouter();

  useEffect(() => {
    fetchSummary();
    fetchVenues();
  }, []);

  const fetchSummary = async () => {
    try {
      const res = await fetch('/api/organiser/summary');
      const json = await res.json();
      if (json.success) {
        setData(json);
      } else if (res.status === 403 || res.status === 401) {
        router.push('/login?redirect=/organiser');
      }
    } catch (err) {
      console.error('Failed to fetch summary:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchVenues = async () => {
    try {
      const res = await fetch('/api/venues');
      const json = await res.json();
      if (json.success) {
        setVenues(json.venues);
        if (json.venues.length > 0) setVenueId(json.venues[0].id);
      }
    } catch (err) {}
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setFormMsg(null);

    try {
      const showTimes = [
        {
          startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        },
      ];

      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          type,
          description,
          venueId,
          showTimes,
        }),
      });

      const json = await res.json();

      if (json.success) {
        setShowCreateModal(false);
        setTitle('');
        setDescription('');
        fetchSummary();
      } else {
        setFormMsg(json.message || 'Event creation failed.');
      }
    } catch (err) {
      setFormMsg('Network error.');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-400">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        Loading Organiser Analytics...
      </div>
    );
  }

  const metrics = data?.metrics || {
    totalEvents: 0,
    publishedEvents: 0,
    totalTicketsSold: 0,
    grossRevenue: 0,
    overallOccupancyRate: 0,
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <LayoutDashboard className="w-8 h-8 text-indigo-400" /> Organiser Dashboard
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Monitor real-time ticket sales, venue occupancy, and revenue performance.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-5 py-2.5 rounded-xl gradient-button text-white font-semibold text-sm flex items-center gap-2 shadow-lg shadow-indigo-500/25 shrink-0"
        >
          <PlusCircle className="w-4 h-4" /> Create New Event
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-panel p-6 rounded-3xl border border-indigo-500/20 space-y-2">
          <div className="flex justify-between items-center text-slate-400 text-xs">
            <span>Gross Revenue</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-black text-white font-mono">${metrics.grossRevenue.toFixed(2)}</div>
          <span className="text-[11px] text-emerald-400 block font-medium">Valid confirmed bookings</span>
        </div>

        <div className="glass-panel p-6 rounded-3xl border border-indigo-500/20 space-y-2">
          <div className="flex justify-between items-center text-slate-400 text-xs">
            <span>Tickets Sold</span>
            <Ticket className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-3xl font-black text-white font-mono">{metrics.totalTicketsSold}</div>
          <span className="text-[11px] text-indigo-400 block font-medium">Issued digital passes</span>
        </div>

        <div className="glass-panel p-6 rounded-3xl border border-indigo-500/20 space-y-2">
          <div className="flex justify-between items-center text-slate-400 text-xs">
            <span>Venue Occupancy</span>
            <TrendingUp className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-3xl font-black text-white font-mono">{metrics.overallOccupancyRate}%</div>
          <span className="text-[11px] text-sky-400 block font-medium">Average show seat fill</span>
        </div>

        <div className="glass-panel p-6 rounded-3xl border border-indigo-500/20 space-y-2">
          <div className="flex justify-between items-center text-slate-400 text-xs">
            <span>Total Events</span>
            <Film className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-3xl font-black text-white font-mono">{metrics.totalEvents}</div>
          <span className="text-[11px] text-purple-400 block font-medium">{metrics.publishedEvents} Published</span>
        </div>
      </div>

      {/* Per-Event Breakdown Table */}
      <section className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-6">
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-indigo-400" /> Event Performance & Revenue
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300 border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-xs text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Event Title</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Tickets Sold</th>
                <th className="py-3 px-4">Occupancy</th>
                <th className="py-3 px-4 text-right">Gross Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
              {data?.eventSummaries?.map((item: any) => (
                <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-4 px-4 font-sans font-bold text-white">{item.title}</td>
                  <td className="py-4 px-4">
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-indigo-300 font-sans font-semibold">
                      {item.type}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-sans font-semibold">
                      {item.status}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-slate-200">
                    {item.ticketsSold} / {item.capacity}
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-indigo-500 h-full rounded-full"
                          style={{ width: `${item.occupancyRate}%` }}
                        ></div>
                      </div>
                      <span className="text-slate-300">{item.occupancyRate}%</span>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-right font-bold text-emerald-400">
                    ${item.revenue.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Create Event Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel p-8 rounded-3xl border border-indigo-500/30 max-w-lg w-full space-y-6 animate-in fade-in zoom-in-95">
            <h2 className="text-xl font-bold text-white">Create New Event</h2>

            {formMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{formMsg}</span>
              </div>
            )}

            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Event Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Inception 2: Beyond Time"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-white text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Event Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-white text-sm focus:outline-none focus:border-indigo-500"
                >
                  <option value="MOVIE">Movie</option>
                  <option value="CONCERT">Concert</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Select Venue</label>
                <select
                  value={venueId}
                  onChange={(e) => setVenueId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-white text-sm focus:outline-none focus:border-indigo-500"
                >
                  {venues.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.capacity} Seats)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Description</label>
                <textarea
                  required
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide event details..."
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-white text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2.5 rounded-xl gradient-button text-white font-semibold text-xs shadow-lg shadow-indigo-500/25"
                >
                  {creating ? 'Publishing...' : 'Publish Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
