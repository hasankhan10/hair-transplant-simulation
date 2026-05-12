
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

    // OTP States
    const [otpSent, setOtpSent] = useState(false);
    const [otpVerified, setOtpVerified] = useState(false);
    const [otpCode, setOtpCode] = useState('');
    const [isOtpLoading, setIsOtpLoading] = useState(false);
    const [otpError, setOtpError] = useState<string | null>(null);

    useEffect(() => {
        const hasAccess = localStorage.getItem('drpaul_lead_captured');
        if (!hasAccess) {
            setIsVisible(true);
        }
    }, []);


    const handleSendOtp = async () => {
        if (!formData.phone || formData.phone.length < 10) {
            setOtpError("Please enter a valid mobile number first.");
            return;
        }

        setIsOtpLoading(true);
        setOtpError(null);

        try {
            const response = await fetch('/api/v1/send-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: formData.phone })
            });
            const data = await response.json();

            if (data.success) {
                setOtpSent(true);
            } else {
                setOtpError(data.error || "Failed to send OTP.");
            }
        } catch (error) {
            setOtpError("Failed to send OTP. Please try again.");
        } finally {
            setIsOtpLoading(false);
        }
    };

    const handleVerifyOtp = async () => {
        if (!otpCode || otpCode.length < 4) {
            setOtpError("Please enter a valid verification code.");
            return;
        }

        setIsOtpLoading(true);
        setOtpError(null);

        try {
            const response = await fetch('/api/v1/verify-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: formData.phone, code: otpCode })
            });
            const data = await response.json();

            if (data.success) {
                setOtpVerified(true);
            } else {
                setOtpError(data.error || "Invalid verification code.");
            }
        } catch (error) {
            setOtpError("Verification failed. Please try again.");
        } finally {
            setIsOtpLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.age || !formData.gender || !formData.phone) return;
        if (!otpVerified) {
            setOtpError("Please verify your mobile number to continue.");
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await fetch('/api/v1/leads', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                localStorage.setItem('drpaul_lead_captured', 'true');
                localStorage.setItem('drpaul_user_data', JSON.stringify(formData));
                
                // --- NEW: Dual Write to Supabase! ---
                try {
                    const { createLeadInSupabase } = await import('../services/supabase');
                    await createLeadInSupabase(formData);
                } catch (e) {
                    console.error("Failed to write to Supabase:", e);
                }

                setIsVisible(false);
                onComplete(formData);
            }
        } catch (error) {
            console.error("Lead submission failed:", error);
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
                                disabled={otpVerified}
                                placeholder="e.g. John Doe"
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all disabled:opacity-70 disabled:bg-slate-100"
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
                                    disabled={otpVerified}
                                    placeholder="Years"
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all disabled:opacity-70 disabled:bg-slate-100"
                                    value={formData.age}
                                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Gender</label>
                                <select
                                    required
                                    disabled={otpVerified}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all appearance-none cursor-pointer disabled:opacity-70 disabled:bg-slate-100"
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
                            <div className="flex gap-2">
                                <div className="relative flex-grow">
                                    <input
                                        required
                                        type="tel"
                                        disabled={otpSent || otpVerified}
                                        placeholder="+91 1234567890"
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all disabled:opacity-70 disabled:bg-slate-100"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    />
                                    {otpVerified && (
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500">
                                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                    )}
                                </div>
                                {!otpVerified && (
                                    <button
                                        type="button"
                                        onClick={handleSendOtp}
                                        disabled={isOtpLoading || !formData.phone || otpSent}
                                        className={`px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all whitespace-nowrap ${otpSent ? 'bg-slate-100 text-slate-400 border border-slate-200' : 'bg-secondary text-white hover:bg-secondary/90 shadow-md'}`}
                                    >
                                        {isOtpLoading && !otpSent ? (
                                            <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                        ) : otpSent ? 'OTP Sent' : 'Send OTP'}
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* OTP Input Field */}
                        {otpSent && !otpVerified && (
                            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Verify OTP</label>
                                <div className="flex gap-2">
                                    <input
                                        required
                                        type="text"
                                        maxLength={6}
                                        placeholder="Enter 6-digit code"
                                        className="flex-grow px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                        value={otpCode}
                                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                                    />
                                    <button
                                        type="button"
                                        onClick={handleVerifyOtp}
                                        disabled={isOtpLoading || otpCode.length < 4}
                                        className="px-6 py-3 bg-primary text-white rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:shadow-none"
                                    >
                                        {isOtpLoading ? (
                                            <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                        ) : 'Verify'}
                                    </button>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => { setOtpSent(false); setOtpCode(''); }}
                                    className="mt-2 text-[10px] font-bold text-slate-400 uppercase hover:text-primary transition-colors"
                                >
                                    Resend OTP / Change Number
                                </button>
                            </div>
                        )}

                        {otpError && (
                            <div className="p-3 bg-red-50 border border-red-100 rounded-lg animate-in fade-in slide-in-from-top-1">
                                <p className="text-xs font-bold text-red-600 flex items-center">
                                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                    </svg>
                                    {otpError}
                                </p>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isSubmitting || !otpVerified}
                            className={`w-full py-4 mt-4 rounded-xl text-white font-bold font-poppins shadow-lg transition-all active:scale-[0.98] ${isSubmitting || !otpVerified ? 'bg-slate-300 cursor-not-allowed shadow-none text-slate-500' : 'bg-primary hover:bg-primary/90 shadow-primary/25'}`}
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
                                otpVerified ? 'Start Simulation' : 'Verify Mobile to Start'
                            )}
                        </button>
                    </form>

                    <p className="text-[10px] text-slate-400 text-center mt-6 uppercase tracking-widest leading-relaxed">
                        By continuing, you agree to our medical consultation terms and privacy policy. 100% Secure & Confidential.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default LeadCaptureModal;
