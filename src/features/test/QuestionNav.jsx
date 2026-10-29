import { Flag } from 'lucide-react';
import { useTestStore } from '../../store/testStore.js';
import { QUESTION_STATUS } from '../../lib/constants.js';
import { cn } from '../../lib/utils.js';

export function QuestionNav({ questions, currentIndex, onSelect }) {
  const { questionStatus } = useTestStore();

  const getStatusColor = (status, isCurrent) => {
    if (isCurrent) return 'ring-2 ring-offset-2 ring-blue-500 border-blue-500 bg-blue-50 text-blue-700 font-bold';
    switch (status) {
      case QUESTION_STATUS.ANSWERED: return 'bg-green-500 text-white border-green-600';
      case QUESTION_STATUS.SKIPPED: return 'bg-red-100 text-red-700 border-red-200';
      case QUESTION_STATUS.FLAGGED: return 'bg-yellow-400 text-yellow-900 border-yellow-500';
      default: return 'bg-white text-slate-500 border-slate-200 hover:border-slate-300';
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 h-full flex flex-col">
      <h3 className="text-sm font-semibold text-slate-700 mb-4 uppercase tracking-wider">Question Navigator</h3>
      
      <div className="grid grid-cols-5 gap-2 md:grid-cols-4 lg:grid-cols-5 flex-1 content-start">
        {questions.map((q, idx) => {
          const status = questionStatus[q.id];
          const isCurrent = idx === currentIndex;
          return (
            <button
              key={q.id}
              onClick={() => onSelect(idx)}
              className={cn(
                'relative w-10 h-10 rounded-lg border text-sm transition-all duration-200 flex items-center justify-center',
                getStatusColor(status, isCurrent)
              )}
              aria-label={`Question ${idx + 1}, status: ${status}`}
              aria-current={isCurrent ? 'step' : undefined}
            >
              {idx + 1}
              {status === QUESTION_STATUS.FLAGGED && !isCurrent && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full border border-white flex items-center justify-center">
                  <Flag size={8} className="text-yellow-900" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-6 pt-4 border-t border-slate-100 space-y-2 text-xs font-medium text-slate-600">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500" /> Answered
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-100 border border-red-200" /> Skipped
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-yellow-400" /> Flagged
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-white border border-slate-300" /> Not Visited
        </div>
      </div>
    </div>
  );
}
