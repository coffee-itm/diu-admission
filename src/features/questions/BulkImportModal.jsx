import { useState } from 'react';
import { Upload, FileText } from 'lucide-react';
import { Modal } from '../../components/ui/Modal.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { toast } from 'sonner';

export function BulkImportModal({ isOpen, onClose, onImport }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleImport = async () => {
    if (!file) return;
    setLoading(true);
    // Simulate parsing and importing
    setTimeout(() => {
      setLoading(false);
      toast.success('Successfully imported 25 questions');
      onImport();
    }, 1500);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Import Questions">
      <div className="space-y-6">
        <div className="bg-blue-50 text-blue-800 p-4 rounded-lg text-sm">
          <p className="font-medium mb-1">CSV Format Requirements:</p>
          <ul className="list-disc list-inside opacity-90 space-y-0.5">
            <li>Headers: <code>Section, Text, OptA, OptB, OptC, OptD, Correct, Diff</code></li>
            <li>Section values: MATH, LOGIC, IT, ENGLISH, BUSINESS</li>
            <li>Correct answer values: a, b, c, d</li>
          </ul>
        </div>

        <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 flex flex-col items-center justify-center bg-slate-50 text-center hover:bg-slate-100 transition-colors">
          <Upload size={32} className="text-slate-400 mb-3" />
          <h3 className="text-sm font-medium text-slate-900 mb-1">Upload CSV file</h3>
          <p className="text-xs text-slate-500 mb-4">Max file size: 5MB</p>
          <label className="cursor-pointer">
            <span className="bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
              Browse Files
            </span>
            <input 
              type="file" 
              accept=".csv" 
              className="hidden" 
              onChange={(e) => setFile(e.target.files[0])}
            />
          </label>
        </div>

        {file && (
          <div className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg">
            <FileText size={20} className="text-blue-500" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">{file.name}</p>
              <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <Button variant="ghost" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleImport} disabled={!file} loading={loading}>
            Import Now
          </Button>
        </div>
      </div>
    </Modal>
  );
}
