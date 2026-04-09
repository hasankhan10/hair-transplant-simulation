
import React, { useRef, useEffect, useState } from 'react';

interface SmartCameraProps {
    onCapture: (imageData: string) => void;
    onClose: () => void;
}

const SmartCamera: React.FC<SmartCameraProps> = ({ onCapture, onClose }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isCameraReady, setIsCameraReady] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

    // Constants for the visual guide (Oval Aperture)
    const OVAL_WIDTH_PCT = 0.65;
    const OVAL_HEIGHT_PCT = 0.65;

    const startCamera = async (mode: 'user' | 'environment') => {
        setIsCameraReady(false);
        try {
            const currentStream = videoRef.current?.srcObject as MediaStream;
            if (currentStream) {
                currentStream.getTracks().forEach(track => track.stop());
            }

            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: mode,
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                },
                audio: false
            });
            
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.setAttribute('playsinline', 'true');
                videoRef.current.play().catch(e => console.error("Auto-play blocked", e));
            }
        } catch (err: any) {
            console.error("Camera access failed:", err);
            setError(err.name === 'NotAllowedError' ? 'Camera permission was denied. Please check your browser settings.' : 'Could not access the camera. It might be in use by another app.');
        }
    };

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        startCamera(facingMode);

        return () => {
            document.body.style.overflow = '';
            const stream = videoRef.current?.srcObject as MediaStream;
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [facingMode]);

    const toggleCamera = () => {
        setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
    };

    const capture = () => {
        if (!videoRef.current || !canvasRef.current || !isCameraReady) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        
        // Use intrinsic video dimensions for highest quality capture
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext('2d');
        if (ctx) {
            // If facing the user, we should flip the captured image horizontally to match the preview mirror
            if (facingMode === 'user') {
                ctx.translate(canvas.width, 0);
                ctx.scale(-1, 1);
            }
            
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            // Reset transform
            ctx.setTransform(1, 0, 0, 1, 0, 0);

            const imageData = canvas.toDataURL('image/jpeg', 0.95);
            onCapture(imageData);
        }
    };

    return (
        <div className="fixed inset-0 z-[20000] bg-black flex flex-col justify-between items-center" style={{ height: '100dvh' }}>
            {/* Header */}
            <div className="w-full shrink-0 px-6 py-4 flex justify-between items-center z-20">
                <div className="flex flex-col">
                    <h3 className="text-white font-black text-lg font-poppins tracking-tight uppercase">Manual Capture</h3>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                        <p className="text-white/40 text-[10px] font-bold uppercase tracking-[0.2em]">
                            {facingMode === 'user' ? 'Selfie Mode' : 'Environmental Mode'}
                        </p>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center text-white transition-all active:scale-90 border border-white/10 backdrop-blur-md"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            {/* Main Viewport */}
            <div className="relative w-full max-w-lg flex-1 min-h-0 bg-slate-900 shadow-2xl border-y border-white/10 md:border-x md:rounded-[40px] overflow-hidden flex items-center justify-center">
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    onLoadedMetadata={() => setIsCameraReady(true)}
                    className={`absolute inset-0 w-full h-full object-cover ${facingMode === 'user' ? '-scale-x-100' : ''}`}
                />

                {/* Overlay Guide (Oval Mask) */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden">
                    <div
                        className="transition-all duration-500 border-2 border-white/30 shadow-[0_0_0_2000px_rgba(0,0,0,0.7)]"
                        style={{
                            width: `${OVAL_WIDTH_PCT * 100}%`,
                            height: `${OVAL_HEIGHT_PCT * 100}%`,
                            borderRadius: '50% 50%',
                            maxWidth: '350px',
                            maxHeight: '450px'
                        }}
                    >
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-[1px] bg-white/20" />
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-4 w-[1px] bg-white/20" />
                    </div>

                    <div className="absolute bottom-8 w-full flex flex-col items-center gap-3">
                        <span className="px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] bg-white/10 text-white/70 border border-white/20 backdrop-blur-md">
                            Center Head & Take Photo
                        </span>
                    </div>
                </div>

                {error && (
                    <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center text-center p-8 z-50">
                        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
                            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <p className="text-white font-bold mb-8">{error}</p>
                        <button
                            onClick={onClose}
                            className="px-10 py-4 bg-white text-black font-black uppercase tracking-widest text-xs rounded-2xl active:scale-95 transition"
                        >
                            Return To Menu
                        </button>
                    </div>
                )}
            </div>

            {/* Bottom Controls */}
            <div className="w-full shrink-0 py-6 px-8 flex items-center justify-between max-w-sm mx-auto z-20">
                {/* Close/Back Button */}
                <button
                    onClick={onClose}
                    className="p-4 bg-white/10 rounded-2xl hover:bg-white/20 transition active:scale-90"
                >
                    <svg className="w-6 h-6 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                </button>

                {/* Capture Button */}
                <button
                    onClick={capture}
                    disabled={!isCameraReady}
                    className={`relative w-20 h-20 md:w-24 md:h-24 rounded-full border-4 flex flex-shrink-0 items-center justify-center transition-all duration-300 active:scale-90 ${isCameraReady
                        ? 'bg-white border-primary shadow-[0_0_40px_rgba(var(--primary-rgb),0.3)]'
                        : 'bg-white/10 border-white/20 cursor-not-allowed opacity-50'
                        }`}
                >
                    <div className={`w-[60px] h-[60px] md:w-[72px] md:h-[72px] rounded-full transition-all duration-500 ${isCameraReady ? 'bg-primary' : 'bg-white/20'}`} />
                </button>

                {/* Switch Camera Button */}
                <button
                    onClick={toggleCamera}
                    className="p-4 bg-white/10 rounded-2xl hover:bg-white/20 transition active:scale-90"
                >
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                </button>
            </div>

            <canvas ref={canvasRef} className="hidden" />
        </div>
    );
};

export default SmartCamera;

