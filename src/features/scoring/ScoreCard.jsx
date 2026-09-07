import { Card, CardHeader, CardBody } from '../../components/ui/Card.jsx';
import { ProgressBar } from '../../components/ui/ProgressBar.jsx';
import { SECTIONS, SECTION_ORDER } from '../../lib/constants.js';

export function ScoreCard({ result }) {
  if (!result) return null;

  const { percentage, sectionPercentages, failedSections } = result;

  return (
    <Card>
      <CardHeader>
        <h3 className="text-lg font-semibold text-slate-900">Score Breakdown</h3>
      </CardHeader>
      <CardBody className="space-y-6">
        <div className="flex items-end justify-between border-b border-slate-100 pb-4">
          <div>
            <p className="text-sm text-slate-500 mb-1">Overall Performance</p>
            <p className="text-3xl font-bold text-slate-900">{percentage}%</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-500 mb-1">Total Score</p>
            <p className="text-xl font-semibold text-slate-700">
              {result.totalScore} <span className="text-sm text-slate-400">/ {result.totalQuestions}</span>
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="text-sm font-medium text-slate-700">Section-wise Results</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            {SECTION_ORDER.map((sid) => {
              if (sectionPercentages[sid] === undefined) return null;
              const sec = SECTIONS[sid];
              const pct = sectionPercentages[sid];
              const isFailed = failedSections?.includes(sid);
              const color = isFailed ? 'red' : pct >= 80 ? 'green' : 'blue';

              return (
                <div key={sid}>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${sec.bg.replace('100', '500')}`} />
                      {sec.name}
                    </span>
                    <span className={`text-sm font-bold ${isFailed ? 'text-red-600' : 'text-slate-900'}`}>
                      {pct}%
                    </span>
                  </div>
                  <ProgressBar value={pct} color={color} size="sm" />
                </div>
              );
            })}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
