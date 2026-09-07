import { Outlet } from 'react-router';
import { Header } from './Header.jsx';
import { Sidebar } from './Sidebar.jsx';

export function AdminLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header />
      <div className="flex-1 flex overflow-hidden max-w-[1600px] w-full mx-auto">
        <Sidebar className="hidden md:flex sticky top-16 h-[calc(100vh-4rem)]" />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
