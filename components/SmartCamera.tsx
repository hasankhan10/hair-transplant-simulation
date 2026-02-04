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
    const [faceDetectedInZone, setFaceDetectedInZone] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Constants for the detection zone
    const ZONE_WIDTH_PCT = 0.65;
    const ZONE_HEIGHT_PCT = 0.55;

    useEffect(() => {
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
            const stream = videoRef.current?.srcObject as MediaStream;
            stream?.getTracks().forEach(track => track.stop());
        };
    }, []);

    const detect = useCallback(async () => {
        if (!detectorRef.current || !videoRef.current || videoRef.current.readyState < 2) return;

        try {
            const faces = await detectorRef.current.estimateFaces(videoRef.current);

            if (faces.length > 0) {
                const face = faces[0];
                const box = face.box;

                // Define target zone in pixels
                const vw = videoRef.current.videoWidth;
                const vh = videoRef.current.videoHeight;

                const zoneW = vw * ZONE_WIDTH_PCT;
                const zoneH = vh * ZONE_HEIGHT_PCT;
                const zoneX = (vw - zoneW) / 2;
                const zoneY = (vh - zoneH) / 2;

                // Check if face center is roughly in the zone
                const faceCenterX = box.xMin + box.width / 2;
                const faceCenterY = box.yMin + box.height / 2;

                const isInZone = (
                    faceCenterX > zoneX &&
                    faceCenterX < zoneX + zoneW &&
                    faceCenterY > zoneY &&
                    faceCenterY < zoneY + zoneH &&
                    box.width > zoneW * 0.4 // Ensure face isn't too small/far
                );

                setFaceDetectedInZone(isInZone);
            } else {
                setFaceDetectedInZone(false);
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
            ctx.drawImage(video, 0, 0);
            const imageData = canvas.toDataURL('image/jpeg', 0.9);
            onCapture(imageData);
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-4">
            {/* Header */}
            <div className="absolute top-0 inset-x-0 p-6 flex justify-between items-center z-20">
                <h3 className="text-white font-bold text-lg font-poppins">Secure Face Capture</h3>
                <button
                    onClick={onClose}
                    className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            {/* Main Viewport */}
            <div className="relative w-full max-w-lg aspect-[3/4] bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-white/10">
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
                        className={`transition-all duration-300 border-4 rounded-[40px] shadow-[0_0_0_2000px_rgba(0,0,0,0.6)] ${faceDetectedInZone ? 'border-green-500 scale-105 shadow-[0_0_30px_rgba(34,197,94,0.5)]' : 'border-white/30'
                            }`}
                        style={{
                            width: `${ZONE_WIDTH_PCT * 100}%`,
                            height: `${ZONE_HEIGHT_PCT * 100}%`
                        }}
                    />

                    {/* Status Label */}
                    <div className="absolute top-[80%] transform translate-y-4">
                        <span className={`px-4 py-2 rounded-full text-sm font-bold uppercase tracking-widest transition-all duration-300 ${faceDetectedInZone ? 'bg-green-500 text-white animate-pulse' : 'bg-white/20 text-white/70'
                            }`}>
                            {isModelLoading ? 'Initializing AI...' : faceDetectedInZone ? 'Ready to Capture' : 'Position Head in Box'}
                        </span>
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
                            className="px-6 py-2 bg-white text-black font-bold rounded-lg"
                        >
                            Go Back
                        </button>
                    </div>
                )}
            </div>

            {/* Controls */}
            <div className="mt-12 flex flex-col items-center gap-6">
                <button
                    onClick={capture}
                    disabled={!faceDetectedInZone}
                    className={`w-20 h-20 rounded-full border-4 flex items-center justify-center transition-all duration-300 active:scale-90 ${faceDetectedInZone
                        ? 'bg-white border-green-500 shadow-[0_0_20px_rgba(255,255,255,0.4)]'
                        : 'bg-white/10 border-white/20 cursor-not-allowed'
                        }`}
                >
                    <div className={`w-14 h-14 rounded-full transition-all duration-300 ${faceDetectedInZone ? 'bg-primary' : 'bg-white/20'
                        }`} />
                </button>
                <p className="text-white/50 text-sm font-medium">Capture when the box turns green</p>
            </div>

            <canvas ref={canvasRef} className="hidden" />
        </div>
    );
};

export default SmartCamera;
