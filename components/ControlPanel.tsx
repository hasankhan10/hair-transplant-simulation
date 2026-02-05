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

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
    };
    checkMobile();
  }, []);

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

  const handleAgeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '' || (!isNaN(Number(val)) && Number(val) >= 0)) {
      setParams({ ...params, age: val });
    }
  };

  return (
    <div className="bg-white rounded-xl clinical-shadow p-6 space-y-8 sticky top-24 border border-slate-100">
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-base font-bold text-secondary uppercase tracking-wider font-poppins">1. Upload Photo</h3>
          {hasImage && (
            <button
              onClick={onReset}
              className="text-xs text-red-600 hover:text-red-800 font-bold uppercase"
            >
              Clear All
            </button>
          )}
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
          <div className="flex flex-col space-y-3">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-sm text-slate-700 font-medium truncate flex items-center">
                <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Photo Ready
              </span>
            </div>

            <button
              onClick={onStartMapping}
              className={`w-full flex items-center justify-center space-x-2 py-3 rounded-lg text-sm font-bold transition shadow-sm border-2 ${params.mask ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100' : 'bg-slate-800 text-white border-slate-800 hover:bg-slate-900'}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              <span>{params.mask ? 'Edit Area Selection' : 'Draw Hair Area'}</span>
            </button>
          </div>
        )}
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/png, image/jpeg, image/jpg, image/webp"
          onChange={handleFileChange}
        />
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">2. Select Density</h3>

        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-bold text-secondary uppercase tracking-tight font-poppins">Density Preference</label>
            <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20 uppercase tracking-wide">
              {densityLevels[currentDensityIndex].metric}
            </span>
          </div>

          <div className="px-1 py-4">
            <input
              type="range"
              min="0"
              max="2"
              step="1"
              value={currentDensityIndex}
              onChange={handleDensityChange}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary focus:outline-none"
            />
            <div className="relative mt-3 h-10 w-full">
              {densityLevels.map((level, idx) => {
                const isSelected = currentDensityIndex === idx;
                const positionStyle = idx === 0 ? 'left-0' : idx === 1 ? 'left-1/2 -translate-x-1/2' : 'right-0';

                return (
                  <div
                    key={level.label}
                    className={`absolute ${positionStyle} flex flex-col items-center transition-colors duration-300`}
                    style={{ width: idx === 1 ? 'auto' : '1px', overflow: 'visible' }}
                  >
                    <div className={`w-0.5 h-1.5 rounded-full mb-1 ${isSelected ? 'bg-primary' : 'bg-slate-300'}`} />
                    <span className={`text-[11px] font-bold uppercase whitespace-nowrap tracking-tighter font-poppins ${isSelected ? 'text-primary' : 'text-slate-400'}`}>
                      {level.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-slate-100">
        <button
          onClick={onRun}
          disabled={!hasImage || isProcessing || !params.mask}
          className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition transform active:scale-95 flex flex-col items-center justify-center font-poppins ${!hasImage || isProcessing || !params.mask
            ? 'bg-slate-300 cursor-not-allowed shadow-none text-slate-500'
            : 'bg-primary hover:bg-primary/90 hover:-translate-y-0.5'
            }`}
        >
          {isProcessing ? (
            <div className="flex items-center space-x-2">
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Creating New Look...</span>
            </div>
          ) : (
            <>
              <span className="text-base">Generate Preview</span>
              {!params.mask && hasImage && (
                <span className="text-xs font-normal opacity-70">Draw hair area first</span>
              )}
            </>
          )}
        </button>
      </div>

      <div className="bg-accent/10 rounded-lg p-3 border border-accent/20">
        <div className="flex items-start">
          <svg className="w-5 h-5 text-primary mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <p className="text-xs text-secondary leading-relaxed font-bold">
            <strong>TIP:</strong> The AI will only add hair in the areas you draw. Make sure to cover the spots you want to restore. <br /> <br />AI-generated preview.
          </p>
        </div>
      </div>

      {/* Action Choice Modal (Mobile) */}
      {showUploadOptions && (
        <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowUploadOptions(false)}>
          <div className="w-full max-w-sm bg-white rounded-t-3xl p-6 animate-in slide-in-from-bottom duration-300" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6" />
            <h4 className="text-lg font-bold text-secondary mb-4 font-poppins text-center">Select Photo Method</h4>

            <div className="space-y-3">
              <button
                onClick={() => { setShowCamera(true); setShowUploadOptions(false); }}
                className="w-full flex items-center p-4 bg-primary/5 rounded-2xl border border-primary/20 hover:bg-primary/10 transition group"
              >
                <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center mr-4 text-white">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div className="text-left">
                  <span className="block font-bold text-secondary font-poppins">Use Camera</span>
                  <span className="text-xs text-slate-500">Capture photo directly</span>
                </div>
              </button>

              <button
                onClick={() => { fileInputRef.current?.click(); }}
                className="w-full flex items-center p-4 bg-slate-50 rounded-2xl border border-slate-200 hover:bg-slate-100 transition"
              >
                <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center mr-4 text-white">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="text-left">
                  <span className="block font-bold text-secondary font-poppins">Upload from Gallery</span>
                  <span className="text-xs text-slate-500">Choose existing photo</span>
                </div>
              </button>

              <button
                onClick={() => setShowUploadOptions(false)}
                className="w-full py-3 text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-2"
              >
                Cancel
              </button>
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
    </div>
  );
};

export default ControlPanel;
