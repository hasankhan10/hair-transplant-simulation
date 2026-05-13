import React, { useState, useEffect } from 'react';
import LeadDetailModal from './LeadDetailModal';
import { supabase } from '../../services/supabase';

const LeadsList: React.FC = () => {
  const [leads, setLeads] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<any | null>(null);

  useEffect(() => {
    fetchLeads();

    // Set up Realtime Subscription
    const channel = supabase
      .channel('public:leads')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, (payload) => {
        console.log('Realtime update received!', payload);
        
        if (payload.eventType === 'INSERT') {
          setLeads(prev => [payload.new, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          setLeads(prev => prev.map(lead => lead.id === payload.new.id ? payload.new : lead));
        } else if (payload.eventType === 'DELETE') {
          setLeads(prev => prev.filter(lead => lead.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchLeads = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching leads:', error);
      } else if (data) {
        setLeads(data);
      }
    } catch (err) {
      console.error('Unexpected error fetching leads:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSalesStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>, phone: string) => {
    e.stopPropagation();
    const newStatus = e.target.value;
    
    // Optimistic UI Update
    setLeads(prev => prev.map(l => l.phone === phone ? { ...l, status: newStatus } : l));
    
    // Save to DB
    const { updateSalesStatus } = await import('../../services/supabase');
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
      case 'Generating Simulation':
        return <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-bold whitespace-nowrap">Generating...</span>;
      case 'Simulation Completed':
        return <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold whitespace-nowrap">Simulation Completed</span>;
      default:
        return <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-bold whitespace-nowrap">{journeyStatus || 'Started'}</span>;
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-200 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-slate-800 font-poppins">Recent Leads</h2>
          <p className="text-sm text-slate-500">Monitor live journeys and update sales status.</p>
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
            ) : leads.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-500">No leads found. Waiting for new submissions.</td>
              </tr>
            ) : (
              leads.map((lead) => (
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
                      <option value="Interested">Interested</option>
                      <option value="Appointment Booked">Appointment Booked</option>
                      <option value="Not Interested">Not Interested</option>
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
                            const { deleteLead } = await import('../../services/supabase');
                            await deleteLead(lead.phone);
                            // Optimistic UI update, though realtime will also catch it
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
            timestamp: selectedLead.created_at,
            generatedImage: selectedLead.simulation_image_url,
            originalImage: null // We don't save the original image to DB to save space
          }} 
          onClose={() => setSelectedLead(null)} 
        />
      )}
    </div>
  );
};

export default LeadsList;
