import React, { useState, useEffect } from 'react';
import LeadDetailModal from './LeadDetailModal';
import { supabase, updateSalesStatus, deleteLead } from '../../services/supabase';

interface LeadsListProps {
  leads: any[];
  isLoading: boolean;
  setLeads: React.Dispatch<React.SetStateAction<any[]>>;
  initialFilter: string | null;
}

const LeadsList: React.FC<LeadsListProps> = ({ leads, isLoading, setLeads, initialFilter }) => {
  const [selectedLead, setSelectedLead] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(initialFilter);

  useEffect(() => {
    setStatusFilter(initialFilter);
  }, [initialFilter]);

  const handleSalesStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>, phone: string) => {
    e.stopPropagation();
    const newStatus = e.target.value;
    
    // Optimistic UI Update
    setLeads(prev => prev.map(l => l.phone === phone ? { ...l, status: newStatus } : l));
    
    // Save to DB
    await updateSalesStatus(phone, newStatus);
  };

  const getJourneyBadge = (journeyStatus: string, imageUrl: string) => {
    if (imageUrl) {
      return <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold whitespace-nowrap">Simulation Completed</span>;
    }
    
    switch (journeyStatus) {
      case 'Lead Captured':
        return <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-bold whitespace-nowrap">Lead Captured</span>;
      case 'Photo Uploaded':
        return <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold whitespace-nowrap">Photo Uploaded</span>;
      case 'Area Mapped':
        return <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-bold whitespace-nowrap">Area Mapped</span>;
      case 'Simulation Completed':
        return <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold whitespace-nowrap">Simulation Completed</span>;
      default:
        return <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-bold whitespace-nowrap">{journeyStatus || 'Started'}</span>;
    }
  };

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = lead.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          lead.phone.includes(searchTerm);
    const matchesStatus = !statusFilter || (lead.status || 'New Lead') === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800 font-poppins">
            {statusFilter ? `${statusFilter} Leads` : 'All Recent Leads'}
          </h2>
          <p className="text-sm text-slate-500">Monitor live journeys and update sales status.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:flex-none">
            <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input 
              type="text" 
              placeholder="Search by name or phone..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary w-full"
            />
          </div>
          <select 
            value={statusFilter || ''} 
            onChange={(e) => setStatusFilter(e.target.value || null)}
            className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">All Statuses</option>
            <option value="New Lead">New Lead</option>
            <option value="Contacted">Contacted</option>
            <option value="Not Responded">Not Responded</option>
            <option value="Interested">Interested</option>
            <option value="Appointment Booked">Appointment Booked</option>
            <option value="Not Interested">Not Interested</option>
            <option value="Existing patient">Existing patient</option>
          </select>
          {statusFilter && (
            <button 
              onClick={() => setStatusFilter(null)}
              className="text-xs font-bold text-primary hover:underline px-2"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
              <th className="p-4 font-medium border-b border-slate-200">Prospect</th>
              <th className="p-4 font-medium border-b border-slate-200">Contact</th>
              <th className="p-4 font-medium border-b border-slate-200">Sales Status</th>
              <th className="p-4 font-medium border-b border-slate-200">Live Journey</th>
              <th className="p-4 font-medium border-b border-slate-200">Date/Time</th>
              <th className="p-4 font-medium border-b border-slate-200 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-500">Loading leads...</td>
              </tr>
            ) : filteredLeads.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-500">No leads found matching your criteria.</td>
              </tr>
            ) : (
              filteredLeads.map((lead) => (
                <tr 
                  key={lead.id} 
                  className="hover:bg-slate-50 transition cursor-pointer"
                  onClick={() => setSelectedLead(lead)}
                >
                  <td className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs uppercase">
                        {lead.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-slate-700 text-sm capitalize">{lead.name}</p>
                        <p className="text-xs text-slate-400 font-mono mt-0.5">{lead.id.substring(0, 8).toUpperCase()}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-sm text-slate-600">{lead.phone}</td>
                  <td className="p-4" onClick={(e) => e.stopPropagation()}>
                    <select 
                      value={lead.status || 'New Lead'}
                      onChange={(e) => handleSalesStatusChange(e, lead.phone)}
                      className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg focus:ring-primary focus:border-primary block p-2"
                    >
                      <option value="New Lead">New Lead</option>
                      <option value="Contacted">Contacted</option>
                      <option value="Not Responded">Not Responded</option>
                      <option value="Interested">Interested</option>
                      <option value="Appointment Booked">Appointment Booked</option>
                      <option value="Not Interested">Not Interested</option>
                      <option value="Existing patient">Existing patient</option>
                    </select>
                  </td>
                  <td className="p-4">
                    {getJourneyBadge(lead.journey_status, lead.simulation_image_url)}
                  </td>
                  <td className="p-4 text-sm text-slate-500">{new Date(lead.created_at).toLocaleString()}</td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end space-x-3">
                      <button className="text-primary hover:text-primary/80 font-medium text-sm">View</button>
                      <button 
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (window.confirm(`Are you sure you want to completely delete ${lead.name}'s data and generated images? This cannot be undone.`)) {
                            await deleteLead(lead.phone);
                            setLeads(prev => prev.filter(l => l.phone !== lead.phone));
                          }
                        }}
                        className="text-slate-400 hover:text-red-500 transition"
                        title="Delete Lead"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selectedLead && (
        <LeadDetailModal 
          lead={{
            ...selectedLead,
            timestamp: selectedLead.created_at
          }} 
          onClose={() => setSelectedLead(null)} 
        />
      )}
    </div>
  );
};

export default LeadsList;
