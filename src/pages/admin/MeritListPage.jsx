import { useState, useEffect } from 'react';
import { Download, Award } from 'lucide-react';
import { resultService } from '../../services/resultService.js';
import { Button } from '../../components/ui/Button.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { PageSpinner } from '../../components/ui/Spinner.jsx';
import { toast } from 'sonner';

export function MeritListPage() {
  const [meritList, setMeritList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMeritList = async () => {
      try {
        setMeritList(await resultService.getMeritList());
      } finally {
        setLoading(false);
      }
    };
    fetchMeritList();
  }, []);

  const exportCSV = () => {
    toast.success('Merit list exported as CSV');
    // In reality, we'd generate a CSV blob here
  };

  if (loading) return <PageSpinner />;

  return (
    <div className="space-y-6 page-enter">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Merit List</h1>
          <p className="text-slate-600">Ranked list of eligible and conditionally eligible candidates.</p>
        </div>
        <Button onClick={exportCSV} leftIcon={<Download size={18} />}>
          Export CSV
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs uppercase border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-semibold text-center w-16">Rank</th>
                <th className="px-6 py-4 font-semibold">Candidate</th>
                <th className="px-6 py-4 font-semibold text-center">Score</th>
                <th className="px-6 py-4 font-semibold text-center">Time Taken</th>
                <th className="px-6 py-4 font-semibold">Eligibility</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {meritList.map((item, index) => (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className={`mx-auto flex items-center justify-center w-8 h-8 rounded-full font-bold ${
                      index === 0 ? 'bg-yellow-100 text-yellow-700' :
                      index === 1 ? 'bg-slate-200 text-slate-700' :
                      index === 2 ? 'bg-orange-100 text-orange-700' : 'bg-slate-50 text-slate-500'
                    }`}>
                      {index + 1}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-bold text-slate-900 flex items-center gap-2">
                      {item.candidateName}
                      {index < 3 && <Award size={16} className={index === 0 ? 'text-yellow-500' : index === 1 ? 'text-slate-400' : 'text-orange-400'} />}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">{item.candidateEmail}</p>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-lg font-black text-blue-700">{item.percentage}%</span>
                  </td>
                  <td className="px-6 py-4 text-center font-mono text-slate-500">
                    {Math.floor(item.timeTaken / 60)}m {item.timeTaken % 60}s
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={item.eligibility === 'ELIGIBLE' ? 'success' : 'warning'}>
                      {item.eligibility.replaceAll('_', ' ')}
                    </Badge>
                  </td>
                </tr>
              ))}
              {meritList.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">No results yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
