import { useTestStore } from '../../store/testStore.js';
import { SECTIONS, SECTION_ORDER } from '../../lib/constants.js';
import { cn } from '../../lib/utils.js';

export function SectionHeader({ currentSectionId, onSectionChange }) {
  const { questions, answers } = useTestStore();

  const getSectionStats = (sid) => {
    const secQuestions = questions.filter((q) => q.section === sid);
    let answered = 0;
    secQuestions.forEach((q) => {
      if (answers[q.id]) answered++;
    });
    return { answered, total: secQuestions.length };
  };

  return (
    <div className="flex overflow-x-auto hide-scrollbar gap-2 pb-2">
      {SECTION_ORDER.map((sid) => {
        // Find if this section exists in exam config
        const exists = questions.some(q => q.section === sid);
        if (!exists) return null;

        const isCurrent = currentSectionId === sid;
        const sectionDef = SECTIONS[sid];
        const stats = getSectionStats(sid);
        const isComplete = stats.answered === stats.total && stats.total > 0;

        return (
          <button
            key={sid}
            onClick={() => onSectionChange(sid)}
            className={cn(
              'flex-shrink-0 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all duration-200 flex flex-col gap-1 items-start min-w-[140px]',
              isCurrent
                ? `border-${sectionDef.bg.split('-')[1]}-400 ${sectionDef.bg} ${sectionDef.text} shadow-sm ring-1 ring-${sectionDef.bg.split('-')[1]}-400`
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300'
            )}
            aria-current={isCurrent ? 'page' : undefined}
          >
            <span className="truncate w-full text-left">{sectionDef.shortName}</span>
            <div className="flex items-center gap-1.5 w-full">
              <div className="flex-1 h-1.5 bg-black/10 rounded-full overflow-hidden">
                <div 
                  className={cn("h-full rounded-full transition-all duration-300", isCurrent ? 'bg-current opacity-60' : 'bg-blue-500')} 
                  style={{ width: `${stats.total ? (stats.answered / stats.total) * 100 : 0}%` }} 
                />
              </div>
              <span className={cn("text-[10px] font-bold tracking-wider", isComplete && !isCurrent ? 'text-green-600' : 'opacity-70')}>
                {stats.answered}/{stats.total}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
