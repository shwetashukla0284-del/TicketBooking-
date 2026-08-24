'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Ticket, Film, Music, Shield, Calendar, LogOut, User, LayoutDashboard, PlusCircle } from 'lucide-react';

export default function Navbar() {
  const [user, setUser] = useState<any>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setUser(data.user);
        }
      })
      .catch(() => {});
  }, [pathname]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    router.push('/login');
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center shadow-lg shadow-indigo-500/30 group-hover:scale-105 transition-transform">
            <Ticket className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-xl font-bold tracking-tight text-white">
              Seat<span className="gradient-text">Sync</span>
            </span>
            <span className="hidden sm:block text-[10px] text-slate-400 font-mono tracking-wider uppercase">
              Ticket Booking System
            </span>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          <Link
            href="/"
            className={`flex items-center gap-2 transition-colors ${
              pathname === '/' ? 'text-indigo-400' : 'text-slate-300 hover:text-white'
            }`}
          >
            <Film className="w-4 h-4" /> Browse Events
          </Link>

          {user && (
            <Link
              href="/bookings"
              className={`flex items-center gap-2 transition-colors ${
                pathname === '/bookings' ? 'text-indigo-400' : 'text-slate-300 hover:text-white'
              }`}
            >
              <Calendar className="w-4 h-4" /> My Tickets
            </Link>
          )}

          {(user?.role === 'ORGANISER' || user?.role === 'ADMIN') && (
            <Link
              href="/organiser"
              className={`flex items-center gap-2 transition-colors ${
                pathname.startsWith('/organiser') ? 'text-indigo-400' : 'text-slate-300 hover:text-white'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" /> Organiser Hub
            </Link>
          )}

          {user?.role === 'ADMIN' && (
            <Link
              href="/admin"
              className={`flex items-center gap-2 transition-colors ${
                pathname.startsWith('/admin') ? 'text-indigo-400' : 'text-slate-300 hover:text-white'
              }`}
            >
              <Shield className="w-4 h-4" /> Admin Console
            </Link>
          )}
        </nav>

        {/* Right Side Actions & User Menu */}
        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-sm font-semibold text-slate-200">{user.name}</span>
                <span className="text-xs text-indigo-400 font-mono uppercase">{user.role}</span>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800/60 transition-colors"
                title="Log Out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="px-4 py-2 text-sm font-semibold text-slate-300 hover:text-white transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="px-4 py-2 text-sm font-semibold text-white gradient-button rounded-xl shadow-lg shadow-indigo-500/20"
              >
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
