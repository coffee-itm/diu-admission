import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Plus, Upload, Search, Filter } from 'lucide-react';
import { ROUTES, SECTIONS, DIFFICULTY } from '../../lib/constants.js';
import { useQuestionStore } from '../../store/questionStore.js';
import { QuestionTable } from '../../features/questions/QuestionTable.jsx';
import { BulkImportModal } from '../../features/questions/BulkImportModal.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { toast } from 'sonner';

export function QuestionBankPage() {
  const navigate = useNavigate();
  const { questions, remove } = useQuestionStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSection, setFilterSection] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState('');
  const [importOpen, setImportOpen] = useState(false);

  // Filter logic
  const filteredQuestions = questions.filter((q) => {
    const matchSearch = q.text.toLowerCase().includes(searchTerm.toLowerCase());
    const matchSection = filterSection ? q.section === filterSection : true;
    const matchDiff = filterDifficulty ? q.difficulty === filterDifficulty : true;
    return matchSearch && matchSection && matchDiff;
  });

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this question?')) {
      remove(id);
      toast.success('Question deleted');
    }
  };

  const handleEdit = (q) => {
    navigate(`${ROUTES.ADMIN_QUESTIONS}/${q.id}/edit`);
  };

  return (
    <div className="space-y-6 page-enter">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Question Bank</h1>
          <p className="text-slate-600">Manage exam questions ({questions.length} total)</p>
        </div>
        <div className="flex gap-3">
          <Button id="question-bank-import" variant="outline" onClick={() => setImportOpen(true)} leftIcon={<Upload size={18} />}>
            Import CSV
          </Button>
          <Button id="question-bank-new" as={Link} to={ROUTES.ADMIN_QUESTIONS_NEW} leftIcon={<Plus size={18} />}>
            Add Question
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex-1">
          <Input 
            id="question-bank-search"
            placeholder="Search questions..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftIcon={<Search size={18} />}
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="w-full sm:w-48 relative">
            <span className="absolute left-3 top-3 text-slate-400 pointer-events-none"><Filter size={16} /></span>
            <select 
              id="question-bank-filter-section"
              className="w-full h-[42px] pl-9 pr-8 rounded-lg border border-slate-300 bg-white text-sm focus:ring-2 focus:ring-blue-500"
              value={filterSection}
              onChange={(e) => setFilterSection(e.target.value)}
            >
              <option value="">All Sections</option>
              {Object.values(SECTIONS).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="w-full sm:w-40 relative">
            <span className="absolute left-3 top-3 text-slate-400 pointer-events-none"><Filter size={16} /></span>
            <select 
              id="question-bank-filter-difficulty"
              className="w-full h-[42px] pl-9 pr-8 rounded-lg border border-slate-300 bg-white text-sm focus:ring-2 focus:ring-blue-500"
              value={filterDifficulty}
              onChange={(e) => setFilterDifficulty(e.target.value)}
            >
              <option value="">All Difficulties</option>
              {Object.entries(DIFFICULTY).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      <QuestionTable 
        questions={filteredQuestions} 
        onEdit={handleEdit} 
        onDelete={handleDelete} 
        onView={handleEdit}
      />

      <BulkImportModal 
        isOpen={importOpen} 
        onClose={() => setImportOpen(false)} 
        onImport={() => setImportOpen(false)} 
      />
    </div>
  );
}
