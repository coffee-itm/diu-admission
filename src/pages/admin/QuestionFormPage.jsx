import { useParams, useNavigate } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { ROUTES } from '../../lib/constants.js';
import { useQuestionStore } from '../../store/questionStore.js';
import { QuestionForm } from '../../features/questions/QuestionForm.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { toast } from 'sonner';

export function QuestionFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getById, create, update } = useQuestionStore();

  const isEdit = Boolean(id);
  const initialData = isEdit ? getById(id) : null;

  if (isEdit && !initialData) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-500">Question not found.</p>
        <Button variant="ghost" onClick={() => navigate(ROUTES.ADMIN_QUESTIONS)} className="mt-4">Back</Button>
      </div>
    );
  }

  const handleSubmit = (data) => {
    if (isEdit) {
      update(id, data);
      toast.success('Question updated successfully');
    } else {
      create(data);
      toast.success('Question created successfully');
    }
    navigate(ROUTES.ADMIN_QUESTIONS);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 page-enter">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(ROUTES.ADMIN_QUESTIONS)} leftIcon={<ArrowLeft size={18} />}>
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{isEdit ? 'Edit Question' : 'Add New Question'}</h1>
          <p className="text-slate-600 text-sm">
            {isEdit ? `ID: ${id}` : 'Create a new multiple choice question'}
          </p>
        </div>
      </div>

      <Card className="p-6 md:p-8">
        <QuestionForm 
          initialData={initialData} 
          onSubmit={handleSubmit} 
          onCancel={() => navigate(ROUTES.ADMIN_QUESTIONS)} 
        />
      </Card>
    </div>
  );
}
