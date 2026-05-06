import React, { useState } from 'react';
import LeadDetailModal from './LeadDetailModal';

// Mock Data for UI Development
const MOCK_LEADS = [
  {
    id: 'SESS_A1B2C3',
    name: 'Rajesh Kumar',
    phone: '+91 98765 43210',
    age: '34',
    gender: 'Male',
    city: 'Mumbai',
    status: 'COMPLETED',
    timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    originalImage: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=400',
    generatedImage: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=400' // Using same for placeholder
  },
  {
    id: 'SESS_X9Y8Z7',
    name: 'Amit Patel',
    phone: '+91 91234 56789',
    age: '42',
    gender: 'Male',
    city: 'Delhi',
    status: 'AREA_MAPPED',
    timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    originalImage: null,
    generatedImage: null
  },
  {
    id: 'SESS_M5N6O7',
    name: 'Unknown Visitor',
    phone: 'Not provided',
    age: '',
    gender: '',
    city: '',
    status: 'LANDED',
    timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    originalImage: null,
    generatedImage: null
  }
];

const LeadsList: React.FC = () => {
  const [selectedLead, setSelectedLead] = useState<any | null>(null);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">Completed</span>;
      case 'LANDED':
        return <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-bold">Landed</span>;
      default:
        return <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-bold">{status.replace('_', ' ')}</span>;
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-200 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-slate-800 font-poppins">Recent Leads</h2>
          <p className="text-sm text-slate-500">Monitor and manage incoming simulation prospects.</p>
        </div>
        <div className="flex space-x-2">
          <input 
            type="text" 
            placeholder="Search leads..." 
            className="px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-primary"
          />
          <button className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-200 transition">
            Filter
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
              <th className="p-4 font-medium border-b border-slate-200">Prospect</th>
              <th className="p-4 font-medium border-b border-slate-200">Contact</th>
              <th className="p-4 font-medium border-b border-slate-200">Status</th>
              <th className="p-4 font-medium border-b border-slate-200">Date/Time</th>
              <th className="p-4 font-medium border-b border-slate-200 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {MOCK_LEADS.map((lead) => (
              <tr 
                key={lead.id} 
                className="hover:bg-slate-50 transition cursor-pointer"
                onClick={() => setSelectedLead(lead)}
              >
                <td className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                      {lead.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-slate-700 text-sm">{lead.name}</p>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">{lead.id}</p>
                    </div>
                  </div>
                </td>
                <td className="p-4 text-sm text-slate-600">{lead.phone}</td>
                <td className="p-4">{getStatusBadge(lead.status)}</td>
                <td className="p-4 text-sm text-slate-500">{new Date(lead.timestamp).toLocaleString()}</td>
                <td className="p-4 text-right">
                  <button className="text-primary hover:text-primary/80 font-medium text-sm">View</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedLead && (
        <LeadDetailModal lead={selectedLead} onClose={() => setSelectedLead(null)} />
      )}
    </div>
  );
};

export default LeadsList;
