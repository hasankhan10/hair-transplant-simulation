
import React, { useState, useEffect } from 'react';

interface LeadData {
    name: string;
    age: string;
    gender: string;
    phone: string;
}

interface LeadCaptureModalProps {
    onComplete: (data: LeadData) => void;
}

const LeadCaptureModal: React.FC<LeadCaptureModalProps> = ({ onComplete }) => {
    const [formData, setFormData] = useState<LeadData>({
        name: '',
        age: '',
        gender: '',
        phone: ''
    });
    const [isVisible, setIsVisible] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const hasAccess = localStorage.getItem('drpaul_lead_captured');
        if (!hasAccess) {
            setIsVisible(true);
        }
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.age || !formData.gender || !formData.phone) return;

        setIsSubmitting(true);
        try {
            // We will call the API we're about to create
            const response = await fetch('/api/v1/leads', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                localStorage.setItem('drpaul_lead_captured', 'true');
                localStorage.setItem('drpaul_user_data', JSON.stringify(formData));
                setIsVisible(false);
                onComplete(formData);
            }
        } catch (error) {
            console.error("Lead submission failed:", error);
            // Even if Google Sheets fails, we want the user to be able to use the site
            localStorage.setItem('drpaul_lead_captured', 'true');
            setIsVisible(false);
            onComplete(formData);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="lead-modal-title">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-md"></div>

            {/* Modal */}
            <div className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-500">
                <div className="p-8">
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
                            <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" aria-hidden="true" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                        </div>
                        <h2 id="lead-modal-title" className="text-2xl font-bold text-secondary font-poppins">Welcome to Dr Paul's</h2>
                        <p className="text-slate-500 text-sm mt-2">Please provide your details to begin your AI Hair Simulation</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Full Name</label>
                            <input
                                required
                                type="text"
                                placeholder="e.g. John Doe"
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Age</label>
                                <input
                                    required
                                    type="number"
                                    placeholder="Years"
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                    value={formData.age}
                                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Gender</label>
                                <select
                                    required
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all appearance-none cursor-pointer"
                                    value={formData.gender}
                                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                                >
                                    <option value="">Select</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Mobile Number</label>
                            <input
                                required
                                type="tel"
                                placeholder="+91 1234567890"
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className={`w-full py-4 mt-4 rounded-xl text-white font-bold font-poppins shadow-lg shadow-primary/25 transition-all active:scale-[0.98] ${isSubmitting ? 'bg-primary/70 cursor-not-allowed' : 'bg-primary hover:bg-primary/90'}`}
                        >
                            {isSubmitting ? (
                                <span className="flex items-center justify-center">
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Processing...
                                </span>
                            ) : (
                                'Start Simulation'
                            )}
                        </button>
                    </form>

                    <p className="text-[10px] text-slate-400 text-center mt-6 uppercase tracking-widest leading-relaxed">
                        By continuing, you agree to our medical consultation terms and privacy policy.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default LeadCaptureModal;
