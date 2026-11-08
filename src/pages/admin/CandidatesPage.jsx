import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Search, Eye } from 'lucide-react';
import { ROUTES } from '../../lib/constants.js';
import { resultService } from '../../services/resultService.js';
import { getAllCandidates } from '../../services/authService.js';
import { Input } from '../../components/ui/Input.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { PageSpinner } from '../../components/ui/Spinner.jsx';

export function CandidatesPage() {
  const navigate = useNavigate();
  const [candidates, setCandidates] = useState([]);
  const [resultsMap, setResultsMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const allResults = await resultService.getAll();
        const rMap = {};
        allResults.forEach(r => { rMap[r.candidateId] = r; });
        setResultsMap(rMap);
        
        setCandidates(getAllCandidates());
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filtered = candidates.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <PageSpinner />;

  return (
    <div className="space-y-6 page-enter">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Registered Candidates</h1>
        <p className="text-slate-600">View applicant profiles and their test status</p>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <Input 
          id="candidates-search"
          placeholder="Search by name or email..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          leftIcon={<Search size={18} />}
        />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs uppercase border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 font-semibold">Name</th>
                <th className="px-6 py-3 font-semibold">Contact Info</th>
                <th className="px-6 py-3 font-semibold text-center">Status</th>
                <th className="px-6 py-3 font-semibold text-center">Score</th>
                <th className="px-6 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(c => {
                const result = resultsMap[c.id];
                return (
                  <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-900">{c.name}</p>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">ID: {c.id.slice(0, 8)}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-slate-700">{c.email}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{c.phone}</p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {result ? (
                        <Badge variant={result.eligibility === 'ELIGIBLE' ? 'success' : result.eligibility === 'NOT_ELIGIBLE' ? 'danger' : 'warning'}>
                          {result.eligibility.replace('_', ' ')}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Pending Test</Badge>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {result ? (
                        <span className="font-bold text-slate-900">{result.percentage}%</span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {result && (
                        <button 
                          id={`candidate-${c.id}-view`}
                          onClick={() => navigate(`${ROUTES.ADMIN_CANDIDATES}/${c.id}`)}
                          className="p-2 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors inline-flex items-center"
                          title="View detailed result"
                        >
                          <Eye size={18} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">No candidates found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
