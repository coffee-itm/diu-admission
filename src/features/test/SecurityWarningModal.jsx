import { Modal } from '../../components/ui/Modal.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { ShieldAlert } from 'lucide-react';
import { isFullscreenSupported, isFullscreenActive } from '../../lib/fullscreen.js';

export function SecurityWarningModal({ isOpen, message, onDismiss, onReturnToFullscreen }) {
  return (
    <Modal isOpen={isOpen} onClose={onDismiss} title="⚠️ Security Warning" size="md" hideClose>
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
          <ShieldAlert size={24} className="text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800 leading-relaxed">{message}</p>
        </div>
        <p className="text-sm text-slate-600">
          Any suspicious activity is being logged and will be reviewed by the exam administrator. 
          Continued violations will result in automatic test submission.
        </p>
        <div className="flex flex-wrap justify-end gap-3 pt-2">
          {onReturnToFullscreen && isFullscreenSupported() && !isFullscreenActive() && (
            <Button id="security-return-fullscreen" variant="secondary" onClick={onReturnToFullscreen}>
              Return to fullscreen
            </Button>
          )}
          <Button id="security-dismiss" variant="primary" onClick={onDismiss}>
            I Understand, Continue Test
          </Button>
        </div>
      </div>
    </Modal>
  );
}
