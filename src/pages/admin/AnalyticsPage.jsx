import { useState, useEffect } from 'react';
import { analyticsService } from '../../services/analyticsService.js';
import { Card, CardHeader, CardBody } from '../../components/ui/Card.jsx';
import { PageSpinner } from '../../components/ui/Spinner.jsx';
import { ScoreBarChart } from '../../components/charts/ScoreBarChart.jsx';
import { SectionPieChart } from '../../components/charts/SectionPieChart.jsx';
import { MeritLineChart } from '../../components/charts/MeritLineChart.jsx';
import { SECTIONS, ELIGIBILITY } from '../../lib/constants.js';

export function AnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const stats = await analyticsService.getSummary();
        setData(stats);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading || !data) return <PageSpinner />;

  // Prepare data for Section Bar Chart
  const sectionChartData = Object.keys(data.sectionAverages).map(sid => ({
    id: sid,
    section: SECTIONS[sid]?.shortName || sid,
    score: Math.round(data.sectionAverages[sid]),
    fill: SECTIONS[sid]?.color || '#3b82f6',
  }));

  // Prepare data for Eligibility Pie Chart
  const eligibilityChartData = Object.keys(data.eligibilityDist).map(key => {
    const conf = ELIGIBILITY[key];
    const rawColor = conf?.color.replace('text-', '') || 'slate-500';
    // Map tailwind color classes to hex for Recharts
    const colorMap = {
      'green-700': '#15803d',
      'orange-700': '#f97316',
      'red-700': '#ef4444',
    };
    return {
      name: conf?.label || key,
      value: data.eligibilityDist[key],
      color: colorMap[rawColor] || '#64748b',
    };
  }).filter(d => d.value > 0);

  // Prepare Mock Data for Trend Line Chart (Simulating last 7 days)
  const trendData = [
    { date: '10 Jun', avgScore: 68 },
    { date: '11 Jun', avgScore: 72 },
    { date: '12 Jun', avgScore: 70 },
    { date: '13 Jun', avgScore: 75 },
    { date: '14 Jun', avgScore: Math.round(data.avgScore) },
  ];

  return (
    <div className="space-y-6 page-enter">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Analytics & Reporting</h1>
        <p className="text-slate-600">Deep dive into candidate performance metrics.</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <h3 className="font-bold text-slate-900">Average Scores by Section</h3>
            <p className="text-xs text-slate-500 font-normal mt-0.5">Identify which subjects candidates struggle with most.</p>
          </CardHeader>
          <CardBody>
            <ScoreBarChart data={sectionChartData} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="font-bold text-slate-900">Eligibility Distribution</h3>
            <p className="text-xs text-slate-500 font-normal mt-0.5">Overall pass/fail breakdown across all submissions.</p>
          </CardHeader>
          <CardBody className="flex items-center justify-center">
            <SectionPieChart data={eligibilityChartData} />
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <h3 className="font-bold text-slate-900">Performance Trend</h3>
            <p className="text-xs text-slate-500 font-normal mt-0.5">Average overall score over the last 5 days.</p>
          </CardHeader>
          <CardBody>
            <MeritLineChart data={trendData} />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
