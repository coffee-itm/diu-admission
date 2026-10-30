import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { FileDown, Home } from 'lucide-react';
import { ROUTES } from '../../lib/constants.js';
import { useAuthStore } from '../../store/authStore.js';
import { testService } from '../../services/testService.js';
import { ScoreCard } from '../../features/scoring/ScoreCard.jsx';
import { EligibilityBadge } from '../../features/scoring/EligibilityBadge.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { PageSpinner } from '../../components/ui/Spinner.jsx';
import { generatePdfReport } from '../../lib/pdfGenerator.js';
import { useExamConfigStore } from '../../store/examConfigStore.js';
import { motion } from 'framer-motion';

export function CandidateResultPage() {
  const { user } = useAuthStore();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchResult = async () => {
      try {
        const res = await testService.getResultForCandidate(user.id);
        if (!res) {
          navigate(ROUTES.CANDIDATE_DASHBOARD, { replace: true });
        } else {
          setResult(res);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchResult();
  }, [user.id, navigate]);

  const handleDownload = () => {
    generatePdfReport(user, result, useExamConfigStore.getState().config.title);
  };

  if (loading || !result) return <PageSpinner />;

  return (
    <div className="max-w-4xl mx-auto space-y-8 page-enter">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Your Test Results</h1>
          <p className="text-slate-600">Performance report for {user.name}</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleDownload} leftIcon={<FileDown size={18} />}>
            Download PDF
          </Button>
          <Button as={Link} to={ROUTES.CANDIDATE_DASHBOARD} leftIcon={<Home size={18} />}>
            Dashboard
          </Button>
        </div>
      </div>

      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}>
        <EligibilityBadge status={result.eligibility} className="py-10" />
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <ScoreCard result={result} />
      </motion.div>
    </div>
  );
}
