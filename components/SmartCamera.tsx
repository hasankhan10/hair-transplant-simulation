import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as faceDetection from '@tensorflow-models/face-detection';
import '@tensorflow/tfjs-backend-webgl';
import '@tensorflow/tfjs-core';

interface SmartCameraProps {
    onCapture: (imageData: string) => void;
    onClose: () => void;
}

const SmartCamera: React.FC<SmartCameraProps> = ({ onCapture, onClose }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const detectorRef = useRef<faceDetection.FaceDetector | null>(null);
    const [isModelLoading, setIsModelLoading] = useState(true);
    const [isCameraReady, setIsCameraReady] = useState(false);
    const [faceDetected, setFaceDetected] = useState(false);
    const [faceInZone, setFaceInZone] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Constants for the detection zone
    const ZONE_WIDTH_PCT = 0.7; // Slightly larger for easier detection
    const ZONE_HEIGHT_PCT = 0.6;

    useEffect(() => {
        // Scroll Lock
        document.body.style.overflow = 'hidden';

        const initDetector = async () => {
            try {
                const model = faceDetection.SupportedModels.MediaPipeFaceDetector;
                const detectorConfig: faceDetection.MediaPipeFaceDetectorTfjsModelConfig = {
                    runtime: 'tfjs',
                    maxFaces: 1,
                } as any;
                detectorRef.current = await faceDetection.createDetector(model, detectorConfig);
                setIsModelLoading(false);
            } catch (err) {
                console.error("Failed to load face detector:", err);
                setError("AI initialization failed. Please try manual upload.");
            }
        };

        const startCamera = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: 'user',
                        width: { ideal: 1280 },
                        height: { ideal: 720 }
                    },
                    audio: false
                });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            } catch (err) {
                console.error("Camera access denied:", err);
                setError("Camera permission denied. Please allow access or use manual upload.");
            }
        };

        initDetector();
        startCamera();

        return () => {
            document.body.style.overflow = '';
            const stream = videoRef.current?.srcObject as MediaStream;
            stream?.getTracks().forEach(track => track.stop());
        };
    }, []);

    const detect = useCallback(async () => {
        if (!detectorRef.current || !videoRef.current || videoRef.current.readyState < 2) return;

        try {
            const faces = await detectorRef.current.estimateFaces(videoRef.current);

            if (faces.length > 0) {
                setFaceDetected(true);
                const face = faces[0];
                const box = face.box;

                const vw = videoRef.current.videoWidth;
                const vh = videoRef.current.videoHeight;

                const zoneW = vw * ZONE_WIDTH_PCT;
                const zoneH = vh * ZONE_HEIGHT_PCT;
                const zoneX = (vw - zoneW) / 2;
                const zoneY = (vh - zoneH) / 2;

                // TFJS detections are on the raw video frame.
                // Center point calculation
                const faceCenterX = box.xMin + box.width / 2;
                const faceCenterY = box.yMin + box.height / 2;

                const isInZone = (
                    faceCenterX > zoneX &&
                    faceCenterX < zoneX + zoneW &&
                    faceCenterY > zoneY &&
                    faceCenterY < zoneY + zoneH &&
                    box.width > zoneW * 0.4 && // Minimum size
                    box.width < zoneW * 1.2    // Maximum size (not too close)
                );

                setFaceInZone(isInZone);
            } else {
                setFaceDetected(false);
                setFaceInZone(false);
            }
        } catch (err) {
            console.warn("Detection loop error:", err);
        }

        requestAnimationFrame(detect);
    }, []);

    useEffect(() => {
        if (isCameraReady && !isModelLoading) {
            detect();
        }
    }, [isCameraReady, isModelLoading, detect]);

    const capture = () => {
        if (!videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext('2d');
        if (ctx) {
            // Flip the image for horizontal mirroring if desired, 
            // but usually raw is preferred for medical. 
            // Keeping it simple and high-quality:
            ctx.drawImage(video, 0, 0);
            const imageData = canvas.toDataURL('image/jpeg', 0.95);
            onCapture(imageData);
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-4 touch-none">
            {/* Header */}
            <div className="absolute top-0 inset-x-0 p-6 flex justify-between items-center z-20">
                <div className="flex flex-col">
                    <h3 className="text-white font-bold text-lg font-poppins">Secure Photo Capture</h3>
                    <p className="text-white/40 text-xs font-medium uppercase tracking-[0.2em]">Face/Scalp Detection Active</p>
                </div>
                <button
                    onClick={onClose}
                    className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors border border-white/5"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            {/* Main Viewport */}
            <div className="relative w-full max-w-lg aspect-[3/4] bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-white/10 ring-1 ring-white/10">
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    onLoadedMetadata={() => setIsCameraReady(true)}
                    className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
                />

                {/* AI Overlay Guide */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    {/* Scanning Box */}
                    <div
                        className={`transition-all duration-300 border-4 rounded-[40px] shadow-[0_0_0_2000px_rgba(0,0,0,0.6)] ${isModelLoading ? 'border-white/10' :
                                faceInZone ? 'border-green-500 scale-105 shadow-[0_0_40px_rgba(34,197,94,0.6)]' :
                                    'border-red-500/50'
                            }`}
                        style={{
                            width: `${ZONE_WIDTH_PCT * 100}%`,
                            height: `${ZONE_HEIGHT_PCT * 100}%`
                        }}
                    >
                        {/* Dynamic Corners */}
                        <div className={`absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 rounded-tl-3xl transition-colors ${faceInZone ? 'border-green-500' : 'border-red-500'}`} />
                        <div className={`absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 rounded-tr-3xl transition-colors ${faceInZone ? 'border-green-500' : 'border-red-500'}`} />
                        <div className={`absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 rounded-bl-3xl transition-colors ${faceInZone ? 'border-green-500' : 'border-red-500'}`} />
                        <div className={`absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 rounded-br-3xl transition-colors ${faceInZone ? 'border-green-500' : 'border-red-500'}`} />
                    </div>

                    {/* Status Label */}
                    <div className="absolute bottom-[15%] w-full flex flex-col items-center gap-3">
                        <span className={`px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-[0.2em] transition-all duration-500 backdrop-blur-md border shadow-lg ${isModelLoading ? 'bg-white/10 text-white/40 border-white/5' :
                                faceInZone ? 'bg-green-500 text-white border-green-400 shadow-green-500/20 animate-pulse' :
                                    'bg-red-500/20 text-red-500 border-red-500/30'
                            }`}>
                            {isModelLoading ? 'Syncing AI...' :
                                faceInZone ? 'System Locked - Capture Ready' :
                                    !faceDetected ? 'Searching for Face...' : 'Position Head in Box'}
                        </span>
                        {!faceInZone && !isModelLoading && (
                            <p className="text-white/50 text-[10px] font-bold uppercase tracking-widest text-center px-8">
                                Move your head closer or adjust your position
                            </p>
                        )}
                    </div>
                </div>

                {error && (
                    <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center text-center p-8">
                        <svg className="w-16 h-16 text-red-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <p className="text-white font-medium mb-6">{error}</p>
                        <button
                            onClick={onClose}
                            className="px-8 py-3 bg-white text-black font-bold rounded-xl active:scale-95 transition"
                        >
                            Return to App
                        </button>
                    </div>
                )}
            </div>

            {/* Bottom Controls */}
            <div className="mt-8 relative w-full flex items-center justify-center px-12">
                {/* Back Button */}
                <button
                    onClick={onClose}
                    className="absolute left-10 flex flex-col items-center gap-1 opacity-60 hover:opacity-100 transition active:scale-90"
                >
                    <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center border border-white/10">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                    </div>
                    <span className="text-white/40 text-[10px] uppercase font-black tracking-widest">Back</span>
                </button>

                {/* Capture Button */}
                <button
                    onClick={capture}
                    disabled={!faceInZone}
                    className={`relative w-24 h-24 rounded-full border-4 flex items-center justify-center transition-all duration-300 active:scale-90 ${faceInZone
                        ? 'bg-white border-green-500 shadow-[0_0_30px_rgba(34,197,94,0.4)]'
                        : 'bg-white/5 border-white/10 cursor-not-allowed'
                        }`}
                >
                    <div className={`w-18 h-18 rounded-full transition-all duration-500 ${faceInZone ? 'bg-primary scale-90 shadow-inner' : 'bg-white/10'
                        }`}>
                        {faceInZone && (
                            <svg className="w-10 h-10 text-white mx-auto mt-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        )}
                    </div>
                </button>

                <div className="absolute right-10 flex flex-col items-center gap-1 opacity-20">
                    <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        </svg>
                    </div>
                    <span className="text-white/40 text-[10px] uppercase font-black tracking-widest">Auto</span>
                </div>
            </div>

            <canvas ref={canvasRef} className="hidden" />
        </div>
    );
};

export default SmartCamera;
