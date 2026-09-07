import { useState } from 'react';
import { Save, RefreshCw } from 'lucide-react';
import { useExamConfigStore } from '../../store/examConfigStore.js';
import { Card, CardHeader, CardBody } from '../../components/ui/Card.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { toast } from 'sonner';

export function ExamConfigPage() {
  const { config, updateConfig, updateSection, resetToDefault } = useExamConfigStore();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    title: config.title,
    totalTimeMinutes: config.totalTimeMinutes,
    overallMinPercent: config.passingThresholds.overallMinPercent,
    sectionMinPercent: config.passingThresholds.sectionMinPercent,
  });

  const handleSave = () => {
    setLoading(true);
    setTimeout(() => {
      updateConfig({
        title: formData.title,
        totalTimeMinutes: Number(formData.totalTimeMinutes),
        passingThresholds: {
          overallMinPercent: Number(formData.overallMinPercent),
          sectionMinPercent: Number(formData.sectionMinPercent),
        }
      });
      setLoading(false);
      toast.success('Exam configuration saved');
    }, 600);
  };

  const handleReset = () => {
    if (window.confirm('Are you sure you want to restore default settings?')) {
      resetToDefault();
      toast.info('Settings restored to default');
      setTimeout(() => window.location.reload(), 500); // Quick refresh to sync local state
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 page-enter">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Exam Configuration</h1>
          <p className="text-slate-600">Manage rules, time, and thresholds</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <Button variant="outline" className="w-full sm:w-auto" onClick={handleReset} leftIcon={<RefreshCw size={16} />}>Restore Defaults</Button>
          <Button className="w-full sm:w-auto" onClick={handleSave} loading={loading} leftIcon={<Save size={16} />}>Save Changes</Button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><h3 className="font-bold text-slate-900">General Settings</h3></CardHeader>
          <CardBody className="space-y-4">
            <Input 
              label="Exam Title" 
              value={formData.title} 
              onChange={e => setFormData({...formData, title: e.target.value})} 
            />
            <Input 
              label="Total Duration (Minutes)" 
              type="number" 
              value={formData.totalTimeMinutes} 
              onChange={e => setFormData({...formData, totalTimeMinutes: e.target.value})} 
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader><h3 className="font-bold text-slate-900">Passing Thresholds</h3></CardHeader>
          <CardBody className="space-y-4">
            <Input 
              label="Overall Minimum % (ELIGIBLE)" 
              type="number" 
              value={formData.overallMinPercent} 
              onChange={e => setFormData({...formData, overallMinPercent: e.target.value})} 
              rightIcon={<span className="text-slate-400">%</span>}
            />
            <Input 
              label="Per-Section Minimum %" 
              type="number" 
              value={formData.sectionMinPercent} 
              onChange={e => setFormData({...formData, sectionMinPercent: e.target.value})} 
              hint="Score below this in any section triggers CONDITIONALLY ELIGIBLE or NOT ELIGIBLE"
              rightIcon={<span className="text-slate-400">%</span>}
            />
          </CardBody>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader><h3 className="font-bold text-slate-900">Section Configuration</h3></CardHeader>
          <CardBody>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="text-xs uppercase bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Section ID</th>
                    <th className="px-4 py-3 font-semibold">Name</th>
                    <th className="px-4 py-3 font-semibold text-center">Questions</th>
                    <th className="px-4 py-3 font-semibold text-center">Recommended Time (m)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {config.sections.map((sec) => (
                    <tr key={sec.id}>
                      <td className="px-4 py-3 font-medium text-slate-900">{sec.id}</td>
                      <td className="px-4 py-3">{sec.name}</td>
                      <td className="px-4 py-3 text-center">
                        <input 
                          type="number" 
                          className="w-20 text-center border border-slate-300 rounded p-1" 
                          value={sec.questionCount}
                          onChange={(e) => updateSection(sec.id, { questionCount: Number(e.target.value) })}
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <input 
                          type="number" 
                          className="w-20 text-center border border-slate-300 rounded p-1" 
                          value={sec.timeMinutes}
                          onChange={(e) => updateSection(sec.id, { timeMinutes: Number(e.target.value) })}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
