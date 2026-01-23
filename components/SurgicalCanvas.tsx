
import React, { useRef, useEffect, useState, useCallback } from 'react';

interface SurgicalCanvasProps {
  image: string;
  onSave: (maskBase64: string) => void;
  onCancel: () => void;
}

const SurgicalCanvas: React.FC<SurgicalCanvasProps> = ({ image, onSave, onCancel }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [brushSize, setBrushSize] = useState(30);

  // History management for Undo/Redo
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Helper to apply brush styles to the canvas context
  const updateBrushStyle = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = '#D71A21'; // Solid Brand Red
    ctx.fillStyle = '#D71A21';   // Solid Brand Red for the auto-fill
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, [brushSize]);

  // Re-apply styles whenever brush size changes
  useEffect(() => {
    updateBrushStyle();
  }, [brushSize, updateBrushStyle]);

  const saveToHistory = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const currentData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // If we're not at the end of the history (because of undos), clear the forward history
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(currentData);

    // Keep history manageable (last 30 steps)
    if (newHistory.length > 30) {
      newHistory.shift();
      setHistoryIndex(newHistory.length - 1);
    } else {
      setHistoryIndex(newHistory.length - 1);
    }

    setHistory(newHistory);
    setHasDrawn(true);
  }, [history, historyIndex]);

  const undo = useCallback(() => {
    if (historyIndex <= 0) {
      if (historyIndex === 0) {
        clear();
        setHistoryIndex(-1);
      }
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prevIndex = historyIndex - 1;
    const prevState = history[prevIndex];
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.putImageData(prevState, 0, 0);
    setHistoryIndex(prevIndex);
    updateBrushStyle(); // Restore styles after clearing
  }, [history, historyIndex, updateBrushStyle]);

  const redo = useCallback(() => {
    if (historyIndex >= history.length - 1) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const nextIndex = historyIndex + 1;
    const nextState = history[nextIndex];
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.putImageData(nextState, 0, 0);
    setHistoryIndex(nextIndex);
    updateBrushStyle(); // Restore styles after clearing
  }, [history, historyIndex, updateBrushStyle]);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    updateBrushStyle();

    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    draw(e);
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.closePath();
        ctx.fill();
        ctx.stroke(); // Re-stroke to ensure the boundary is crisp after fill
      }
      saveToHistory();
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
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    setHistory([]);
    setHistoryIndex(-1);
    updateBrushStyle();
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    onSave(canvas.toDataURL('image/png'));
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]); // Use memoized functions as dependencies

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/95 flex flex-col items-center justify-center p-4 md:p-8 overflow-hidden backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden relative max-w-5xl max-h-full flex flex-col w-full h-full md:h-auto">
        {/* Top-Right Responsive Visual Guide (Step 2 GIF) - Moved Outside Image Area */}
        <div className="absolute top-[80px] right-4 z-[110] animate-in fade-in slide-in-from-right-4 duration-500 pointer-events-none">
          <div className="bg-white p-2 rounded-xl shadow-2xl border border-slate-200 pointer-events-auto max-w-[140px] md:max-w-none transition-all hover:scale-105">
            <div className="flex items-center gap-2 mb-2 px-1">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
              <span className="text-[10px] font-bold text-secondary uppercase tracking-tighter font-poppins">Guide: How to Draw</span>
            </div>
            <div className="w-28 md:w-48 aspect-video rounded-lg overflow-hidden border border-slate-100 bg-slate-50">
              <img
                src="/how-it-works/step2.gif"
                alt="How to draw guide"
                className="w-full h-full object-cover"
                onError={(e) => (e.currentTarget.parentElement!.parentElement!.style.display = 'none')}
              />
            </div>
          </div>
        </div>

        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap gap-4 justify-between items-center shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-primary rounded-full animate-pulse"></div>
            <h4 className="text-base font-bold text-secondary uppercase tracking-wider font-poppins">Draw Hairline Area</h4>
          </div>

          <div className="flex items-center space-x-4 md:space-x-8">
            {/* Undo/Redo Controls */}
            <div className="flex items-center bg-white border border-slate-200 rounded-lg p-1 shadow-sm">
              <button
                onClick={undo}
                disabled={historyIndex < 0}
                className={`p-2 rounded hover:bg-slate-100 transition ${historyIndex < 0 ? 'opacity-30 cursor-not-allowed' : 'text-slate-700'}`}
                title="Undo (Ctrl+Z)"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6" /><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" /></svg>
              </button>
              <button
                onClick={redo}
                disabled={historyIndex >= history.length - 1}
                className={`p-2 rounded hover:bg-slate-100 transition ${historyIndex >= history.length - 1 ? 'opacity-30 cursor-not-allowed' : 'text-slate-700'}`}
                title="Redo (Ctrl+Y)"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 7v6h-6" /><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7" /></svg>
              </button>
            </div>

            {/* Brush Controls */}
            <div className="flex items-center space-x-3">
              <span className="text-xs font-bold text-slate-500 uppercase">Brush Size</span>
              <input
                type="range"
                min="5"
                max="80"
                value={brushSize}
                onChange={(e) => setBrushSize(parseInt(e.target.value))}
                className="w-24 md:w-32 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary"
              />
            </div>
          </div>
        </div>

        {/* Canvas Container */}
        <div className="relative flex-grow bg-slate-200/50 overflow-auto flex items-center justify-center p-4 md:p-10 cursor-crosshair">
          <div className="relative inline-block shadow-2xl border border-slate-300 bg-white leading-[0]">
            <img
              src={image}
              alt="Base"
              className="max-h-[75vh] w-auto h-auto block pointer-events-none select-none"
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
              className="absolute inset-0 w-full h-full touch-none opacity-60"
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
          <p className="hidden md:block text-xs text-slate-500 font-medium mr-auto">
            <span className="text-red-600 font-bold">Important:</span> Paint solidly over the bald area.
          </p>
          <button
            onClick={clear}
            className="px-4 py-2 text-sm font-bold text-slate-600 hover:text-slate-800 transition"
          >
            Clear
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-bold text-slate-400 hover:text-slate-600 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!hasDrawn}
            className={`px-6 py-2 rounded-lg text-sm font-bold text-white shadow-md transition font-poppins ${hasDrawn ? 'bg-primary hover:bg-primary/90' : 'bg-slate-300 cursor-not-allowed'}`}
          >
            Use Selection
          </button>
        </div>
      </div>
      <p className="mt-4 text-white/70 text-sm text-center font-medium shadow-black drop-shadow-md">
        The AI will ONLY add hair to brand areas. Leave unselected areas empty.
      </p>
    </div>
  );
};

export default SurgicalCanvas;
