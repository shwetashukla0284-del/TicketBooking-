'use client';

import { useState, useEffect } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';

interface HoldTimerProps {
  expiresAt: string | Date;
  onExpire?: () => void;
}

export default function HoldTimer({ expiresAt, onExpire }: HoldTimerProps) {
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const targetTime = new Date(expiresAt).getTime();

    const updateTimer = () => {
      const now = new Date().getTime();
      const diff = Math.max(0, Math.floor((targetTime - now) / 1000));

      setTimeLeft(diff);

      if (diff <= 0 && !isExpired) {
        setIsExpired(true);
        if (onExpire) onExpire();
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, isExpired, onExpire]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const isUrgent = timeLeft < 120; // less than 2 minutes

  if (isExpired) {
    return (
      <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center justify-center gap-2 animate-pulse">
        <AlertTriangle className="w-4 h-4 text-rose-400" />
        <span>Seat hold expired! Your seats have been released.</span>
      </div>
    );
  }

  return (
    <div
      className={`px-4 py-2.5 rounded-xl border flex items-center justify-between text-sm ${
        isUrgent
          ? 'bg-rose-500/10 border-rose-500/40 text-rose-300 animate-pulse'
          : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
      }`}
    >
      <div className="flex items-center gap-2">
        <Clock className="w-4 h-4" />
        <span className="text-xs font-medium">Temporary Seat Hold Expiry:</span>
      </div>
      <span className="font-mono font-bold text-base tracking-wider">{formattedTime}</span>
    </div>
  );
}
