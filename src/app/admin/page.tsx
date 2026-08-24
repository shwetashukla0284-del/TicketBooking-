'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Building2, Grid, PlusCircle, CheckCircle2, AlertCircle } from 'lucide-react';

export default function AdminConsolePage() {
  const [venues, setVenues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [capacity, setCapacity] = useState('50');
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const router = useRouter();

  useEffect(() => {
    fetchVenues();
  }, []);

  const fetchVenues = async () => {
    try {
      const res = await fetch('/api/venues');
      const json = await res.json();
      if (json.success) {
        setVenues(json.venues);
      }
    } catch (err) {
      console.error('Failed to fetch venues:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateVenue = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setMsg(null);

    try {
      const rows = ['A', 'B', 'C', 'D', 'E'];
      const seatsPerRow = Math.ceil(parseInt(capacity, 10) / rows.length);

      const res = await fetch('/api/venues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          address,
          capacity: parseInt(capacity, 10),
          rows,
          seatsPerRow,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setMsg('Venue and visual seat layout created successfully!');
        setName('');
        setAddress('');
        fetchVenues();
      } else {
        setMsg(json.message || 'Venue creation failed.');
      }
    } catch (err) {
      setMsg('Network error.');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-400">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        Loading Admin Console...
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
          <Shield className="w-8 h-8 text-indigo-400" /> Admin Console
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Manage platform venues, visual seat grids, and category pricing schemas.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Create Venue Form */}
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-indigo-500/20 space-y-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-400" /> Add New Venue
          </h2>

          {msg && (
            <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>{msg}</span>
            </div>
          )}

          <form onSubmit={handleCreateVenue} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">Venue Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Royal Symphony Hall"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-white text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">Address / Location</label>
              <input
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. 742 Evergreen Terrace"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-white text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">Total Capacity (Seats)</label>
              <input
                type="number"
                required
                min={10}
                max={200}
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-white text-sm focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={creating}
              className="w-full py-3 rounded-xl gradient-button text-white font-semibold text-xs shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 mt-2"
            >
              <PlusCircle className="w-4 h-4" /> {creating ? 'Creating...' : 'Create Venue & Auto Layout'}
            </button>
          </form>
        </div>

        {/* Existing Venues List */}
        <div className="lg:col-span-2 glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Grid className="w-5 h-5 text-indigo-400" /> Platform Venues ({venues.length})
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {venues.map((v) => (
              <div key={v.id} className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-white text-base">{v.name}</h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 uppercase font-mono font-semibold">
                    {v.status}
                  </span>
                </div>
                <p className="text-xs text-slate-400">{v.address}</p>
                <div className="pt-2 flex justify-between text-xs text-slate-300 font-mono border-t border-slate-800/80">
                  <span>Capacity: {v.capacity} Seats</span>
                  <span className="text-indigo-400">{v.seats?.length || 0} Layout Configured</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
