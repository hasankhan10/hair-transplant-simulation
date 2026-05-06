import React from 'react';

interface LeadDetailModalProps {
  lead: any;
  onClose: () => void;
}

const LeadDetailModal: React.FC<LeadDetailModalProps> = ({ lead, onClose }) => {
  if (!lead) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col animate-in slide-in-from-bottom-4 duration-300">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xl font-bold font-poppins">
              {lead.name.charAt(0)}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">{lead.name}</h2>
              <p className="text-sm text-slate-500">{lead.phone} • {lead.city || 'Unknown Location'}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Column: Lead Info & Status */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Journey Status</h3>
                <div className="flex items-center space-x-3 mb-2">
                  <div className={`w-3 h-3 rounded-full ${lead.status === 'COMPLETED' ? 'bg-green-500' : 'bg-amber-500'}`}></div>
                  <span className="font-bold text-slate-700">{lead.status}</span>
                </div>
                <p className="text-sm text-slate-500">Last active: {new Date(lead.timestamp).toLocaleString()}</p>
              </div>

              <div className="bg-slate-50 rounded-xl p-5 border border-slate-100 space-y-4">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Details</h3>
                <div>
                  <p className="text-xs text-slate-500">Session ID</p>
                  <p className="text-sm font-mono text-slate-700 bg-white p-2 rounded border border-slate-200 mt-1">{lead.id}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Age / Gender</p>
                  <p className="text-sm font-medium text-slate-700">{lead.age || 'N/A'} / {lead.gender || 'N/A'}</p>
                </div>
              </div>

              {/* Call Center Action Box (Placeholder for future) */}
              <div className="bg-primary/5 rounded-xl p-5 border border-primary/20">
                <h3 className="text-sm font-bold text-primary uppercase tracking-wider mb-3">Call Center Action</h3>
                <select className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-primary mb-3">
                  <option>New Lead</option>
                  <option>Followed Up</option>
                  <option>Interested</option>
                  <option>Booked Consultation</option>
                  <option>Not Interested</option>
                </select>
                <textarea 
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-primary resize-none h-24"
                  placeholder="Add follow-up remarks..."
                ></textarea>
                <button className="w-full mt-3 bg-primary text-white font-medium py-2 rounded-lg hover:bg-primary/90 transition text-sm">
                  Save Update
                </button>
              </div>
            </div>

            {/* Right Column: Images */}
            <div className="lg:col-span-2">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Simulation Results</h3>
              
              {lead.originalImage && lead.generatedImage ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-center font-medium text-slate-600">Original Photo</p>
                    <div className="bg-slate-100 rounded-xl overflow-hidden border border-slate-200 aspect-[3/4] flex items-center justify-center">
                      <img src={lead.originalImage} alt="Original" className="w-full h-full object-cover" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-center font-bold text-primary">AI Simulation</p>
                    <div className="bg-slate-100 rounded-xl overflow-hidden border-2 border-primary/30 shadow-lg aspect-[3/4] flex items-center justify-center relative">
                      <img src={lead.generatedImage} alt="Generated" className="w-full h-full object-cover" />
                      <div className="absolute top-3 right-3 bg-white/90 backdrop-blur text-primary text-xs font-bold px-2 py-1 rounded-md shadow">
                        Result
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl h-64 flex flex-col items-center justify-center text-slate-400">
                  <svg className="w-12 h-12 mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  <p>No simulation images available for this lead yet.</p>
                  <p className="text-sm mt-1">Status: {lead.status}</p>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default LeadDetailModal;
