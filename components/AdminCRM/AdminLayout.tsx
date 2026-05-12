import React, { useState } from 'react';
import LeadsList from './LeadsList';

interface AdminLayoutProps {
  onLogout: () => void;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState('leads');

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col shadow-2xl z-20 hidden md:flex shrink-0 fixed h-full">
        <div className="p-6 border-b border-slate-800 flex flex-col items-center justify-center">
          <div className="bg-white rounded-xl p-2 shadow-lg mb-3 w-full flex justify-center">
             <img src="/logo_white.png" alt="Dr Paul's Logo" className="h-10 w-auto object-contain" />
          </div>
          <p className="text-xs text-slate-400 uppercase tracking-widest font-semibold">CRM Dashboard</p>
        </div>
        
        <nav className="flex-1 py-6 px-4 space-y-2">
          <button
            onClick={() => setActiveTab('leads')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition ${
              activeTab === 'leads' ? 'bg-primary text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            <span className="font-medium">Leads</span>
          </button>
          
          {/* Future tabs can go here */}
        </nav>
        
        <div className="p-4 border-t border-slate-800">
          <button
            onClick={onLogout}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 md:ml-64 bg-slate-50 min-h-screen flex flex-col">
        {/* Mobile Header */}
        <header className="md:hidden bg-slate-900 text-white p-4 flex justify-between items-center sticky top-0 z-30 shadow-md">
          <div className="bg-white rounded-lg p-1">
             <img src="/logo_white.png" alt="Dr Paul's Logo" className="h-6 w-auto object-contain" />
          </div>
          <button onClick={onLogout} className="text-sm text-slate-300 hover:text-white font-medium">Logout</button>
        </header>

        <div className="p-4 md:p-8 flex-1 overflow-auto">
          {activeTab === 'leads' && <LeadsList />}
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
