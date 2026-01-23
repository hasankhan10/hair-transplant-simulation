
import React from 'react';

interface HowItWorksModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const HowItWorksModal: React.FC<HowItWorksModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm cursor-pointer"
                onClick={onClose}
            ></div>

            {/* Modal Content */}
            <div className="relative bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
                {/* Header */}
                <div className="bg-secondary p-6 text-white flex justify-between items-center bg-gradient-to-r from-secondary to-slate-800">
                    <div>
                        <h2 className="text-xl font-bold font-poppins tracking-tight">How It Works</h2>
                        <p className="text-slate-400 text-sm mt-1">Get the most accurate hair transplant simulation</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>

                {/* Content */}
                <div className="p-8 space-y-8 overflow-y-auto max-h-[70vh]">
                    {/* Step 1 */}
                    <div className="flex gap-4">
                        <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold border border-primary/20">
                            1
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-bold text-secondary font-poppins">Upload Your Photo</h3>
                            <p className="text-slate-600 mt-2 leading-relaxed">
                                Choose a clear, high-resolution photo. For best results, use a <strong>front-facing</strong> or <strong>top-down scalp photo</strong> under good lighting.
                            </p>

                            {/* Step 1 GIF Container */}
                            <div className="mt-4 w-full aspect-video rounded-xl overflow-hidden border-2 border-slate-100 bg-slate-50 shadow-sm">
                                <img
                                    src="/how-it-works/step1.gif"
                                    alt="Uploading photo demonstration"
                                    className="w-full h-full object-cover"
                                    onError={(e) => (e.currentTarget.style.display = 'none')}
                                />
                            </div>

                            <div className="mt-8 grid grid-cols-2 gap-6">
                                {/* Incorrect Example */}
                                <div className="group flex flex-col items-center">
                                    <div className="mb-2 bg-red-600 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-md flex items-center gap-1 uppercase tracking-wider">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg>
                                        Incorrect
                                    </div>
                                    <div className="w-full aspect-square rounded-xl overflow-hidden border-2 border-slate-100 group-hover:border-red-200 transition-colors bg-slate-50">
                                        <img src="/before crop.jpeg" alt="Incorrect distant photo" className="w-full h-full object-contain grayscale-[0.5] group-hover:grayscale-0 transition-all" />
                                    </div>
                                    <p className="text-[11px] text-slate-500 mt-2 font-medium text-center italic leading-tight">Too distant, includes body & torso</p>
                                </div>

                                {/* Correct Example */}
                                <div className="group flex flex-col items-center">
                                    <div className="mb-2 bg-green-600 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-md flex items-center gap-1 uppercase tracking-wider">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                                        Correct
                                    </div>
                                    <div className="flex flex-col gap-4 w-full">
                                        <div className="relative">
                                            <div className="w-full aspect-square rounded-xl overflow-hidden border-2 border-slate-100 group-hover:border-green-200 transition-colors bg-slate-50">
                                                <img src="/after crop.jpeg" alt="Correct headshot photo" className="w-full h-full object-contain transition-all" />
                                            </div>
                                            <p className="text-[10px] text-slate-500 mt-1 font-medium text-center italic leading-tight">Front-facing face & scalp</p>
                                        </div>
                                        <div className="relative">
                                            <div className="w-full aspect-square rounded-xl overflow-hidden border-2 border-slate-100 group-hover:border-green-200 transition-colors bg-slate-50">
                                                <img src="/top view.jpeg" alt="Correct top view photo" className="w-full h-full object-contain transition-all" />
                                            </div>
                                            <p className="text-[10px] text-slate-500 mt-1 font-medium text-center italic leading-tight">Top-down scalp focus</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Step 2 */}
                    <div className="flex gap-4">
                        <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold border border-primary/20">
                            2
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-bold text-secondary font-poppins">Draw Your Desired Hairline</h3>
                            <p className="text-slate-600 mt-2 leading-relaxed">
                                Use the <strong>Surgical Brush</strong> to mark the areas where you want to see hair growth. Our Smart Lasso will automatically fill in the enclosed areas for you.
                            </p>

                            {/* Step 2 GIF Container */}
                            <div className="mt-4 w-full aspect-video rounded-xl overflow-hidden border-2 border-slate-100 bg-slate-50 shadow-sm">
                                <img
                                    src="/how-it-works/step2.gif"
                                    alt="Drawing hairline demonstration"
                                    className="w-full h-full object-cover"
                                    onError={(e) => (e.currentTarget.style.display = 'none')}
                                />
                            </div>

                            <p className="text-xs text-primary font-bold mt-2 uppercase tracking-wider">Tip: Cover the bald area completely for the most realistic look.</p>
                        </div>
                    </div>

                    {/* Step 3 */}
                    <div className="flex gap-4">
                        <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold border border-primary/20">
                            3
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-bold text-secondary font-poppins">Choose Graft Density</h3>
                            <p className="text-slate-600 mt-2 leading-relaxed">
                                Select between <strong>Low, Medium, or High</strong> density. This determines the thickness and volume of the simulated hair follicles.
                            </p>

                            {/* Step 3 GIF Container */}
                            <div className="mt-4 w-full aspect-video rounded-xl overflow-hidden border-2 border-slate-100 bg-slate-50 shadow-sm">
                                <img
                                    src="/how-it-works/step3.gif"
                                    alt="Choosing density demonstration"
                                    className="w-full h-full object-cover"
                                    onError={(e) => (e.currentTarget.style.display = 'none')}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Step 4 */}
                    <div className="flex gap-4 pb-4 border-b border-dashed border-slate-200">
                        <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold border border-primary/20">
                            4
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-bold text-secondary font-poppins">Generate AI Reconstruction</h3>
                            <p className="text-slate-600 mt-2 leading-relaxed">
                                Click <strong>'Generate Preview'</strong>. Our medical-grade AI will analyze your features and provide a realistic hair transplant visualization in seconds.
                            </p>

                            {/* Step 4 GIF Container */}
                            <div className="mt-4 w-full aspect-video rounded-xl overflow-hidden border-2 border-slate-100 bg-slate-50 shadow-sm">
                                <img
                                    src="/how-it-works/step4.gif"
                                    alt="AI generation demonstration"
                                    className="w-full h-full object-cover"
                                    onError={(e) => (e.currentTarget.style.display = 'none')}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Critical Rules */}
                    <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                        <h4 className="text-sm font-bold text-secondary uppercase tracking-widest mb-4 flex items-center gap-2">
                            <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"></path></svg>
                            Rules for Best Results
                        </h4>
                        <ul className="space-y-3">
                            <li className="flex items-start gap-3 text-sm text-slate-700">
                                <span className="w-1.5 h-1.5 bg-primary rounded-full mt-1.5 flex-shrink-0"></span>
                                <span><strong>No Hats or Headwear:</strong> Ensure the scalp is completely visible.</span>
                            </li>
                            <li className="flex items-start gap-3 text-sm text-slate-700">
                                <span className="w-1.5 h-1.5 bg-primary rounded-full mt-1.5 flex-shrink-0"></span>
                                <span><strong>Good Contrast:</strong> Avoid photos where the head blends into the background.</span>
                            </li>
                            <li className="flex items-start gap-3 text-sm text-slate-700">
                                <span className="w-1.5 h-1.5 bg-primary rounded-full mt-1.5 flex-shrink-0"></span>
                                <span><strong>Natural Light:</strong> Outdoor or bright indoor light produces the most realistic hair textures.</span>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 bg-slate-50 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-8 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition shadow-lg shadow-primary/20 font-poppins text-sm uppercase tracking-wider"
                    >
                        Got It, Let's Start
                    </button>
                </div>
            </div>
        </div>
    );
};

export default HowItWorksModal;
