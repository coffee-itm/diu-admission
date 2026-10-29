import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router';
import { Mail, Lock, LogIn } from 'lucide-react';
import { ROUTES } from '../../lib/constants.js';
import { useAuth } from '../../features/auth/useAuth.js';
import { resolvePostLoginPath } from '../../features/auth/resolvePostLoginPath.js';
import { Input } from '../../components/ui/Input.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { motion } from 'framer-motion';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const user = await login(email, password);
      navigate(resolvePostLoginPath(location.state?.from?.pathname, user.role), { replace: true });
    } catch {
      // Error handled by hook
    }
  };

  const fillDemo = (role) => {
    if (role === 'admin') {
      setEmail('admin@diu.edu');
      setPassword('Admin@1234');
    } else {
      setEmail('demo@candidate.com');
      setPassword('Test@1234');
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center p-4 bg-slate-50 page-enter">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Welcome Back</h1>
          <p className="text-slate-600">Sign in to continue to your dashboard.</p>
        </div>

        <Card className="p-8 shadow-lg shadow-slate-200/50">
          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              id="email"
              label="Email Address"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              leftIcon={<Mail size={16} />}
            />
            <Input
              id="password"
              label="Password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              leftIcon={<Lock size={16} />}
            />
            
            <Button type="submit" className="w-full mt-2" size="lg" loading={loading} leftIcon={<LogIn size={18} />}>
              Sign In
            </Button>
          </form>

          {/* DEMO ACCOUNTS HELPER */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <p className="text-xs text-center text-slate-500 font-medium mb-3 uppercase tracking-wider">Demo Accounts</p>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="secondary" size="sm" onClick={() => fillDemo('candidate')}>Candidate</Button>
              <Button variant="outline" size="sm" onClick={() => fillDemo('admin')}>Admin</Button>
            </div>
          </div>
        </Card>

        <p className="text-center text-sm text-slate-600 mt-8">
          Don't have an account?{' '}
          <Link to={ROUTES.REGISTER} className="font-semibold text-blue-600 hover:text-blue-800 transition-colors">
            Register here
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
