import { useState, useEffect } from 'react';
import { Users, CheckCircle, Percent, Activity } from 'lucide-react';
import { analyticsService } from '../../services/analyticsService.js';
import { getAllCandidates } from '../../services/authService.js';
import { resultService } from '../../services/resultService.js';
import { StatCard, Card } from '../../components/ui/Card.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { PageSpinner } from '../../components/ui/Spinner.jsx';
import { formatDateTime } from '../../lib/utils.js';

export function AdminDashboardPage() {
  const [stats, setStats] = useState(null);
  const [recentResults, setRecentResults] = useState([]);
  const [names, setNames] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [summary, allResults] = await Promise.all([
          analyticsService.getSummary(),
          resultService.getAll()
        ]);
        setStats(summary);
        setNames(Object.fromEntries(getAllCandidates().map((c) => [c.id, c.name])));
        
        // Get 5 most recent results
        const sorted = [...allResults].sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
        setRecentResults(sorted.slice(0, 5));
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading || !stats) return <PageSpinner />;

  return (
    <div className="space-y-8 page-enter">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Admin Dashboard</h1>
        <p className="text-slate-600">Overview of the Spring 2026 Admission</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          label="Total Registrations" 
          value={stats.totalRegistrations} 
          icon={<Users size={24} />} 
          color="blue" 
        />
        <StatCard 
          label="Tests Completed" 
          value={stats.totalCompleted} 
          icon={<CheckCircle size={24} />} 
          color="teal" 
        />
        <StatCard 
          label="Pass Rate" 
          value={`${stats.passRate}%`} 
          icon={<Activity size={24} />} 
          color="green" 
        />
        <StatCard 
          label="Average Score" 
          value={`${stats.avgScore}%`} 
          icon={<Percent size={24} />} 
          color="violet" 
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <div className="px-6 py-5 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <h3 className="text-base font-bold text-slate-900">Recent Submissions</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs uppercase border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3 font-semibold">Candidate</th>
                  <th className="px-6 py-3 font-semibold text-center">Score</th>
                  <th className="px-6 py-3 font-semibold text-center">Status</th>
                  <th className="px-6 py-3 font-semibold text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentResults.map(r => (
                  <tr key={r.id}>
                    <td className="px-6 py-3 font-medium text-slate-900">{names[r.candidateId] || r.candidateId}</td>
                    <td className="px-6 py-3 text-center font-bold text-slate-900">{r.percentage}%</td>
                    <td className="px-6 py-3 text-center">
                      <Badge 
                        variant={r.eligibility === 'ELIGIBLE' ? 'success' : r.eligibility === 'NOT_ELIGIBLE' ? 'danger' : 'warning'}
                      >
                        {r.eligibility.replaceAll('_', ' ')}
                      </Badge>
                    </td>
                    <td className="px-6 py-3 text-right text-xs text-slate-500">
                      {formatDateTime(r.submittedAt)}
                    </td>
                  </tr>
                ))}
                {recentResults.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-slate-500">No results found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <div className="px-6 py-5 border-b border-slate-100">
            <h3 className="text-base font-bold text-slate-900">System Status</h3>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-100">
              <span className="text-sm font-medium text-green-800">Test Engine</span>
              <span className="flex w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse" />
            </div>
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-100">
              <span className="text-sm font-medium text-green-800">Mock API Layer</span>
              <span className="flex w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse" />
            </div>
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-100">
              <span className="text-sm font-medium text-blue-800">Database (Local)</span>
              <span className="text-xs font-bold text-blue-600">Active</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
