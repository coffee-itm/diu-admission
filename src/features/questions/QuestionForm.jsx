import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { questionSchema, defaultQuestionValues } from './questionSchema.js';
import { Input } from '../../components/ui/Input.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { SECTIONS, SECTION_ORDER, DIFFICULTY } from '../../lib/constants.js';

export function QuestionForm({ initialData, onSubmit, onCancel }) {
  const { register, control, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(questionSchema),
    defaultValues: initialData || defaultQuestionValues,
  });

  const { fields } = useFieldArray({ control, name: 'options' });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-slate-700">Section <span className="text-red-500">*</span></label>
          <select {...register('section')} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm">
            {SECTION_ORDER.map((sid) => (
              <option key={sid} value={sid}>{SECTIONS[sid].name}</option>
            ))}
          </select>
          {errors.section && <p className="text-xs text-red-600">{errors.section.message}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-slate-700">Difficulty <span className="text-red-500">*</span></label>
          <select {...register('difficulty')} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm">
            {Object.entries(DIFFICULTY).map(([key, val]) => (
              <option key={key} value={key}>{val.label}</option>
            ))}
          </select>
          {errors.difficulty && <p className="text-xs text-red-600">{errors.difficulty.message}</p>}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-slate-700">Question Text <span className="text-red-500">*</span></label>
        <textarea
          {...register('text')}
          rows={3}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter question text here..."
        />
        {errors.text && <p className="text-xs text-red-600">{errors.text.message}</p>}
      </div>

      <div className="space-y-4">
        <label className="text-sm font-medium text-slate-700">Options & Correct Answer <span className="text-red-500">*</span></label>
        {fields.map((field, index) => {
          const letter = String.fromCharCode(97 + index); // a, b, c, d
          return (
            <div key={field.id} className="flex items-start gap-3">
              <div className="pt-2.5">
                <input
                  type="radio"
                  value={letter}
                  {...register('correctAnswer')}
                  className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                />
              </div>
              <div className="flex-1">
                <Input
                  {...register(`options.${index}.text`)}
                  placeholder={`Option ${letter.toUpperCase()}`}
                  leftIcon={<span className="text-xs font-bold uppercase">{letter}</span>}
                  error={errors.options?.[index]?.text?.message}
                />
                <input type="hidden" {...register(`options.${index}.id`)} value={letter} />
              </div>
            </div>
          );
        })}
        {errors.correctAnswer && <p className="text-xs text-red-600">{errors.correctAnswer.message}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-slate-700">Explanation (Optional)</label>
        <textarea
          {...register('explanation')}
          rows={2}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Explain the correct answer..."
        />
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit">Save Question</Button>
      </div>
    </form>
  );
}
