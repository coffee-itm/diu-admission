import { useState, useEffect } from 'react';
import { Download, Award } from 'lucide-react';
import { resultService } from '../../services/resultService.js';
import { Button } from '../../components/ui/Button.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { PageSpinner } from '../../components/ui/Spinner.jsx';
import { toast } from 'sonner';
import { toCSV, downloadCSV } from '../../lib/csvExport.js';
import {
  MERIT_COLUMNS,
  MERIT_ELIGIBILITY_FILTERS,
  DEFAULT_MERIT_FILTER,
  buildMeritRows,
  filterMeritByEligibility,
} from '../../lib/meritCsv.js';
import { getAllCandidates } from '../../services/authService.js';

const MERIT_SUBTITLES = {
  eligible_conditional: 'Ranked list of eligible and conditionally eligible candidates.',
  ELIGIBLE: 'Ranked list showing eligible candidates only.',
  CONDITIONALLY_ELIGIBLE: 'Ranked list showing conditionally eligible candidates only.',
  NOT_ELIGIBLE: 'Ranked list showing not eligible candidates only.',
  all: 'Ranked list of all candidates, whatever their eligibility.',
};

const badgeVariant = (eligibility) => {
  if (eligibility === 'ELIGIBLE') return 'success';
  if (eligibility === 'CONDITIONALLY_ELIGIBLE') return 'warning';
  return 'danger';
};

export function MeritListPage() {
  const [meritList, setMeritList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState(DEFAULT_MERIT_FILTER);

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

  // Ranks come from the full list, so filtering hides rows without re-ranking.
  const rows = buildMeritRows(meritList, getAllCandidates());
  const visibleRows = filterMeritByEligibility(rows, filter);

  const exportCSV = () => {
    const exportRows = filterMeritByEligibility(buildMeritRows(meritList, getAllCandidates()), filter);
    if (exportRows.length === 0) {
      toast.info('Nothing to export for this filter');
      return;
    }
    const date = new Date().toISOString().slice(0, 10);
    downloadCSV(`DIU_Merit_List_${date}.csv`, toCSV(exportRows, MERIT_COLUMNS));
    toast.success('Merit list exported as CSV');
  };

  if (loading) return <PageSpinner />;

  return (
    <div className="space-y-6 page-enter">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Merit List</h1>
          <p className="text-slate-600">{MERIT_SUBTITLES[filter]}</p>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <select
            id="merit-eligibility-filter"
            aria-label="Filter by eligibility"
            className="w-full sm:w-60 h-[42px] px-3 rounded-lg border border-slate-300 bg-white text-sm focus:ring-2 focus:ring-blue-500"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            {MERIT_ELIGIBILITY_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
          <Button id="merit-export-csv" onClick={exportCSV} leftIcon={<Download size={18} />}>
            Export CSV
          </Button>
        </div>
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
              {visibleRows.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className={`mx-auto flex items-center justify-center w-8 h-8 rounded-full font-bold ${
                      item.rank === 1 ? 'bg-yellow-100 text-yellow-700' :
                      item.rank === 2 ? 'bg-slate-200 text-slate-700' :
                      item.rank === 3 ? 'bg-orange-100 text-orange-700' : 'bg-slate-50 text-slate-500'
                    }`}>
                      {item.rank}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-bold text-slate-900 flex items-center gap-2">
                      {item.candidateName}
                      {item.rank <= 3 && <Award size={16} className={item.rank === 1 ? 'text-yellow-500' : item.rank === 2 ? 'text-slate-400' : 'text-orange-400'} />}
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
                    <Badge variant={badgeVariant(item.eligibility)}>
                      {item.eligibility.replaceAll('_', ' ')}
                    </Badge>
                  </td>
                </tr>
              ))}
              {visibleRows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    {meritList.length === 0 ? 'No results yet' : 'No candidates match this eligibility filter'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
