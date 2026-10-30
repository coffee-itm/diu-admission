import { Edit, Trash2, Eye } from 'lucide-react';
import { Badge } from '../../components/ui/Badge.jsx';
import { SECTIONS, DIFFICULTY } from '../../lib/constants.js';
import { truncate } from '../../lib/utils.js';

export function QuestionTable({ questions, onEdit, onDelete, onView }) {
  if (!questions?.length) {
    return (
      <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
        <p className="text-slate-500">No questions found matching criteria.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto bg-white rounded-xl border border-slate-200 shadow-sm">
      <table className="w-full text-left text-sm text-slate-600">
        <thead className="text-xs text-slate-700 uppercase bg-slate-50 border-b border-slate-200">
          <tr>
            <th className="px-4 py-3 font-semibold">ID</th>
            <th className="px-4 py-3 font-semibold">Section</th>
            <th className="px-4 py-3 font-semibold">Question Text</th>
            <th className="px-4 py-3 font-semibold text-center">Difficulty</th>
            <th className="px-4 py-3 font-semibold text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {questions.map((q) => {
            const sec = SECTIONS[q.section];
            const diff = DIFFICULTY[q.difficulty];
            return (
              <tr key={q.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-slate-500 whitespace-nowrap" title={q.id}>{q.id}</td>
                <td className="px-4 py-3">
                  <Badge variant={sec?.bg.replace('bg-', '').replace('-100', '')}>{sec?.shortName}</Badge>
                </td>
                <td className="px-4 py-3 text-slate-900 font-medium max-w-md" title={q.text}>
                  {truncate(q.text, 60)}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${diff?.bg} ${diff?.color}`}>
                    {diff?.label}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => onView?.(q)} className="p-1.5 text-slate-400 hover:text-blue-600 rounded hover:bg-blue-50" title="View Details">
                      <Eye size={16} />
                    </button>
                    <button onClick={() => onEdit?.(q)} className="p-1.5 text-slate-400 hover:text-amber-600 rounded hover:bg-amber-50" title="Edit">
                      <Edit size={16} />
                    </button>
                    <button onClick={() => onDelete?.(q.id)} className="p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-red-50" title="Delete">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
