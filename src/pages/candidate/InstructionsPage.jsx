import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAntiCheatStore } from '../../store/antiCheatStore.js';
import { AlertTriangle, Clock, ListChecks, CheckCircle2 } from 'lucide-react';
import { ROUTES } from '../../lib/constants.js';
import { mockExamConfig } from '../../data/mockExamConfig.js';
import { Card } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { enterFullscreen } from '../../lib/fullscreen.js';
import { useTestEngine } from '../../features/test/useTestEngine.js';

export function CandidateInstructionsPage() {
  const navigate = useNavigate();
  const [integrityChecked, setIntegrityChecked] = useState(false);
  const { setIntegrityAgreed, reset: resetAntiCheat } = useAntiCheatStore();
  const { startTest, loading } = useTestEngine();

  const handleStart = () => {
    // Must run synchronously inside the click (user gesture) before any await
    enterFullscreen();
    startTest();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 page-enter">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Exam Instructions</h1>
        <p className="text-slate-600">Please read the following rules carefully before starting.</p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <Card className="p-4 flex flex-col items-center text-center">
          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-3">
            <Clock size={20} />
          </div>
          <p className="text-sm text-slate-500 font-medium">Total Time</p>
          <p className="text-lg font-bold text-slate-900">{mockExamConfig.totalTimeMinutes} Minutes</p>
        </Card>
        <Card className="p-4 flex flex-col items-center text-center">
          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-3">
            <ListChecks size={20} />
          </div>
          <p className="text-sm text-slate-500 font-medium">Total Questions</p>
          <p className="text-lg font-bold text-slate-900">50</p>
        </Card>
        <Card className="p-4 flex flex-col items-center text-center">
          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-3">
            <CheckCircle2 size={20} />
          </div>
          <p className="text-sm text-slate-500 font-medium">Passing Marks</p>
          <p className="text-lg font-bold text-slate-900">50%</p>
        </Card>
      </div>

      <Card className="p-8">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Rules & Guidelines</h3>
        <ul className="space-y-3">
          {mockExamConfig.instructions.map((inst, idx) => (
            <li key={idx} className="flex items-start gap-3">
              <div className="mt-1 w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
              <span className="text-slate-700 leading-relaxed">{inst}</span>
            </li>
          ))}
        </ul>

        <div className="mt-8 p-4 bg-amber-50 border border-amber-200 rounded-xl flex gap-3 text-amber-800">
          <AlertTriangle size={20} className="flex-shrink-0" />
          <p className="text-sm">
            <strong>Warning:</strong> Do not refresh the page or press the back button during the exam. Doing so may result in your test being auto-submitted.
          </p>
        </div>
      </Card>

      <Card className="p-6 border-2 border-amber-300 bg-amber-50/50">
        <h3 className="text-lg font-bold text-slate-900 mb-3">Academic Integrity Declaration</h3>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            id="integrity-checkbox"
            checked={integrityChecked}
            onChange={(e) => {
              setIntegrityChecked(e.target.checked);
              if (e.target.checked) {
                resetAntiCheat();
                setIntegrityAgreed();
              }
            }}
            className="mt-1 w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 flex-shrink-0"
          />
          <span className="text-sm text-slate-700 leading-relaxed">
            I hereby declare that I will complete this exam honestly and independently. 
            I will not use AI tools, search engines, external help, or any unauthorized resources. 
            I understand that my activity is being monitored and any violation may result in 
            disqualification. I accept the terms of the academic integrity policy.
          </span>
        </label>
      </Card>

      <div className="flex justify-end gap-4 pt-4">
        <Button variant="ghost" onClick={() => navigate(ROUTES.CANDIDATE_DASHBOARD)} disabled={loading}>
          Cancel
        </Button>
        <Button size="lg" onClick={handleStart} loading={loading} disabled={!integrityChecked}>
          I Agree, Start Test
        </Button>
      </div>
    </div>
  );
}
