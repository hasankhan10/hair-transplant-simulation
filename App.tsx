
import React, { useState, useCallback } from 'react';
import { 
  HairLossCategory, 
  HairType,
  Ethnicity,
  HairLossArea, 
  GraftDensity, 
  VisualizationParams, 
  VisualizationResult 
} from './types';
import ControlPanel from './components/ControlPanel';
import ImageDisplay from './components/ImageDisplay';
import Header from './components/Header';
import { generateHairVisualization } from './services/geminiService';

const App: React.FC = () => {
  const [patientImage, setPatientImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isMapping, setIsMapping] = useState(false);
  const [result, setResult] = useState<VisualizationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [params, setParams] = useState<VisualizationParams>({
    category: HairLossCategory.MALE_PATTERN,
    hairType: HairType.STRAIGHT,
    ethnicity: Ethnicity.CAUCASIAN,
    age: '',
    areas: [], // Default to empty, mapping will add CUSTOM
    density: GraftDensity.MEDIUM
  });

  const handleImageUpload = (imageData: string) => {
    setPatientImage(imageData);
    setResult(null);
    setError(null);
    setParams(prev => ({ ...prev, mask: undefined, areas: [] }));
  };

  const handleSaveMask = (mask: string) => {
    setParams(prev => ({ 
      ...prev, 
      mask, 
      areas: prev.areas.includes(HairLossArea.CUSTOM) ? prev.areas : [...prev.areas, HairLossArea.CUSTOM]
    }));
  };

  const handleRunSimulation = async () => {
    if (!patientImage) return;

    setIsProcessing(true);
    setError(null);

    try {
      const simulatedImage = await generateHairVisualization(patientImage, params);
      setResult({
        beforeImage: patientImage,
        afterImage: simulatedImage,
        timestamp: Date.now()
      });
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to generate simulation. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const reset = () => {
    setPatientImage(null);
    setResult(null);
    setError(null);
    setParams(prev => ({ ...prev, mask: undefined, areas: [] }));
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-grow container mx-auto px-4 py-8 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Controls */}
          <div className="lg:col-span-4 space-y-6">
            <ControlPanel 
              params={params} 
              setParams={setParams} 
              onUpload={handleImageUpload}
              onRun={handleRunSimulation}
              isProcessing={isProcessing}
              hasImage={!!patientImage}
              onReset={reset}
              onStartMapping={() => setIsMapping(true)}
            />
          </div>

          {/* Right Column: Visualization */}
          <div className="lg:col-span-8">
            <ImageDisplay 
              beforeImage={patientImage} 
              result={result} 
              isProcessing={isProcessing}
              error={error}
              isMapping={isMapping}
              setIsMapping={setIsMapping}
              onSaveMask={handleSaveMask}
              currentMask={params.mask || null}
            />
          </div>
        </div>
      </main>

      <footer className="bg-white border-t border-slate-200 py-6 mt-auto">
        <div className="container mx-auto px-4 text-center">
          <p className="text-slate-500 text-sm">
            &copy; {new Date().getFullYear()} Hair Transplant Simulation.
          </p>
          <p className="text-slate-400 text-xs mt-2 italic">
            "AI-generated preview. Results may vary."
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;
