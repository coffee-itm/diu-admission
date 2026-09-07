import { Timer as TimerIcon, AlertTriangle } from 'lucide-react';
import { formatTime } from '../../lib/utils.js';
import { TIMER_WARNING_THRESHOLD } from '../../lib/constants.js';
import { cn } from '../../lib/utils.js';

export function Timer({ seconds, className }) {
  const isCritical = seconds <= TIMER_WARNING_THRESHOLD;
  const isUrgent = seconds <= 60;

  return (
    <div
      id="exam-timer"
      className={cn(
        'flex items-center gap-2 px-4 py-2 rounded-xl font-mono font-bold transition-all duration-300',
        isCritical
          ? isUrgent
            ? 'bg-red-100 text-red-700 timer-critical border border-red-300'
            : 'bg-orange-100 text-orange-700 border border-orange-300'
          : 'bg-slate-100 text-slate-700 border border-slate-200',
        className
      )}
      role="timer"
      aria-label={`Time remaining: ${formatTime(seconds)}`}
      aria-live="polite"
    >
      {isCritical ? <AlertTriangle size={16} /> : <TimerIcon size={16} />}
      <span className="text-lg tracking-widest">{formatTime(seconds)}</span>
    </div>
  );
}
