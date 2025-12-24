
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
}

const ImageDisplay: React.FC<ImageDisplayProps> = ({ 
  beforeImage, 
  result, 
  isProcessing, 
  error, 
  isMapping, 
  setIsMapping,
  onSaveMask,
  currentMask
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
      <div className="flex bg-slate-50 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('comparison')}
          className={`px-6 py-4 text-sm font-bold transition flex items-center ${
            activeTab === 'comparison' ? 'text-blue-600 bg-white border-r border-slate-200' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
          Comparison
        </button>
        <button
          onClick={() => setActiveTab('result')}
          disabled={!result}
          className={`px-6 py-4 text-sm font-bold transition flex items-center ${
            activeTab === 'result' ? 'text-blue-600 bg-white border-x border-slate-200' : 'text-slate-500 hover:text-slate-700'
          } ${!result && 'opacity-50 cursor-not-allowed'}`}
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          Your New Look
        </button>
        <button
          onClick={() => setActiveTab('original')}
          className={`px-6 py-4 text-sm font-bold transition flex items-center ${
            activeTab === 'original' ? 'text-blue-600 bg-white border-l border-slate-200' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            <span className="text-sm font-medium">{error}</span>
          </div>
        )}

        {isProcessing && (
          <div className="absolute inset-0 z-10 bg-slate-900/40 backdrop-blur-sm flex flex-col items-center justify-center text-white p-8">
            <div className="w-16 h-16 relative">
              <div className="absolute inset-0 border-4 border-white/20 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-t-white rounded-full animate-spin"></div>
            </div>
            <h3 className="text-xl font-bold mt-6 mb-2">Generating Your New Look</h3>
            <p className="text-slate-100/80 text-center max-w-xs text-sm">
              Designing your hair pattern based on your selection...
            </p>
          </div>
        )}

        {activeTab === 'comparison' && (
          <div className="w-full h-full flex flex-col md:flex-row gap-4 items-center justify-center">
            <div className="flex-1 w-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden relative">
              <span className="absolute top-3 left-3 bg-black/60 text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-widest z-10 backdrop-blur-md">Before</span>
              <div className="relative w-full h-full aspect-square">
                <img src={beforeImage || ''} alt="Original" className="w-full h-full object-contain bg-slate-50" />
                {currentMask && (
                  <img src={currentMask} alt="Mask Overlay" className="absolute inset-0 w-full h-full object-contain pointer-events-none opacity-60" />
                )}
              </div>
            </div>
            <div className="flex-1 w-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden relative group">
              <span className="absolute top-3 left-3 bg-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-widest z-10 shadow-lg">Simulation</span>
              {result ? (
                <img src={result.afterImage} alt="Result" className="w-full h-full object-contain aspect-square bg-slate-50" />
              ) : (
                <div className="w-full h-full aspect-square bg-slate-200 flex items-center justify-center">
                  <span className="text-slate-400 text-sm italic font-medium">Visualization pending</span>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'result' && result && (
          <div className="w-full h-full flex items-center justify-center">
            <div className="relative max-w-2xl w-full bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
               <span className="absolute top-4 left-4 bg-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-widest z-10 shadow-lg">AI Preview</span>
               <img src={result.afterImage} alt="Full Result" className="w-full object-contain bg-slate-50" />
               <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-6 text-white">
                  <p className="text-sm font-semibold italic">"AI-generated preview. Actual results may vary."</p>
               </div>
            </div>
          </div>
        )}

        {activeTab === 'original' && (
          <div className="w-full h-full flex items-center justify-center">
            <div className="relative max-w-2xl w-full bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
               <span className="absolute top-4 left-4 bg-black/60 text-white text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-widest z-10 backdrop-blur-md">Original</span>
               <div className="relative">
                 <img src={beforeImage || ''} alt="Full Original" className="w-full object-contain bg-slate-50" />
                 {currentMask && (
                   <img src={currentMask} alt="Mask Overlay" className="absolute inset-0 w-full h-full object-contain pointer-events-none opacity-40" />
                 )}
               </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between text-xs font-medium text-slate-500">
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <svg className="w-4 h-4 mr-1 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Private & Secure
          </div>
          {currentMask && (
            <div className="flex items-center text-red-600 font-bold">
               <span className="w-2 h-2 bg-red-500 rounded-full mr-1"></span>
               Area Selected
            </div>
          )}
        </div>
        <div>
          ID: {result ? result.timestamp.toString(36).toUpperCase() : '----'}
        </div>
      </div>
    </div>
  );
};

export default ImageDisplay;
