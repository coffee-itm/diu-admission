import { Routes, Route } from 'react-router';
import { Toaster } from 'sonner';
import { ROUTES } from './lib/constants.js';

// Providers & Guards
import { AuthProvider } from './features/auth/AuthProvider.jsx';
import { ProtectedRoute } from './features/auth/ProtectedRoute.jsx';

// Layouts
import { CandidateLayout } from './components/layout/CandidateLayout.jsx';
import { AdminLayout } from './components/layout/AdminLayout.jsx';

// Public Pages
import { LandingPage } from './pages/public/LandingPage.jsx';
import { LoginPage } from './pages/public/LoginPage.jsx';
import { RegisterPage } from './pages/public/RegisterPage.jsx';
import { NotFoundPage } from './pages/public/NotFoundPage.jsx';

// Candidate Pages
import { CandidateDashboardPage } from './pages/candidate/DashboardPage.jsx';
import { CandidateInstructionsPage } from './pages/candidate/InstructionsPage.jsx';
import { CandidateTestPage } from './pages/candidate/TestPage.jsx';
import { CandidateResultPage } from './pages/candidate/ResultPage.jsx';

// Admin Pages
import { AdminDashboardPage } from './pages/admin/DashboardPage.jsx';
import { QuestionBankPage } from './pages/admin/QuestionBankPage.jsx';
import { QuestionFormPage } from './pages/admin/QuestionFormPage.jsx';
import { ExamConfigPage } from './pages/admin/ExamConfigPage.jsx';
import { CandidatesPage } from './pages/admin/CandidatesPage.jsx';
import { CandidateDetailPage } from './pages/admin/CandidateDetailPage.jsx';
import { MeritListPage } from './pages/admin/MeritListPage.jsx';
import { AnalyticsPage } from './pages/admin/AnalyticsPage.jsx';

export default function App() {
  return (
    <AuthProvider>
      <Toaster position="top-right" richColors />
      <Routes>
        {/* Public Routes with standard Candidate Layout (header/footer) */}
        <Route element={<CandidateLayout />}>
          <Route path={ROUTES.HOME} element={<LandingPage />} />
          <Route path={ROUTES.LOGIN} element={<LoginPage />} />
          <Route path={ROUTES.REGISTER} element={<RegisterPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>

        {/* Candidate Protected Routes */}
        <Route element={<ProtectedRoute role="candidate"><CandidateLayout /></ProtectedRoute>}>
          <Route path={ROUTES.CANDIDATE_DASHBOARD} element={<CandidateDashboardPage />} />
          <Route path={ROUTES.CANDIDATE_INSTRUCTIONS} element={<CandidateInstructionsPage />} />
          {/* Test Page needs a special full-screen layout without standard header/footer */}
          <Route path={ROUTES.CANDIDATE_TEST} element={<div className="min-h-screen bg-slate-50 p-4"><CandidateTestPage /></div>} />
          <Route path={ROUTES.CANDIDATE_RESULT} element={<CandidateResultPage />} />
        </Route>

        {/* Admin Protected Routes */}
        <Route element={<ProtectedRoute role="admin"><AdminLayout /></ProtectedRoute>}>
          <Route path={ROUTES.ADMIN_DASHBOARD} element={<AdminDashboardPage />} />
          <Route path={ROUTES.ADMIN_QUESTIONS} element={<QuestionBankPage />} />
          <Route path={ROUTES.ADMIN_QUESTIONS_NEW} element={<QuestionFormPage />} />
          <Route path={`${ROUTES.ADMIN_QUESTIONS}/:id/edit`} element={<QuestionFormPage />} />
          <Route path={ROUTES.ADMIN_EXAM_CONFIG} element={<ExamConfigPage />} />
          <Route path={ROUTES.ADMIN_CANDIDATES} element={<CandidatesPage />} />
          <Route path={`${ROUTES.ADMIN_CANDIDATES}/:id`} element={<CandidateDetailPage />} />
          <Route path={ROUTES.ADMIN_MERIT_LIST} element={<MeritListPage />} />
          <Route path={ROUTES.ADMIN_ANALYTICS} element={<AnalyticsPage />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}
