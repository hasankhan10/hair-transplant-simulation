
import React, { useRef, useEffect, useState } from 'react';

interface SurgicalCanvasProps {
  image: string;
  onSave: (maskBase64: string) => void;
  onCancel: () => void;
}

const SurgicalCanvas: React.FC<SurgicalCanvasProps> = ({ image, onSave, onCancel }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [brushSize, setBrushSize] = useState(30); // Default slightly larger

  // Helper to apply brush styles to the canvas context
  const updateBrushStyle = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Increased opacity (0.85) to make the mask very clear for the AI, 
    // while still allowing the user to see wrinkles underneath for placement.
    ctx.strokeStyle = 'rgba(220, 38, 38, 0.85)';
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  };

  // Re-apply styles whenever brush size changes
  useEffect(() => {
    updateBrushStyle();
  }, [brushSize]);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Safety check: ensure styles are correct before drawing starts
    if (ctx.lineWidth !== brushSize) {
      updateBrushStyle();
    }

    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    draw(e);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.beginPath(); // Reset path so next stroke is separate
    }
  };

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasDrawn(true);
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    onSave(canvas.toDataURL('image/png'));
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/95 flex flex-col items-center justify-center p-4 md:p-8 overflow-hidden backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden relative max-w-5xl max-h-full flex flex-col w-full h-full md:h-auto">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse"></div>
            <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Draw Hairline Area</h4>
          </div>
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-3">
              <span className="text-xs font-bold text-slate-500 uppercase">Brush Size</span>
              <input
                type="range"
                min="5"
                max="80"
                value={brushSize}
                onChange={(e) => setBrushSize(parseInt(e.target.value))}
                className="w-32 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-red-600"
              />
            </div>
          </div>
        </div>

        {/* Canvas Container */}
        <div className="relative flex-grow bg-slate-200/50 overflow-hidden flex items-center justify-center p-2 md:p-6 cursor-crosshair">
          <div className="relative shadow-2xl border border-slate-300 bg-white max-h-full max-w-full">
            <img
              src={image}
              alt="Base"
              className="max-h-[60vh] md:max-h-[70vh] max-w-full block pointer-events-none select-none object-contain"
              onLoad={(e) => {
                const img = e.currentTarget;
                if (canvasRef.current) {
                  canvasRef.current.width = img.naturalWidth;
                  canvasRef.current.height = img.naturalHeight;
                  updateBrushStyle();
                }
              }}
            />
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full touch-none"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
          </div>
        </div>

        <div className="p-4 bg-white border-t border-slate-200 flex space-x-3 justify-end items-center shrink-0">
          <p className="text-[10px] text-slate-500 font-medium mr-auto">
            <span className="text-red-600 font-bold">Important:</span> Paint solidly over the bald area.
          </p>
          <button
            onClick={clear}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 transition"
          >
            Clear
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-slate-600 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!hasDrawn}
            className={`px-6 py-2 rounded-lg text-xs font-bold text-white shadow-md transition ${hasDrawn ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-300 cursor-not-allowed'}`}
          >
            Use Selection
          </button>
        </div>
      </div>
      <p className="mt-4 text-white/70 text-xs text-center font-medium shadow-black drop-shadow-md">
        The AI will ONLY add hair to red areas. Leave unselected areas empty.
      </p>
    </div>
  );
};

export default SurgicalCanvas;
