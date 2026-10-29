import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { PlayCircle, CheckCircle, Clock, Calendar } from 'lucide-react';
import { ROUTES } from '../../lib/constants.js';
import { useAuthStore } from '../../store/authStore.js';
import { testService } from '../../services/testService.js';
import { Card } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { useExamConfigStore } from '../../store/examConfigStore.js';
import { formatDateTime } from '../../lib/utils.js';

export function CandidateDashboardPage() {
  const { user } = useAuthStore();
  const config = useExamConfigStore((s) => s.config);
  const totalQuestions = config.sections.reduce((sum, s) => sum + s.questionCount, 0);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResult = async () => {
      try {
        const res = await testService.getResultForCandidate(user.id);
        setResult(res);
      } finally {
        setLoading(false);
      }
    };
    fetchResult();
  }, [user.id]);

  if (loading) return null;

  return (
    <div className="space-y-8 page-enter">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Welcome, {user.name}</h1>
        <p className="text-slate-600">Here is your admission application status.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <div className="p-8">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-1">{config.title}</h2>
                <div className="flex items-center gap-3 text-sm text-slate-500 mt-2">
                  <span className="flex items-center gap-1"><Clock size={14} /> {config.totalTimeMinutes} Minutes</span>
                  <span className="flex items-center gap-1"><Calendar size={14} /> {totalQuestions} Questions</span>
                </div>
              </div>
              {result ? (
                <Badge variant="success" size="lg" className="gap-2">
                  <CheckCircle size={16} /> Completed
                </Badge>
              ) : (
                <Badge variant="warning" size="lg">Pending</Badge>
              )}
            </div>

            <p className="text-slate-600 mb-8 max-w-lg">
              {result 
                ? "You have successfully completed the admission exam. You can view your detailed performance report."
                : "You are required to complete this assessment as part of the admission process. Make sure you are in a quiet environment with a stable internet connection before starting."}
            </p>

            {result ? (
              <Button as={Link} to={ROUTES.CANDIDATE_RESULT} size="lg">
                View Full Result
              </Button>
            ) : (
              <Button as={Link} to={ROUTES.CANDIDATE_INSTRUCTIONS} size="lg" leftIcon={<PlayCircle size={18} />}>
                Read Instructions & Start
              </Button>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Profile Summary</h3>
          <div className="space-y-4">
            <div>
              <p className="text-xs text-slate-500 font-medium">Applicant Name</p>
              <p className="text-sm font-medium text-slate-900 mt-0.5">{user.name}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Email Address</p>
              <p className="text-sm font-medium text-slate-900 mt-0.5">{user.email}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Phone Number</p>
              <p className="text-sm font-medium text-slate-900 mt-0.5">{user.phone}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Registered On</p>
              <p className="text-sm font-medium text-slate-900 mt-0.5">{formatDateTime(user.registeredAt)}</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
