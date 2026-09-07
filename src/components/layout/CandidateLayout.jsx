import { Outlet } from 'react-router';
import { Header } from './Header.jsx';
import { Footer } from './Footer.jsx';

export function CandidateLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
