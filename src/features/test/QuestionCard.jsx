import { motion } from 'framer-motion';
import { cn } from '../../lib/utils.js';

export function QuestionCard({ question, selectedOptionId, onSelect }) {
  if (!question) return null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-full">
      <div className="p-6 md:p-8 border-b border-slate-100 flex-1">
        <h3 className="text-lg md:text-xl font-medium text-slate-900 leading-relaxed">
          {question.text}
        </h3>
      </div>
      
      <div className="p-6 md:p-8 bg-slate-50 flex flex-col gap-3">
        {question.options.map((option, index) => {
          const isSelected = selectedOptionId === option.id;
          const letter = String.fromCharCode(65 + index); // A, B, C, D
          
          return (
            <label
              key={option.id}
              className={cn(
                'group relative flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all duration-200',
                isSelected
                  ? 'border-blue-600 bg-blue-50/50'
                  : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50'
              )}
            >
              <input
                type="radio"
                name={`q-${question.id}`}
                value={option.id}
                checked={isSelected}
                onChange={() => onSelect(option.id)}
                className="sr-only"
                aria-label={`Option ${letter}: ${option.text}`}
              />
              
              <div className={cn(
                'flex items-center justify-center w-8 h-8 rounded-lg text-sm font-semibold mr-4 transition-colors',
                isSelected
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-700'
              )}>
                {letter}
              </div>
              
              <span className={cn(
                'text-base font-medium flex-1',
                isSelected ? 'text-slate-900' : 'text-slate-700'
              )}>
                {option.text}
              </span>

              {isSelected && (
                <motion.div
                  layoutId="outline"
                  className="absolute inset-0 border-2 border-blue-600 rounded-xl"
                  initial={false}
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                />
              )}
            </label>
          );
        })}
      </div>
    </div>
  );
}
