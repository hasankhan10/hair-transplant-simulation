
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
import HowItWorksModal from './components/HowItWorksModal';
import LeadCaptureModal from './components/LeadCaptureModal';
import { autoCropToHead } from './services/imageProcessor';
import { generateHairVisualization, validateScalpImage } from './services/geminiService';

const App: React.FC = () => {
  const [patientImage, setPatientImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isMapping, setIsMapping] = useState(false);
  const [result, setResult] = useState<VisualizationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);

  // Check access on load
  React.useEffect(() => {
    const access = localStorage.getItem('drpaul_lead_captured');
    if (access === 'true') {
      setHasAccess(true);
    }
  }, []);

  const [params, setParams] = useState<VisualizationParams>({
    density: GraftDensity.MEDIUM
  });

  // Proactive Camera Permission Request (Pre-warmer)
  React.useEffect(() => {
    const prewarmCamera = async () => {
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      if (isMobile) {
        try {
          // Attempt to pre-request permission without keeping the stream open
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          stream.getTracks().forEach(track => track.stop());
          console.log("Camera permission pre-granted");
        } catch (err) {
          console.warn("Camera pre-grant failed or denied:", err);
        }
      }
    };
    prewarmCamera();
  }, []);

  const handleImageUpload = async (imageData: string, isVerified: boolean = false) => {
    setIsProcessing(true);
    setError(null);
    setProcessingProgress(10);
    setProcessingStatus('Normalizing Photo...');

    try {
      let processedImage = imageData;

      if (!isVerified) {
        // Only normalize and validate if NOT already verified by Smart Camera
        processedImage = await autoCropToHead(imageData);

        setProcessingStatus('Verifying Scalp/Head Accuracy...');
        setProcessingProgress(50);

        const validation = await validateScalpImage(processedImage);

        if (!validation.success) {
          setError(validation.error || "Please upload a clear photo of your scalp/head for simulation.");
          setPatientImage(null);
          return;
        }
      }

      setPatientImage(processedImage);
      setResult(null);
      setError(null);
      setParams(prev => ({ ...prev, mask: undefined }));

      // --- TRACKING: Photo Uploaded ---
      try {
        const userDataStr = localStorage.getItem('drpaul_user_data');
        if (userDataStr) {
          const { phone } = JSON.parse(userDataStr);
          const { updateJourneyStatus } = await import('./services/supabase');
          await updateJourneyStatus(phone, 'Photo Uploaded');
        }
      } catch (e) { console.error(e); }

    } catch (err: any) {
      console.error("Upload/Validation failed:", err);
      setError(err.message || "An error occurred during medical validation.");
      setPatientImage(null);
    } finally {
      setProcessingProgress(100);
      setTimeout(() => {
        setIsProcessing(false);
        setProcessingProgress(0);
        setProcessingStatus('');
      }, 500);
    }
  };

  const handleSaveMask = async (mask: string) => {
    setParams(prev => ({
      ...prev,
      mask
    }));

    // --- TRACKING: Area Mapped ---
    try {
      const userDataStr = localStorage.getItem('drpaul_user_data');
      if (userDataStr) {
        const { phone } = JSON.parse(userDataStr);
        const { updateJourneyStatus } = await import('./services/supabase');
        await updateJourneyStatus(phone, 'Area Mapped');
      }
    } catch (e) { console.error(e); }
  };

  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingStatus, setProcessingStatus] = useState('');

  const handleRunSimulation = async () => {
    if (!patientImage) return;

    setIsProcessing(true);
    setError(null);
    setProcessingProgress(0);
    setProcessingStatus('Analyzing Scalp & Hair Pattern...');

    // --- TRACKING: Generating Simulation ---
    try {
      const userDataStr = localStorage.getItem('drpaul_user_data');
      if (userDataStr) {
        const { phone } = JSON.parse(userDataStr);
        const { updateJourneyStatus } = await import('./services/supabase');
        await updateJourneyStatus(phone, 'Generating Simulation');
      }
    } catch (e) { console.error(e); }

    // Simulated progress updates for a more professional feel
    const progressInterval = setInterval(() => {
      setProcessingProgress(prev => {
        if (prev >= 95) return prev;

        // Update status based on progress (Using professional clinical terminology)
        if (prev > 75) setProcessingStatus('Finalizing Aesthetic Reconstruction...');
        else if (prev > 55) setProcessingStatus('Simulating Optimal Graft Density...');
        else if (prev > 30) setProcessingStatus('Performing Medical-Grade Follicular Alignment...');
        else if (prev > 10) setProcessingStatus('Analyzing Scalp Architecture...');

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
      <LeadCaptureModal onComplete={() => setHasAccess(true)} />

      <div className={`flex flex-col min-h-screen transition-all duration-700 ${!hasAccess ? 'blur-xl grayscale' : ''}`}>
        {!showCamera && <Header onShowHowItWorks={() => setShowHowItWorks(true)} />}

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
                showCamera={showCamera}
                setShowCamera={setShowCamera}
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
                density={params.density}
              />
            </div>
          </div>
        </main>

        <footer className="bg-white border-t border-slate-200 py-6 mt-auto">
          <div className="container mx-auto px-4 text-center">
            <p className="text-slate-500 text-base">
              &copy; {new Date().getFullYear()} Dr Paul's Hair Transplant Simulation.
            </p>
            <p className="text-slate-400 text-[11px] md:text-xs mt-2 italic font-medium">
              "Simulated result for visual guidance only. Actual results may vary. This visualization does not guarantee clinical outcomes." Developed by <a target="_blank" className="text-primary hover:underline font-bold" href="http://www.stovamedia.in">Stova Media</a>
            </p>
          </div>
        </footer>
      </div>

      <HowItWorksModal
        isOpen={showHowItWorks}
        onClose={() => setShowHowItWorks(false)}
      />
    </div >
  );
};

export default App;
