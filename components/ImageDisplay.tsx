
import React, { useState } from 'react';
import { VisualizationResult } from '../types';
import SurgicalCanvas from './SurgicalCanvas';

interface ImageDisplayProps {
  beforeImage: string | null;
  result: VisualizationResult | null;
  isProcessing: boolean;
  error: string | null;
  isMapping: boolean;
  setIsMapping: (val: boolean) => void;
  onSaveMask: (mask: string) => void;
  currentMask: string | null;
  progress: number;
  status: string;
}

const ImageDisplay: React.FC<ImageDisplayProps> = ({
  beforeImage,
  result,
  isProcessing,
  error,
  isMapping,
  setIsMapping,
  onSaveMask,
  currentMask,
  progress,
  status
}) => {
  const [activeTab, setActiveTab] = useState<'comparison' | 'result' | 'original'>('comparison');

  if (!beforeImage && !isProcessing && !result) {
    return (
      <div className="bg-white rounded-2xl clinical-shadow border border-slate-100 flex flex-col items-center justify-center p-12 min-h-[600px] text-center">
        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
          <svg className="w-10 h-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Start Your Simulation</h2>
        <p className="text-slate-500 max-w-sm">
          Upload a clear photo of yourself to begin seeing your new look.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl clinical-shadow border border-slate-100 flex flex-col min-h-[600px] overflow-hidden relative">
      {isMapping && beforeImage && (
        <SurgicalCanvas
          image={beforeImage}
          onSave={(mask) => {
            onSaveMask(mask);
            setIsMapping(false);
          }}
          onCancel={() => setIsMapping(false)}
        />
      )}

      {/* Tabs */}
      <div className="flex bg-slate-50 border-b border-slate-200 overflow-x-auto scrollbar-hide no-scrollbar">
        <button
          onClick={() => setActiveTab('comparison')}
          className={`flex-1 min-w-fit px-4 md:px-6 py-3 md:py-4 text-sm md:text-base font-bold transition flex items-center justify-center font-poppins whitespace-nowrap ${activeTab === 'comparison' ? 'text-primary bg-white border-r border-slate-200' : 'text-slate-500 hover:text-slate-700'
            }`}
        >
          <svg className="w-4 h-4 mr-2 hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
          Comparison
        </button>
        <button
          onClick={() => setActiveTab('result')}
          disabled={!result}
          className={`flex-1 min-w-fit px-4 md:px-6 py-3 md:py-4 text-sm md:text-base font-bold transition flex items-center justify-center font-poppins whitespace-nowrap ${activeTab === 'result' ? 'text-primary bg-white border-x border-slate-200' : 'text-slate-500 hover:text-slate-700'
            } ${!result && 'opacity-50 cursor-not-allowed'}`}
        >
          <svg className="w-4 h-4 mr-2 hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          Your New Look
        </button>
        <button
          onClick={() => setActiveTab('original')}
          className={`flex-1 min-w-fit px-4 md:px-6 py-3 md:py-4 text-sm md:text-base font-bold transition flex items-center justify-center font-poppins whitespace-nowrap ${activeTab === 'original' ? 'text-primary bg-white border-l border-slate-200' : 'text-slate-500 hover:text-slate-700'
            }`}
        >
          <svg className="w-4 h-4 mr-2 hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Original
        </button>
      </div>

      <div className="flex-grow p-6 relative bg-slate-100 flex items-center justify-center">
        {error && (
          <div className="absolute top-4 left-4 right-4 z-20 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center animate-in fade-in slide-in-from-top-2">
            <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <span className="text-base font-medium">{error}</span>
          </div>
        )}

        {isProcessing && (
          <div className="absolute inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex flex-col items-center justify-center text-white p-12 transition-all duration-300">
            <div className="w-full max-w-sm">
              <div className="flex justify-between items-end mb-4">
                <div className="flex flex-col">
                  <span className="text-primary/70 text-xs font-bold uppercase tracking-[0.2em] mb-1 font-poppins">AI Processor Active</span>
                  <h3 className="text-2xl font-black tracking-tight font-poppins">{status}</h3>
                </div>
                <span className="text-3xl font-black tabular-nums text-white/90 font-poppins">{Math.round(progress)}%</span>
              </div>

              {/* Progress Bar Container */}
              <div className="h-4 w-full bg-white/10 rounded-full overflow-hidden backdrop-blur-sm border border-white/5 relative">
                {/* Glow Effect */}
                <div
                  className="absolute inset-y-0 left-0 bg-primary shadow-[0_0_20px_rgba(215,26,33,0.6)] transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                />
                {/* Animated Stripes */}
                <div
                  className="absolute inset-0 opacity-20"
                  style={{
                    backgroundImage: 'linear-gradient(45deg, rgba(255,255,255,0.15) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.15) 50%, rgba(255,255,255,0.15) 75%, transparent 75%, transparent)',
                    backgroundSize: '40px 40px',
                    width: '200%',
                    animation: 'progress-stripes 2s linear infinite'
                  }}
                />
              </div>

              <div className="mt-8 grid grid-cols-3 gap-4">
                <div className={`h-1 rounded-full transition-colors duration-500 ${progress > 25 ? 'bg-primary' : 'bg-white/10'}`}></div>
                <div className={`h-1 rounded-full transition-colors duration-500 ${progress > 50 ? 'bg-primary' : 'bg-white/10'}`}></div>
                <div className={`h-1 rounded-full transition-colors duration-500 ${progress > 75 ? 'bg-primary' : 'bg-white/10'}`}></div>
              </div>
            </div>

            <style dangerouslySetInnerHTML={{
              __html: `
              @keyframes progress-stripes {
                from { transform: translateX(0); }
                to { transform: translateX(-40px); }
              }
            `}} />
          </div>
        )}

        {activeTab === 'comparison' && (
          <div className="w-full h-full flex flex-col gap-4">
            <div className="flex flex-col md:flex-row gap-6 items-center justify-center">
              {/* Before Box */}
              <div className="flex-1 w-full flex flex-col items-center">
                <div className="relative bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden group max-w-full">
                  <span className="absolute top-3 left-3 bg-black/70 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest z-10 backdrop-blur-md border border-white/10">Before</span>
                  <div className="relative">
                    <img src={beforeImage || ''} alt="Original" className="max-h-[350px] md:max-h-[500px] w-auto block object-contain bg-slate-50" />
                    {currentMask && !result && (
                      <img src={currentMask} alt="Mask Overlay" className="absolute inset-0 w-full h-full object-contain pointer-events-none opacity-70" />
                    )}
                  </div>
                </div>
              </div>

              {/* Simulation Box */}
              <div className="flex-1 w-full flex flex-col items-center">
                <div className="relative bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden group max-w-full">
                  <span className="absolute top-3 left-3 bg-primary text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest z-10 shadow-lg font-poppins border border-white/20">Simulation</span>
                  <div className="relative">
                    {result ? (
                      <img src={result.afterImage} alt="Result" className="max-h-[350px] md:max-h-[500px] w-auto block object-contain bg-slate-50" />
                    ) : (
                      <div className="w-full aspect-square md:w-[400px] bg-slate-100 flex items-center justify-center border-2 border-dashed border-slate-200 rounded-lg m-2">
                        <div className="text-center">
                          <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-3">
                            <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                            </svg>
                          </div>
                          <span className="text-slate-400 text-sm font-bold uppercase tracking-wider font-poppins">Visualization Pending</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {result && (
              <div className="text-center mt-2 animate-in fade-in slide-in-from-bottom-2 duration-700">
                <p className="text-xs md:text-sm font-medium text-slate-600 italic">
                  Note: If you don't get this result as expected then please try a different angle or look.
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'result' && result && (
          <div className="w-full h-full flex flex-col items-center justify-center gap-4">
            <div className="relative max-w-2xl w-full bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
              <span className="absolute top-4 left-4 bg-primary text-white text-sm font-bold px-3 py-1.5 rounded-full uppercase tracking-widest z-10 shadow-lg font-poppins">AI Preview</span>
              <img src={result.afterImage} alt="Full Result" className="w-full object-contain bg-slate-50" />
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-6 text-white text-base">
                <p className="font-semibold italic">"AI-generated preview. Actual results may vary."</p>
              </div>
            </div>
            <p className="text-xs md:text-sm font-medium text-slate-400 italic text-center max-w-md px-6">
              If you don't get this result as expected then please try a different angle or look.
            </p>
          </div>
        )}

        {activeTab === 'original' && (
          <div className="w-full h-full flex items-center justify-center">
            <div className="relative bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden max-w-2xl">
              <span className="absolute top-4 left-4 bg-black/70 text-white text-sm font-bold px-4 py-1.5 rounded-full uppercase tracking-widest z-10 backdrop-blur-md border border-white/10">Original Patient Photo</span>
              <div className="relative">
                <img src={beforeImage || ''} alt="Full Original" className="max-h-[600px] w-auto block bg-slate-50" />
                {currentMask && !result && (
                  <img src={currentMask} alt="Mask Overlay" className="absolute inset-0 w-full h-full pointer-events-none opacity-50" />
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between px-6 py-3 bg-slate-50 border-t border-slate-100">
        <div className="flex items-center space-x-2">
          <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <span className="text-sm font-bold text-secondary uppercase tracking-wide font-poppins">Private & Secure</span>
        </div>

        {currentMask && !result && (
          <div className="flex items-center space-x-2 animate-pulse">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            <span className="text-sm font-bold text-red-500 tracking-wide uppercase">Area Selected</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageDisplay;
