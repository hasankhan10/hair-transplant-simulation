
import React, { useState } from 'react';
import { VisualizationResult } from '../types';
import SurgicalCanvas from './SurgicalCanvas';
import { uploadSimulationImage, updateLeadImageInSupabase } from '../services/supabase';

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
  density?: string;
}

// Helper to dynamically style notifications based on message content
const getNotificationStyle = (msg: string) => {
  const text = msg.toLowerCase();
  
  // 1. Success message (green)
  if (
    text.includes('success') || 
    text.includes('verified') || 
    text.includes('complete') || 
    text.includes('saved') || 
    text.includes('uploaded')
  ) {
    return {
      bgClass: 'bg-emerald-50 border border-emerald-200 text-emerald-800',
      icon: (
        <svg className="w-5 h-5 mr-3 text-emerald-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    };
  }
  
  // 2. Soft Warning message / QA feedback (amber/yellow)
  if (
    text.includes('unnatural') || 
    text.includes('unnatural result') || 
    text.includes('please click') || 
    text.includes('try again') || 
    text.includes('density') || 
    text.includes('balder') ||
    text.includes('no new hair')
  ) {
    return {
      bgClass: 'bg-amber-50 border border-amber-200 text-amber-800',
      icon: (
        <svg className="w-5 h-5 mr-3 text-amber-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      )
    };
  }

  // 3. Info message (blue)
  if (
    text.includes('info') ||
    text.includes('notice') ||
    text.includes('checking')
  ) {
    return {
      bgClass: 'bg-sky-50 border border-sky-200 text-sky-800',
      icon: (
        <svg className="w-5 h-5 mr-3 text-sky-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    };
  }
  
  // 4. Default / Hard Error (red)
  return {
    bgClass: 'bg-red-50 border border-red-200 text-red-800',
    icon: (
      <svg className="w-5 h-5 mr-3 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  };
};

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
  status,
  density
}) => {
  const [activeTab, setActiveTab] = useState<'comparison' | 'result' | 'original'>('comparison');
  const [isDownloading, setIsDownloading] = useState(false);

  const notification = error ? getNotificationStyle(error) : null;

  const generateCollageDataUrl = async (): Promise<string | null> => {
    if (!beforeImage || !result) return null;
    try {
      const loadImg = (src: string): Promise<HTMLImageElement> => {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = src;
        });
      };

      const [imgBefore, imgAfter, logo] = await Promise.all([
        loadImg(beforeImage),
        loadImg(result.afterImage),
        loadImg('/logo_white.png').catch(() => null)
      ]);

      const targetHeight = 800;
      const ratioBefore = imgBefore.width / imgBefore.height;
      const ratioAfter = imgAfter.width / imgAfter.height;
      const widthBefore = targetHeight * ratioBefore;
      const widthAfter = targetHeight * ratioAfter;

      const canvas = document.createElement('canvas');
      canvas.width = widthBefore + widthAfter;
      canvas.height = targetHeight + 100;
      const ctx = canvas.getContext('2d');

      if (!ctx) return null;

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(imgBefore, 0, 0, widthBefore, targetHeight);
      ctx.drawImage(imgAfter, widthBefore, 0, widthAfter, targetHeight);

      ctx.fillStyle = '#000000';
      ctx.font = 'bold 30px Montserrat, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('BEFORE', widthBefore / 2, targetHeight + 60);

      ctx.fillStyle = '#D71A21';
      ctx.fillText('SIMULATION OUTCOME', widthBefore + (widthAfter / 2), targetHeight + 60);

      const wmText = "Dr Paul's Simulation Output - Not Actual Result";
      ctx.save();
      ctx.globalAlpha = 0.08;
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 16px Montserrat, sans-serif';

      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(-Math.PI / 4);
      ctx.translate(-canvas.width / 2, -canvas.height / 2);

      const spacingX = 400;
      const spacingY = 200;
      for (let y = -canvas.height; y < canvas.height * 2; y += spacingY) {
        for (let x = -canvas.width; x < canvas.width * 2; x += spacingX) {
          ctx.fillText(wmText, x, y);
        }
      }
      ctx.restore();

      const padding = 25;
      const logoH = 28;
      const logoW = logo ? (logo.width / logo.height) * logoH : 0;
      const brandBoxW = Math.max(logoW + 180, 240);
      const brandBoxH = 50;

      ctx.save();
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = '#1A2329';
      ctx.beginPath();
      ctx.roundRect(canvas.width - brandBoxW - padding, targetHeight - brandBoxH - padding - 10, brandBoxW, brandBoxH, 8);
      ctx.fill();

      ctx.globalAlpha = 1.0;
      if (logo) {
        ctx.drawImage(logo, canvas.width - brandBoxW - padding + 15, targetHeight - brandBoxH - padding - 1, logoW, logoH);
      }

      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'left';
      ctx.font = 'bold 15px Montserrat, sans-serif';
      ctx.fillText("Dr Paul's", canvas.width - brandBoxW - padding + (logoW ? logoW + 25 : 20), targetHeight - brandBoxH - padding + 12);
      ctx.font = '500 11px Montserrat, sans-serif';
      ctx.fillText("Hair Transplant Simulation", canvas.width - brandBoxW - padding + (logoW ? logoW + 25 : 20), targetHeight - brandBoxH - padding + 28);

      ctx.fillStyle = '#000000';
      ctx.font = 'italic 500 8px Montserrat, sans-serif';
      ctx.globalAlpha = 0.6;
      ctx.fillText("Simulated result for visual guidance only. Actual results may vary.", canvas.width - brandBoxW - padding + 5, targetHeight - padding - 5);
      ctx.restore();

      const simId = `Sim ID: DPH-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-${Math.floor(100000 + Math.random() * 900000)}`;
      ctx.fillStyle = '#64748b';
      ctx.textAlign = 'center';
      ctx.font = 'bold 9px Montserrat, sans-serif';
      ctx.fillText(`${simId} | Generated by Dr Paul's AI System`, canvas.width / 2, canvas.height - 20);

      return canvas.toDataURL('image/jpeg', 0.9);
    } catch (err) {
      console.error("Canvas generation failed:", err);
      return null;
    }
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const dataUrl = await generateCollageDataUrl();
      if (dataUrl) {
        const link = document.createElement('a');
        link.download = `dr-paul-simulation-${Date.now()}.jpg`;
        link.href = dataUrl;
        link.click();
      }
    } finally {
      setIsDownloading(false);
    }
  };

  // --- NEW LOGIC: Silent background upload to Supabase when simulation completes ---
  React.useEffect(() => {
    const uploadToSupabase = async () => {
      if (!result) return;
      
      try {
        console.log("Automatically generating collage for Supabase...");
        const dataUrl = await generateCollageDataUrl();
        if (!dataUrl) return;

        // Get Phone Number to use as unique identifier
        const userDataStr = localStorage.getItem('drpaul_user_data');
        const phone = userDataStr ? JSON.parse(userDataStr).phone : 'unknown';

        console.log("Uploading to Supabase...");
        const publicUrl = await uploadSimulationImage(dataUrl, phone);
        
        if (publicUrl) {
          console.log("Successfully saved to Supabase Storage:", publicUrl);
          
          // Clean up density string for DB
          const cleanDensity = density?.split(' ')[0] || 'Medium';
          
          // --- NEW: Update the lead record in Supabase Database! ---
          await updateLeadImageInSupabase(phone, publicUrl, cleanDensity);

          // Send this URL to Google Apps Script via our Backend
          await fetch('/api/v1/update-lead-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone, imageUrl: publicUrl })
          });
          console.log("Successfully pushed URL to Google Sheets & Supabase DB!");
        }
      } catch (err) {
        console.error("Failed to upload background collage:", err);
      }
    };

    uploadToSupabase();
  }, [result]);

  if (!beforeImage && !isProcessing && !result) {
    return (
      <section className="bg-white rounded-2xl clinical-shadow border border-slate-100 flex flex-col items-center justify-center p-12 min-h-[600px] text-center relative" aria-labelledby="start-sim-title">
        {error && notification && (
          <div className={`absolute top-4 left-4 right-4 z-20 px-4 py-3 rounded-lg flex items-center animate-in fade-in slide-in-from-top-2 shadow-md ${notification.bgClass}`}>
            {notification.icon}
            <span className="text-base font-medium">{error}</span>
          </div>
        )}
        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
          <svg className="w-10 h-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        </div>
        <h2 id="start-sim-title" className="text-xl font-bold text-slate-800 mb-2">Start Your AI Hair Simulation</h2>
        <p className="text-slate-500 max-w-sm">
          Upload a clear photo of yourself to begin seeing your new look.
        </p>
      </section>
    );
  }

  return (
    <article className="bg-white rounded-2xl clinical-shadow border border-slate-100 flex flex-col min-h-[600px] overflow-hidden relative">
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
        {error && notification && (
          <div className={`absolute top-4 left-4 right-4 z-20 px-4 py-3 rounded-lg flex items-center animate-in fade-in slide-in-from-top-2 shadow-md ${notification.bgClass}`}>
            {notification.icon}
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
                    {beforeImage && (
                      <img src={beforeImage} alt="Original patient photo before hair restoration" className="max-h-[350px] md:max-h-[500px] w-auto block object-contain bg-slate-50" />
                    )}
                    {currentMask && !result && beforeImage && (
                      <img src={currentMask} alt="Simulation area selection mask" className="absolute inset-0 w-full h-full object-contain pointer-events-none opacity-70" />
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
                      <img src={result.afterImage} alt="Simulated hair transplant result preview" className="max-h-[350px] md:max-h-[500px] w-auto block object-contain bg-slate-50" />
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
              <div className="mt-6 flex flex-col items-center gap-4">
                {/* Premium Booking CTA Card */}
                <div className="w-full max-w-lg bg-white p-6 rounded-2xl shadow-xl border border-primary/10 flex flex-col md:flex-row items-center justify-between gap-6 animate-in fade-in slide-in-from-bottom-8 duration-1000">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 00-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-secondary font-poppins">Ready for the real thing?</h4>
                      <p className="text-sm text-slate-500 font-medium">Want to book a consultation?</p>
                    </div>
                  </div>
                  <button
                    onClick={() => window.open(`https://wa.me/919147714312?text=${encodeURIComponent("I see my Transplantation simulation and I am happy to book a consultation with you")}`, '_blank')}
                    className="w-full md:w-auto px-6 py-3 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/30 hover:bg-primary/90 hover:-translate-y-0.5 transition active:scale-95 whitespace-nowrap font-poppins text-sm uppercase tracking-wider"
                  >
                    Book Consultation
                  </button>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-4 mt-2">
                  <button
                    onClick={handleDownload}
                    disabled={isDownloading}
                    className="flex items-center gap-2 px-6 py-3 bg-slate-800 text-white font-bold rounded-xl shadow-lg border border-slate-700 hover:bg-slate-700 transition active:scale-95 font-poppins text-sm uppercase tracking-wider"
                  >
                    {isDownloading ? (
                      <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    )}
                    {isDownloading ? 'Saving...' : 'Download Comparison'}
                  </button>
                </div>

                <p className="text-xs md:text-sm font-medium text-slate-500 italic">
                  Note: If you don't get this result as expected then please try a different angle or look.
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'result' && result && (
          <div className="w-full h-full flex flex-col items-center justify-center gap-6 p-4">
            <div className="relative max-w-2xl w-full bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden group">
              <span className="absolute top-4 left-4 bg-primary text-white text-sm font-bold px-4 py-1.5 rounded-full uppercase tracking-widest z-10 shadow-lg font-poppins">Simulation Outcome</span>
              <img src={result.afterImage} alt="AI Hair restoration simulation full view" className="w-full object-contain bg-slate-50" />
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-8 text-white">
                <p className="text-sm font-bold uppercase tracking-wider text-primary mb-1">AI-Generated Preview</p>
                <p className="font-medium text-xs opacity-90 leading-relaxed max-w-md">"Simulated result for visual guidance only. Actual results may vary. This visualization does not guarantee clinical outcomes."</p>
              </div>
            </div>

            {/* Premium Booking CTA Card (Result Tab) */}
            <div className="w-full max-w-2xl bg-white p-6 rounded-2xl shadow-xl border border-primary/10 flex flex-col md:flex-row items-center justify-between gap-6 animate-in fade-in slide-in-from-bottom-8 duration-1000">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 00-2 2z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-lg font-bold text-secondary font-poppins">Ready for the real thing?</h4>
                  <p className="text-sm text-slate-500 font-medium">Want to book a consultation?</p>
                </div>
              </div>
              <button
                onClick={() => window.open(`https://wa.me/919147714312?text=${encodeURIComponent("I see my Transplantation simulation and I am happy to book a consultation with you.")}`, '_blank')}
                className="w-full md:w-auto px-6 py-3 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/30 hover:bg-primary/90 hover:-translate-y-0.5 transition active:scale-95 whitespace-nowrap font-poppins text-sm uppercase tracking-wider"
              >
                Book Consultation
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4">
              <button
                onClick={handleDownload}
                disabled={isDownloading}
                className="flex items-center gap-2 px-6 py-3 bg-slate-800 text-white font-bold rounded-xl shadow-lg border border-slate-700 hover:bg-slate-700 transition active:scale-95 font-poppins text-sm uppercase tracking-wider"
              >
                {isDownloading ? (
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                )}
                {isDownloading ? 'Saving...' : 'Download Comparison'}
              </button>
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
                {beforeImage && (
                  <>
                    <img src={beforeImage} alt="Full Original" className="max-h-[600px] w-auto block bg-slate-50" />
                    {currentMask && !result && (
                      <img src={currentMask} alt="Mask Overlay" className="absolute inset-0 w-full h-full pointer-events-none opacity-50" />
                    )}
                  </>
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
    </article>
  );
};

export default ImageDisplay;
