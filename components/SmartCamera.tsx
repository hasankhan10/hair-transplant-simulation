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
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

    // Constants for the detection zone (Oval Aperture)
    const OVAL_WIDTH_PCT = 0.65;
    const OVAL_HEIGHT_PCT = 0.65;

    const startCamera = async (mode: 'user' | 'environment') => {
        try {
            // Stop existing tracks if any
            const currentStream = videoRef.current?.srcObject as MediaStream;
            currentStream?.getTracks().forEach(track => track.stop());

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
            }
        } catch (err) {
            console.error("Camera access failed:", err);
            setError("Could not switch camera. Check permissions.");
        }
    };

    useEffect(() => {
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
                console.error("AI load error:", err);
                setError("AI sync failed.");
            }
        };

        initDetector();
        startCamera(facingMode);

        return () => {
            document.body.style.overflow = '';
            const stream = videoRef.current?.srcObject as MediaStream;
            stream?.getTracks().forEach(track => track.stop());
        };
    }, []);

    const toggleCamera = () => {
        const newMode = facingMode === 'user' ? 'environment' : 'user';
        setFacingMode(newMode);
        startCamera(newMode);
    };

    const detect = useCallback(async () => {
        if (!detectorRef.current || !videoRef.current || videoRef.current.readyState < 2) return;

        try {
            const faces = await detectorRef.current.estimateFaces(videoRef.current);

            if (faces && faces.length > 0) {
                setFaceDetected(true);
                const face = faces[0];
                const box = face.box;

                const vw = videoRef.current.videoWidth;
                const vh = videoRef.current.videoHeight;

                // --- RAW SENSOR CENTER SYNC ---
                // This is the MOST ROBUST way. The camera is centered in your screen.
                // The center of the sensor (0.5, 0.5) IS the center of your visual Oval.

                const faceLeft = box.xMin / vw;
                const faceRight = (box.xMin + box.width) / vw;
                const faceTop = box.yMin / vh;
                const faceBottom = (box.yMin + box.height) / vh;

                // Absolute Center intersection
                const midX = 0.5;
                const midY = 0.5;
                const snapBuffer = 0.15; // Extremely lenient 15% snap zone

                const isCoveringCenter = (
                    midX > faceLeft - snapBuffer &&
                    midX < faceRight + snapBuffer &&
                    midY > faceTop - snapBuffer &&
                    midY < faceBottom + snapBuffer
                );

                const isProperSize = (box.width / vw) > 0.12;

                setFaceInZone(isCoveringCenter && isProperSize);
            } else {
                setFaceDetected(false);
                setFaceInZone(false);
            }
        } catch (err) {
            console.warn("AI Sensor Error:", err);
            setFaceInZone(false);
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
                    <h3 className="text-white font-black text-lg font-poppins tracking-tight uppercase">Medical Capture</h3>
                    <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${faceInZone ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                        <p className="text-white/40 text-[10px] font-bold uppercase tracking-[0.2em]">{facingMode === 'user' ? 'Selfie Mode' : 'Clinical Mode'}</p>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="w-12 h-12 bg-white/5 hover:bg-white/10 rounded-2xl flex items-center justify-center text-white transition-all active:scale-90 border border-white/10 backdrop-blur-md"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            {/* Main Viewport */}
            <div className="relative w-full max-w-lg aspect-[3/4] bg-slate-900 rounded-[40px] overflow-hidden shadow-2xl border border-white/10 ring-4 ring-black">
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    onLoadedMetadata={() => setIsCameraReady(true)}
                    className={`absolute inset-0 w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
                />

                {/* AI Overlay Guide (Oval Mask) */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    {/* The Oval Guideline */}
                    <div
                        className={`transition-all duration-500 border-4 rounded-[50%] shadow-[0_0_0_2000px_rgba(0,0,0,0.7)] ${isModelLoading ? 'border-white/5' :
                            faceInZone ? 'border-green-500 scale-105 shadow-[0_0_60px_rgba(34,197,94,0.4)]' :
                                'border-red-600 shadow-[0_0_40px_rgba(220,38,38,0.5)]'
                            }`}
                        style={{
                            width: `${OVAL_WIDTH_PCT * 100}%`,
                            height: `${OVAL_HEIGHT_PCT * 100}%`
                        }}
                    >
                        {/* Central Crosshair */}
                        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-[1px] ${faceInZone ? 'bg-green-500' : 'bg-red-600/50'}`} />
                        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-4 w-[1px] ${faceInZone ? 'bg-green-500' : 'bg-red-600/50'}`} />
                    </div>

                    {/* Status Label */}
                    <div className="absolute bottom-[10%] w-full flex flex-col items-center gap-3">
                        <span className={`px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 backdrop-blur-md border shadow-2xl ${isModelLoading ? 'bg-white/10 text-white/40 border-white/5' :
                            faceInZone ? 'bg-green-600 text-white border-green-500 shadow-green-600/20' :
                                'bg-red-600 text-white border-red-500 shadow-red-600/10'
                            }`}>
                            {isModelLoading ? 'Syncing...' :
                                faceInZone ? 'Locked - Take Photo' :
                                    !faceDetected ? 'Searching Face...' : 'Align Head to Oval'}
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
            <div className="mt-10 relative w-full flex items-center justify-center max-w-sm px-6">

                {/* Back Link */}
                <button
                    onClick={onClose}
                    className="p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition active:scale-90"
                >
                    <svg className="w-6 h-6 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                </button>

                {/* Capture Button */}
                <button
                    onClick={capture}
                    disabled={!faceInZone}
                    className={`mx-8 relative w-24 h-24 rounded-full border-4 flex items-center justify-center transition-all duration-300 active:scale-90 ${faceInZone
                        ? 'bg-white border-green-500 shadow-[0_0_40px_rgba(34,197,94,0.3)]'
                        : 'bg-red-500/20 border-red-500/30 cursor-not-allowed'
                        }`}
                >
                    <div className={`w-18 h-18 rounded-full transition-all duration-500 ${faceInZone ? 'bg-primary' : 'bg-red-500/40'}`}>
                        {faceInZone && (
                            <svg className="w-10 h-10 text-white mx-auto mt-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        )}
                    </div>
                </button>

                {/* Switch Camera Button */}
                <button
                    onClick={toggleCamera}
                    className="p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition active:scale-90 border border-white/5"
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
