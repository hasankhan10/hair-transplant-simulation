
import React, { useRef } from 'react';
import { HairLossCategory, HairType, Ethnicity, HairLossArea, GraftDensity, VisualizationParams } from '../types';

interface ControlPanelProps {
  params: VisualizationParams;
  setParams: React.Dispatch<React.SetStateAction<VisualizationParams>>;
  onUpload: (imageData: string) => void;
  onRun: () => void;
  onReset: () => void;
  onStartMapping: () => void;
  isProcessing: boolean;
  hasImage: boolean;
}

const ControlPanel: React.FC<ControlPanelProps> = ({ 
  params, 
  setParams, 
  onUpload, 
  onRun, 
  onReset,
  onStartMapping,
  isProcessing, 
  hasImage 
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    
    // Reset the input value so the change event fires even if the same file is selected again
    if (e.target) {
      e.target.value = '';
    }
  };

  const handleDensityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const index = parseInt(e.target.value);
    setParams({ ...params, density: densityLevels[index].value });
  };

  const handleAgeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Allow empty string or non-negative numbers
    if (val === '' || (!isNaN(Number(val)) && Number(val) >= 0)) {
      setParams({ ...params, age: val });
    }
  };

  const handleAgeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Prevent characters that allow negative or exponential notation
    if (['-', '+', 'e', 'E'].includes(e.key)) {
      e.preventDefault();
    }
  };

  return (
    <div className="bg-white rounded-xl clinical-shadow p-6 space-y-8 sticky top-24 border border-slate-100">
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">1. Upload Photo</h3>
          {hasImage && (
            <button 
              onClick={onReset}
              className="text-[10px] text-red-600 hover:text-red-800 font-bold uppercase"
            >
              Clear All
            </button>
          )}
        </div>
        {!hasImage ? (
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-lg py-12 px-4 transition hover:border-blue-400 hover:bg-blue-50 group"
          >
            <svg className="w-10 h-10 text-slate-400 mb-2 group-hover:text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-sm font-medium text-slate-600 group-hover:text-blue-600">Click to Upload Photo</span>
            <span className="text-xs text-slate-400 mt-1">Selfie or headshot</span>
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
              className={`w-full flex items-center justify-center space-x-2 py-3 rounded-lg text-xs font-bold transition shadow-sm border-2 ${params.mask ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100' : 'bg-slate-800 text-white border-slate-800 hover:bg-slate-900'}`}
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
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">2. Personalize</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-tight">Age</label>
            <input 
              type="number" 
              min="0"
              max="120"
              placeholder="Years"
              className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none placeholder:text-slate-400"
              value={params.age}
              onChange={handleAgeChange}
              onKeyDown={handleAgeKeyDown}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-tight">Ethnicity</label>
            <select 
              className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
              value={params.ethnicity}
              onChange={(e) => setParams({ ...params, ethnicity: e.target.value as Ethnicity })}
            >
              {Object.values(Ethnicity).map(eth => (
                <option key={eth} value={eth}>{eth}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-tight">Hair Loss Type</label>
          <select 
            className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
            value={params.category}
            onChange={(e) => setParams({ ...params, category: e.target.value as HairLossCategory })}
          >
            {Object.values(HairLossCategory).map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-tight">Hair Texture</label>
          <select 
            className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
            value={params.hairType}
            onChange={(e) => setParams({ ...params, hairType: e.target.value as HairType })}
          >
            {Object.values(HairType).map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-tight">Density Preference</label>
            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 uppercase tracking-wide">
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
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 focus:outline-none"
            />
            <div className="flex justify-between mt-3">
              {densityLevels.map((level, idx) => (
                <div 
                  key={level.label} 
                  className={`flex flex-col items-center flex-1 ${idx === 0 ? 'items-start' : idx === 2 ? 'items-end' : ''}`}
                >
                  <div className={`w-0.5 h-1.5 rounded-full mb-1 ${currentDensityIndex === idx ? 'bg-blue-600' : 'bg-slate-300'}`} />
                  <span className={`text-[9px] font-bold uppercase ${currentDensityIndex === idx ? 'text-blue-600' : 'text-slate-400'}`}>
                    {level.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-slate-100">
        <button
          onClick={onRun}
          disabled={!hasImage || isProcessing || !params.mask}
          className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition transform active:scale-95 flex flex-col items-center justify-center ${
            !hasImage || isProcessing || !params.mask
              ? 'bg-slate-300 cursor-not-allowed shadow-none text-slate-500' 
              : 'bg-blue-600 hover:bg-blue-700 hover:-translate-y-0.5'
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
              <span className="text-sm">Generate Preview</span>
              {!params.mask && hasImage && (
                <span className="text-[10px] font-normal opacity-70">Draw hair area first</span>
              )}
            </>
          )}
        </button>
      </div>

      <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
        <div className="flex items-start">
          <svg className="w-4 h-4 text-amber-600 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <p className="text-[10px] text-amber-800 leading-relaxed font-medium">
            <strong>TIP:</strong> The AI will only add hair in the red areas you draw. Make sure to cover the spots you want to restore.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ControlPanel;
