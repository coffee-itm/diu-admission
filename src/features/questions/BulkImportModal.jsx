import { useState } from 'react';
import { Upload, FileText, Download } from 'lucide-react';
import { Modal } from '../../components/ui/Modal.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { toast } from 'sonner';
import { parseCSVDetailed } from '../../lib/csvParse.js';
import { mapRows } from './importQuestions.js';
import { useQuestionStore } from '../../store/questionStore.js';

const MAX_BYTES = 2 * 1024 * 1024;

export function BulkImportModal({ isOpen, onClose, onImport }) {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [fileError, setFileError] = useState('');

  const reset = () => {
    setFile(null);
    setResult(null);
    setFileError('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFile = async (e) => {
    const f = e.target.files[0];
    reset();
    if (!f) return;
    setFile(f);
    if (f.size > MAX_BYTES) {
      setFileError('File is larger than 2 MB');
      return;
    }
    try {
      const { rows, error } = parseCSVDetailed(await f.text());
      if (error) {
        setResult({ valid: [], errors: [{ row: error.line, messages: [error.message] }] });
      } else {
        setResult(mapRows(rows));
      }
    } catch {
      setFileError('Could not read this file');
    }
  };

  const handleImport = () => {
    if (!result || result.valid.length === 0) return;
    const { create } = useQuestionStore.getState();
    result.valid.forEach((q) => create(q));
    toast.success(`Imported ${result.valid.length} questions`);
    reset();
    onImport();
  };

  const validCount = result?.valid.length ?? 0;
  const errorCount = result?.errors.length ?? 0;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Import Questions">
      <div className="space-y-6">
        <div className="bg-blue-50 text-blue-800 p-4 rounded-lg text-sm">
          <p className="font-medium mb-1">CSV Format Requirements:</p>
          <ul className="list-disc list-inside opacity-90 space-y-0.5">
            <li className="break-words">Headers: <code>section,text,option_a,option_b,option_c,option_d,correct_answer,difficulty,explanation,tags</code></li>
            <li>Section values: MATH, LOGIC, IT, ENGLISH, BUSINESS</li>
            <li>Correct answer values: a, b, c, d. Tags separated by |</li>
          </ul>
          <a
            id="bulk-import-template"
            href="/samples/questions-template.csv"
            download
            className="inline-flex items-center gap-1 mt-2 font-medium underline focus-visible:outline-2"
          >
            <Download size={14} aria-hidden="true" /> Download template
          </a>
        </div>

        <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 flex flex-col items-center justify-center bg-slate-50 text-center hover:bg-slate-100 transition-colors">
          <Upload size={32} className="text-slate-400 mb-3" />
          <h3 className="text-sm font-medium text-slate-900 mb-1">Upload CSV file</h3>
          <p className="text-xs text-slate-500 mb-4">Max file size: 2 MB, 2,000 rows</p>
          <label htmlFor="bulk-import-file" className="cursor-pointer">
            <span className="bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
              Browse Files
            </span>
            <input
              id="bulk-import-file"
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              onChange={handleFile}
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

        {fileError && (
          <p id="bulk-import-file-error" role="alert" className="text-sm text-red-600">{fileError}</p>
        )}

        {result && (
          <div id="bulk-import-preview" className="space-y-2" aria-live="polite">
            <p className="text-sm font-medium text-slate-900">
              {validCount} valid, {errorCount} with errors
            </p>
            {errorCount > 0 && (
              <ul id="bulk-import-errors" className="max-h-48 overflow-y-auto text-sm text-red-700 bg-red-50 rounded-lg p-3 space-y-1">
                {result.errors.map((err) => (
                  <li key={err.row}>
                    <span className="font-medium">Row {err.row}:</span> {err.messages.join('; ')}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <Button id="bulk-import-cancel" variant="ghost" onClick={handleClose}>Cancel</Button>
          <Button id="bulk-import-confirm" onClick={handleImport} disabled={validCount === 0}>
            {validCount > 0 ? `Import ${validCount} questions` : 'Import'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
