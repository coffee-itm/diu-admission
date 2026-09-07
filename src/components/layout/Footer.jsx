import { GraduationCap } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-400 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-blue-400 flex items-center justify-center">
              <GraduationCap size={16} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">DIU Admission</p>
              <p className="text-xs">Daffodil International University</p>
            </div>
          </div>
          <div className="text-center sm:text-right">
            <p className="text-xs">Office of Admissions — All Departments</p>
            <p className="text-xs mt-0.5">© {new Date().getFullYear()} DIU. All rights reserved.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
