import { Link } from 'react-router';
import { ROUTES } from '../../lib/constants.js';
import { Button } from '../../components/ui/Button.jsx';
import { Home } from 'lucide-react';

export function NotFoundPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center p-4 text-center bg-slate-50">
      <h1 className="text-9xl font-black text-slate-200">404</h1>
      <h2 className="text-2xl font-bold text-slate-900 mt-4 mb-2">Page Not Found</h2>
      <p className="text-slate-600 max-w-md mx-auto mb-8">
        The page you are looking for doesn't exist or has been moved.
      </p>
      <Button as={Link} to={ROUTES.HOME} leftIcon={<Home size={18} />}>
        Back to Home
      </Button>
    </div>
  );
}
