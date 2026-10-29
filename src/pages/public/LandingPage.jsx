import { Link } from 'react-router';
import { ArrowRight, MonitorPlay, BrainCircuit, Target, Clock } from 'lucide-react';
import { ROUTES } from '../../lib/constants.js';
import { Button } from '../../components/ui/Button.jsx';
import { useAuthStore } from '../../store/authStore.js';
import { useExamConfigStore } from '../../store/examConfigStore.js';
import { motion } from 'framer-motion';

const getFeatures = (minutes, questions) => [
  { icon: MonitorPlay, title: '5 Sections', desc: 'Math, Logic, IT, English, Business' },
  { icon: Clock, title: `${minutes} Minutes`, desc: 'Strict time limit for all sections' },
  { icon: Target, title: 'Objective MCQ', desc: `${questions} multiple-choice questions` },
  { icon: BrainCircuit, title: 'Instant Scoring', desc: 'Get your results immediately' },
];

export function LandingPage() {
  const { isAuthenticated, user } = useAuthStore();
  const config = useExamConfigStore((s) => s.config);
  const features = getFeatures(
    config.totalTimeMinutes,
    config.sections.reduce((sum, s) => sum + s.questionCount, 0),
  );
  const getStartedRoute = isAuthenticated 
    ? (user?.role === 'admin' ? ROUTES.ADMIN_DASHBOARD : ROUTES.CANDIDATE_DASHBOARD)
    : ROUTES.REGISTER;

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col">
      {/* Hero Section */}
      <section className="relative flex-1 flex flex-col items-center justify-center pt-20 pb-32 overflow-hidden px-4">
        <div className="absolute inset-0 z-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-50 via-white to-white" />
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative z-10 max-w-4xl mx-auto text-center"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-sm font-medium mb-8">
            <span className="flex h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
            Admissions Open: {config.title}
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 tracking-tight leading-[1.1] mb-6">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-teal-500">
              DIU Admission
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-slate-600 mb-10 max-w-2xl mx-auto">
            One aptitude assessment for every department at Daffodil International University.
            Register once, take the test, and apply to the program of your choice.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="xl" as={Link} to={getStartedRoute} rightIcon={<ArrowRight size={20} />}>
              {isAuthenticated ? 'Go to Dashboard' : 'Register for Test'}
            </Button>
            {!isAuthenticated && (
              <Button variant="outline" size="xl" as={Link} to={ROUTES.LOGIN}>
                Login to Account
              </Button>
            )}
          </div>
        </motion.div>
      </section>

      {/* Features Grid */}
      <section className="bg-slate-50 py-24 px-4 border-t border-slate-100">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Exam Overview</h2>
            <p className="text-slate-600">Everything you need to know before starting</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-6">
                  <feature.icon size={24} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">{feature.title}</h3>
                <p className="text-slate-600 leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
