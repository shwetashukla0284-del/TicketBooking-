import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'SeatSync — Ticket Booking System',
  description: 'Book movie and concert tickets with real-time visual seat map selection, temporary holds, and automated waitlist reallocation.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased selection:bg-indigo-500 selection:text-white">
        <Navbar />
        <main className="min-h-[calc(100vh-4rem)]">{children}</main>
        <footer className="glass-panel border-t border-slate-800/80 py-8 mt-16 text-center text-xs text-slate-500">
          <div className="max-w-7xl mx-auto px-4">
            <p>SeatSync Ticket Booking Platform &copy; 2026. Powered by Next.js & Prisma.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
