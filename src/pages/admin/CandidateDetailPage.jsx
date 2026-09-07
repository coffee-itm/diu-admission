import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ArrowLeft, FileDown, Calendar, Clock, ShieldAlert, Eye, Copy, Mouse, Keyboard } from 'lucide-react';
import { ROUTES } from '../../lib/constants.js';
import { resultService } from '../../services/resultService.js';
import { mockCandidates } from '../../data/mockCandidates.js';
import { ScoreCard } from '../../features/scoring/ScoreCard.jsx';
import { EligibilityBadge } from '../../features/scoring/EligibilityBadge.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { PageSpinner } from '../../components/ui/Spinner.jsx';
import { formatDateTime, formatTime } from '../../lib/utils.js';
import { generatePdfReport } from '../../lib/pdfGenerator.js';

export function CandidateDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [result, setResult] = useState(null);
  const [candidate, setCandidate] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResult = async () => {
      try {
        const c = mockCandidates.find(x => x.id === id);
        if (!c) {
          navigate(ROUTES.ADMIN_CANDIDATES);
          return;
        }
        setCandidate(c);
        
        const r = await resultService.getResultForCandidate(id);
        if (!r) {
          navigate(ROUTES.ADMIN_CANDIDATES);
          return;
        }
        setResult(r);
      } finally {
        setLoading(false);
      }
    };
    fetchResult();
  }, [id, navigate]);

  if (loading || !result || !candidate) return <PageSpinner />;

  return (
    <div className="max-w-4xl mx-auto space-y-6 page-enter">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(ROUTES.ADMIN_CANDIDATES)} leftIcon={<ArrowLeft size={18} />}>
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{candidate.name}'s Report</h1>
            <p className="text-slate-600 text-sm font-mono">{candidate.id}</p>
          </div>
        </div>
        <Button variant="outline" onClick={() => generatePdfReport(candidate, result)} leftIcon={<FileDown size={18} />}>
          Export PDF
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
            <Calendar size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Submitted At</p>
            <p className="text-base font-bold text-slate-900">{formatDateTime(result.submittedAt)}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Time Taken</p>
            <p className="text-base font-bold text-slate-900">{formatTime(result.timeTaken)}</p>
          </div>
        </div>
      </div>

      <EligibilityBadge status={result.eligibility} className="py-8" />
      <ScoreCard result={result} />

      {/* Security Report */}
      {result.antiCheat && (
        <Card className="p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <ShieldAlert size={20} className="text-red-600" />
            Security Report
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="p-3 bg-slate-50 rounded-lg text-center">
              <Eye size={18} className="mx-auto mb-1 text-slate-500" />
              <p className="text-2xl font-bold text-slate-900">{result.antiCheat.tabSwitchCount}</p>
              <p className="text-xs text-slate-500">Tab Switches</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg text-center">
              <Copy size={18} className="mx-auto mb-1 text-slate-500" />
              <p className="text-2xl font-bold text-slate-900">{result.antiCheat.copyAttemptCount}</p>
              <p className="text-xs text-slate-500">Copy Attempts</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg text-center">
              <Mouse size={18} className="mx-auto mb-1 text-slate-500" />
              <p className="text-2xl font-bold text-slate-900">{result.antiCheat.rightClickCount}</p>
              <p className="text-xs text-slate-500">Right Clicks</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg text-center">
              <Keyboard size={18} className="mx-auto mb-1 text-slate-500" />
              <p className="text-2xl font-bold text-slate-900">{result.antiCheat.blockedKeyCount}</p>
              <p className="text-xs text-slate-500">Blocked Keys</p>
            </div>
          </div>

          {/* Risk Level Badge */}
          {(() => {
            const total = result.antiCheat.totalViolations || 0;
            let level = 'Low Risk';
            let color = 'bg-green-100 text-green-800';
            if (total >= 10) { level = 'High Risk'; color = 'bg-red-100 text-red-800'; }
            else if (total >= 4) { level = 'Medium Risk'; color = 'bg-yellow-100 text-yellow-800'; }
            return (
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold ${color}`}>
                <ShieldAlert size={14} />
                {level} — {total} total violations
              </div>
            );
          })()}

          {/* Event Log */}
          {result.antiCheat.securityEvents?.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-semibold text-slate-700 mb-2">Event Log</h4>
              <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr>
                      <th className="text-left p-2 font-medium text-slate-600">Time</th>
                      <th className="text-left p-2 font-medium text-slate-600">Event</th>
                      <th className="text-left p-2 font-medium text-slate-600">Detail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.antiCheat.securityEvents.map((evt, i) => (
                      <tr key={i} className="border-t border-slate-100">
                        <td className="p-2 font-mono text-slate-500">
                          {new Date(evt.timestamp).toLocaleTimeString()}
                        </td>
                        <td className="p-2 font-medium text-slate-700">{evt.type.replace(/_/g, ' ')}</td>
                        <td className="p-2 text-slate-500">{evt.detail}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
