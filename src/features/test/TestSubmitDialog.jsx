import { Modal } from '../../components/ui/Modal.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { useTestStore } from '../../store/testStore.js';
import { QUESTION_STATUS } from '../../lib/constants.js';
import { AlertCircle, CheckCircle2, HelpCircle } from 'lucide-react';

export function TestSubmitDialog({ isOpen, onClose, onConfirm, loading }) {
  const { questions, questionStatus } = useTestStore();

  const total = questions.length;
  let answered = 0;
  let flagged = 0;
  let skipped = 0;

  questions.forEach((q) => {
    const s = questionStatus[q.id];
    if (s === QUESTION_STATUS.ANSWERED) answered++;
    else if (s === QUESTION_STATUS.FLAGGED) flagged++;
    else skipped++;
  });

  const isWarning = answered < total;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Confirm Submission" size="md">
      <div className="space-y-6">
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <CheckCircle2 size={16} className="text-green-500" /> Answered
            </span>
            <span className="font-bold text-slate-900">{answered}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <HelpCircle size={16} className="text-red-400" /> Unanswered
            </span>
            <span className="font-bold text-slate-900">{skipped}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <AlertCircle size={16} className="text-yellow-500" /> Flagged for review
            </span>
            <span className="font-bold text-slate-900">{flagged}</span>
          </div>
        </div>

        <p className="text-sm text-slate-600">
          {isWarning ? (
            <span className="text-red-600 font-medium">You have {total - answered} unanswered questions. </span>
          ) : null}
          Are you sure you want to submit your test? Once submitted, you cannot change your answers.
        </p>

        <div className="flex gap-3 justify-end pt-2">
          <Button variant="ghost" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button variant="primary" onClick={onConfirm} loading={loading}>
            Yes, Submit Test
          </Button>
        </div>
      </div>
    </Modal>
  );
}
