import { cn } from '../../lib/utils.js';

export function Spinner({ size = 'md', className }) {
  const sizes = { sm: 'w-4 h-4 border-2', md: 'w-6 h-6 border-2', lg: 'w-10 h-10 border-3', xl: 'w-16 h-16 border-4' };
  return (
    <div
      role="status"
      aria-label="Loading"
      className={cn('rounded-full border-blue-200 border-t-blue-700 animate-spin', sizes[size], className)}
    />
  );
}

export function PageSpinner() {
  return (
    <div className="flex flex-col items-center justify-center min-h-64 gap-3">
      <Spinner size="lg" />
      <p className="text-sm text-slate-500 animate-pulse">Loading…</p>
    </div>
  );
}
