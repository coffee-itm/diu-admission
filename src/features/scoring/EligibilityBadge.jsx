import { ELIGIBILITY } from '../../lib/constants.js';
import { CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import { cn } from '../../lib/utils.js';

const iconMap = {
  CheckCircle,
  AlertCircle,
  XCircle,
};

export function EligibilityBadge({ status, className }) {
  if (!status) return null;
  const def = ELIGIBILITY[status];
  if (!def) return null;

  const Icon = iconMap[def.icon];

  return (
    <div className={cn('rounded-xl border p-6 flex flex-col items-center text-center gap-3', def.bg, def.border, className)}>
      <div className={cn('p-3 bg-white/60 rounded-full', def.color)}>
        <Icon size={32} strokeWidth={2.5} />
      </div>
      <div>
        <h2 className={cn('text-xl font-bold mb-1', def.color)}>
          {def.label}
        </h2>
        <p className={cn('text-sm opacity-90', def.color)}>
          {def.description}
        </p>
      </div>
    </div>
  );
}
