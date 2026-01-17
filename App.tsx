
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
import { autoCropToHead } from './services/imageProcessor';
import { generateHairVisualization } from './services/geminiService';

const App: React.FC = () => {
  const [patientImage, setPatientImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isMapping, setIsMapping] = useState(false);
  const [result, setResult] = useState<VisualizationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [params, setParams] = useState<VisualizationParams>({
    density: GraftDensity.MEDIUM
  });

  const handleImageUpload = async (imageData: string) => {
    setIsProcessing(true);
    try {
      // Apply "Smart Zoom" to focus on the scalp/head
      const focusedImage = await autoCropToHead(imageData);
      setPatientImage(focusedImage);
      setResult(null);
      setError(null);
      setParams(prev => ({ ...prev, mask: undefined }));
    } catch (err) {
      console.error("Smart Zoom failed:", err);
      setPatientImage(imageData); // Fallback to original
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveMask = (mask: string) => {
    setParams(prev => ({
      ...prev,
      mask
    }));
  };

  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingStatus, setProcessingStatus] = useState('');

  const handleRunSimulation = async () => {
    if (!patientImage) return;

    setIsProcessing(true);
    setError(null);
    setProcessingProgress(0);
    setProcessingStatus('Analyzing Scalp & Hair Pattern...');

    // Simulated progress updates for a more professional feel
    const progressInterval = setInterval(() => {
      setProcessingProgress(prev => {
        if (prev >= 95) return prev;

        // Update status based on progress
        if (prev > 75) setProcessingStatus('Finalizing Reconstruction...');
        else if (prev > 50) setProcessingStatus('Performing Follicular Placement...');
        else if (prev > 25) setProcessingStatus('Calculating Graft Density...');

        return prev + Math.random() * 5;
      });
    }, 400);

    try {
      const simulatedImage = await generateHairVisualization(patientImage, params);
      setProcessingProgress(100);
      setProcessingStatus('Simulation Complete');

      setResult({
        beforeImage: patientImage,
        afterImage: simulatedImage,
        timestamp: Date.now()
      });
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to generate simulation. Please try again.');
    } finally {
      clearInterval(progressInterval);
      setTimeout(() => setIsProcessing(false), 500); // Small delay to show 100%
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
              progress={processingProgress}
              status={processingStatus}
            />
          </div>
        </div>
      </main>

      <footer className="bg-white border-t border-slate-200 py-6 mt-auto">
        <div className="container mx-auto px-4 text-center">
          <p className="text-slate-500 text-base">
            &copy; {new Date().getFullYear()} Hair Transplant Simulation.
          </p>
          <p className="text-slate-400 text-sm mt-2 italic">
            "AI-generated preview. Results may vary." Developed by <a target="_blank" className="text-primary hover:underline" href="http://www.stovamedia.in">Stova Media</a>
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;
