import React from 'react';

interface DashboardOverviewProps {
  leads: any[];
  isLoading: boolean;
  onCardClick: (status: string | null) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({ leads, isLoading, onCardClick }) => {
  const getCount = (status: string) => leads.filter(l => (l.status || 'New Lead') === status).length;

  const stats = [
    { label: 'Total Leads', count: leads.length, status: null, color: 'bg-blue-500', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
    { label: 'New Leads', count: getCount('New Lead'), status: 'New Lead', color: 'bg-amber-500', icon: 'M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z' },
    { label: 'Interested', count: getCount('Interested'), status: 'Interested', color: 'bg-emerald-500', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
    { label: 'Appointments', count: getCount('Appointment Booked'), status: 'Appointment Booked', color: 'bg-indigo-500', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { label: 'Contacted', count: getCount('Contacted'), status: 'Contacted', color: 'bg-purple-500', icon: 'M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z' },
    { label: 'Not Interested', count: getCount('Not Interested'), status: 'Not Interested', color: 'bg-slate-500', icon: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z' },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="h-32 bg-slate-200 rounded-2xl shadow-sm"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 font-poppins">Dashboard Overview</h1>
        <p className="text-slate-500">Real-time summary of your sales funnel.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.map((stat, idx) => (
          <button
            key={idx}
            onClick={() => onCardClick(stat.status)}
            className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center space-x-4 hover:shadow-md hover:border-primary/20 transition-all text-left group"
          >
            <div className={`${stat.color} w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-lg`}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={stat.icon} />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">{stat.label}</p>
              <p className="text-2xl font-bold text-slate-800">{stat.count}</p>
            </div>
            <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
               <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
            </div>
          </button>
        ))}
      </div>

      {/* Visual Chart Placeholder / Simple Funnel */}
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
        <h2 className="text-lg font-bold text-slate-800 mb-6 font-poppins">Sales Funnel Efficiency</h2>
        <div className="space-y-4">
          {stats.slice(1).map((stat, idx) => {
             const percentage = leads.length > 0 ? (stat.count / leads.length) * 100 : 0;
             return (
               <div key={idx} className="space-y-1">
                 <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
                   <span>{stat.label}</span>
                   <span>{stat.count} ({Math.round(percentage)}%)</span>
                 </div>
                 <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                   <div 
                    className={`${stat.color} h-full transition-all duration-1000`} 
                    style={{ width: `${percentage}%` }}
                   ></div>
                 </div>
               </div>
             );
          })}
        </div>
      </div>
    </div>
  );
};


