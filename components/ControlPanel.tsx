import React, { useRef, useState, useEffect } from 'react';
import { HairLossCategory, HairType, Ethnicity, HairLossArea, GraftDensity, VisualizationParams } from '../types';
import SmartCamera from './SmartCamera';

interface ControlPanelProps {
  params: VisualizationParams;
  setParams: React.Dispatch<React.SetStateAction<VisualizationParams>>;
  onUpload: (imageData: string, isVerified?: boolean) => void;
  onRun: () => void;
  onReset: () => void;
  onStartMapping: () => void;
  isProcessing: boolean;
  hasImage: boolean;
  showCamera: boolean;
  setShowCamera: (show: boolean) => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  params,
  setParams,
  onUpload,
  onRun,
  onReset,
  onStartMapping,
  isProcessing,
  hasImage,
  showCamera,
  setShowCamera
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showUploadOptions, setShowUploadOptions] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const [currentStep, setCurrentStep] = useState(1);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
    };
    checkMobile();
  }, []);

  // Auto-sync step based on data if user resets or clears
  useEffect(() => {
    if (!hasImage && currentStep > 1) setCurrentStep(1);
  }, [hasImage]);

  const densityLevels = [
    { label: 'Low', value: GraftDensity.LOW, metric: 'Conservative' },
    { label: 'Medium', value: GraftDensity.MEDIUM, metric: 'Standard' },
    { label: 'High', value: GraftDensity.HIGH, metric: 'Dense' }
  ];

  const currentDensityIndex = densityLevels.findIndex(d => d.value === params.density);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          onUpload(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
    if (e.target) {
      e.target.value = '';
    }
    setShowUploadOptions(false);
  };

  const handleUploadClick = () => {
    if (isMobile) {
      setShowUploadOptions(true);
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleDensityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const index = parseInt(e.target.value);
    setParams({ ...params, density: densityLevels[index].value });
  };

  const steps = [
    { id: 1, title: 'Upload', desc: 'Clinical Capture' },
    { id: 2, title: 'Mapping', desc: 'Select Area' },
    { id: 3, title: 'Finalize', desc: 'Density & Preview' }
  ];

  return (
    <section className="bg-white rounded-xl clinical-shadow p-6 sticky top-24 border border-slate-100 flex flex-col space-y-6">
      {/* Step Indicator */}
      <div className="flex items-center justify-between mb-4 px-2">
        {steps.map((s, idx) => (
          <React.Fragment key={s.id}>
            <div className="flex flex-col items-center relative">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-500 border-2 ${currentStep >= s.id ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20' : 'bg-white border-slate-200 text-slate-400'}`}>
                {currentStep > s.id ? (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                ) : s.id}
              </div>
              <span className={`text-[10px] font-bold uppercase mt-2 tracking-tighter ${currentStep >= s.id ? 'text-primary' : 'text-slate-400'}`}>{s.title}</span>
            </div>
            {idx < steps.length - 1 && (
              <div className={`flex-grow h-[2px] mb-6 transition-colors duration-500 ${currentStep > s.id ? 'bg-primary' : 'bg-slate-100'}`}></div>
            )}
          </React.Fragment>
        ))}
      </div>

      <div className="min-h-[320px] flex flex-col">
        {/* STEP 1: UPLOAD */}
        {currentStep === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-secondary uppercase tracking-wider font-poppins">1. Clinical Capture</h3>
            </div>
            {!hasImage ? (
              <button
                onClick={handleUploadClick}
                className="w-full flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-lg py-12 px-4 transition hover:border-primary hover:bg-primary/5 group"
              >
                <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-4 group-hover:bg-primary/10 transition">
                  <svg className="w-6 h-6 text-slate-400 group-hover:text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <span className="text-base font-bold text-slate-700 group-hover:text-primary font-poppins">Capture Your Photo</span>
                <span className="text-sm text-slate-400 mt-1 uppercase tracking-widest text-[10px] font-black">Standard Selfie Recommended</span>
              </button>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-green-50 rounded-xl border border-green-100">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-green-500/10 rounded-full flex items-center justify-center mr-3 text-green-600">
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-green-800">Photo Secured</span>
                      <span className="text-[10px] text-green-600 uppercase font-bold tracking-wider">Awaiting Mapping step</span>
                    </div>
                  </div>
                  <button onClick={onReset} className="text-[10px] font-black text-red-500 uppercase hover:underline">Change</button>
                </div>
                <button
                  onClick={() => setCurrentStep(2)}
                  className="w-full py-4 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition flex items-center justify-center group"
                >
                  Next Step: Area Selection
                  <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                </button>
              </div>
            )}
            <input type="file" ref={fileInputRef} className="hidden" accept="image/png, image/jpeg, image/jpg, image/webp" onChange={handleFileChange} />
          </div>
        )}

        {/* STEP 2: MAPPING */}
        {currentStep === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex items-center space-x-2 mb-2">
              <button onClick={() => setCurrentStep(1)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              </button>
              <h3 className="text-base font-bold text-secondary uppercase tracking-wider font-poppins">2. Area Selection</h3>
            </div>

            <p className="text-sm text-slate-500 font-medium">Use the surgical brush tool to paint the areas where you'd like to see new hair growth.</p>

            <button
              onClick={onStartMapping}
              className={`w-full flex items-center justify-center space-x-3 py-6 rounded-xl text-base font-bold transition shadow-sm border-2 ${params.mask ? 'bg-primary/5 text-primary border-primary/20 hover:bg-primary/10' : 'bg-slate-800 text-white border-slate-800 hover:bg-slate-900'}`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${params.mask ? 'bg-primary text-white' : 'bg-slate-700 text-slate-300'}`}>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
              </div>
              <span>{params.mask ? 'Edit area selection' : 'Draw transplant area'}</span>
            </button>

            {params.mask && (
              <button
                onClick={() => setCurrentStep(3)}
                className="w-full py-4 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition flex items-center justify-center group"
              >
                Next Step: Choose Density
                <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
              </button>
            )}
          </div>
        )}

        {/* STEP 3: DENSITY & RUN */}
        {currentStep === 3 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex items-center space-x-2 mb-2">
              <button onClick={() => setCurrentStep(2)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              </button>
              <h3 className="text-base font-bold text-secondary uppercase tracking-wider font-poppins">3. Finalize Selection</h3>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-bold text-secondary uppercase tracking-tight font-poppins">Follicle Density</label>
                <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20 uppercase tracking-wide">
                  {densityLevels[currentDensityIndex].metric}
                </span>
              </div>
              <div className="px-1 py-4">
                <input type="range" min="0" max="2" step="1" value={currentDensityIndex} onChange={handleDensityChange} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary focus:outline-none" />
                <div className="relative mt-3 h-10 w-full flex justify-between">
                  {densityLevels.map((level, idx) => (
                    <div key={level.label} className="flex flex-col items-center">
                      <div className={`w-0.5 h-1.5 rounded-full mb-1 ${currentDensityIndex === idx ? 'bg-primary' : 'bg-slate-300'}`} />
                      <span className={`text-[10px] font-bold uppercase tracking-tighter font-poppins ${currentDensityIndex === idx ? 'text-primary' : 'text-slate-400'}`}>{level.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <button
                onClick={onRun}
                disabled={!hasImage || isProcessing || !params.mask}
                className={`w-full py-4 rounded-xl font-bold text-white shadow-xl transition transform active:scale-95 flex flex-col items-center justify-center font-poppins ${!hasImage || isProcessing || !params.mask ? 'bg-slate-300 cursor-not-allowed shadow-none text-slate-500' : 'bg-primary hover:bg-primary/90 hover:-translate-y-0.5'}`}
              >
                {isProcessing ? (
                  <div className="flex items-center space-x-2">
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    <span>Reconstructing...</span>
                  </div>
                ) : (
                  <>
                    <span className="text-base uppercase tracking-wider">Generate Preview</span>
                    <span className="text-[10px] font-normal opacity-80">Click to start AI processing</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      <aside className="bg-accent/10 rounded-xl p-4 border border-accent/20" aria-label="Clinical Tip">
        <div className="flex items-start">
          <svg className="w-5 h-5 text-primary mt-0.5 mr-2 flex-shrink-0" fill="currentColor" aria-hidden="true" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
          <div className="text-[11px] text-secondary leading-relaxed font-bold">
            <strong>GUIDE:</strong> {currentStep === 1 && "Capture a direct front or top view for best results."}{currentStep === 2 && "The AI follows your mask precisely. Ensure full edge coverage."}{currentStep === 3 && "Higher density uses more grafts for a fuller look."}
          </div>
        </div>
      </aside>

      {/* Action Choice Modal (Mobile) */}
      {showUploadOptions && (
        <div className="fixed inset-0 z-[20000] flex items-end justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowUploadOptions(false)}>
          <style dangerouslySetInnerHTML={{ __html: 'body { overflow: hidden; }' }} />
          <div className="w-full max-w-sm bg-white rounded-t-3xl p-6 shadow-2xl animate-in slide-in-from-bottom duration-300" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6" />
            <h4 className="text-lg font-bold text-secondary mb-4 font-poppins text-center">Select Photo Method</h4>
            <div className="space-y-3">
              <button onClick={() => { setShowCamera(true); setShowUploadOptions(false); }} className="w-full flex items-center p-4 bg-primary/5 rounded-2xl border border-primary/20 hover:bg-primary/10 transition group">
                <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center mr-4 text-white"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg></div>
                <div className="text-left"><span className="block font-bold text-secondary font-poppins">Use Camera</span><span className="text-xs text-slate-500">Capture photo directly</span></div>
              </button>
              <button onClick={() => { fileInputRef.current?.click(); }} className="w-full flex items-center p-4 bg-slate-50 rounded-2xl border border-slate-200 hover:bg-slate-100 transition">
                <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center mr-4 text-white"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg></div>
                <div className="text-left"><span className="block font-bold text-secondary font-poppins">Upload from Gallery</span><span className="text-xs text-slate-500">Choose existing photo</span></div>
              </button>
              <button onClick={() => setShowUploadOptions(false)} className="w-full py-3 text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-2">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showCamera && (
        <SmartCamera
          onCapture={(data) => {
            onUpload(data, true);
            setShowCamera(false);
          }}
          onClose={() => setShowCamera(false)}
        />
      )}
    </section>
  );
};

export default ControlPanel;
