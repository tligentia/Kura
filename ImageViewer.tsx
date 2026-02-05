
import React, { useState, useRef, useEffect } from 'react';
import { 
  X, ZoomIn, ZoomOut, RotateCw, Move, 
  Sun, Contrast, Eye, Grid3X3, RefreshCcw, 
  Maximize2, ImageMinus, Ruler, Trash2, Check, Lock
} from 'lucide-react';

interface ImageViewerProps {
  src: string;
  alt?: string;
  onClose: () => void;
  viewMode: 'doctor' | 'patient';
  onAnalyze?: () => void;
}

interface Point { x: number; y: number }
interface Line { start: Point; end: Point; lengthPx: number; id: number }

export const ImageViewer: React.FC<ImageViewerProps> = ({ src, alt, onClose, viewMode, onAnalyze }) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [invert, setInvert] = useState(false);
  const [grayscale, setGrayscale] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  
  // Tools state
  const [activeTool, setActiveTool] = useState<'move' | 'measure'>('move');
  const [measureLines, setMeasureLines] = useState<Line[]>([]);
  const [currentLine, setCurrentLine] = useState<Point | null>(null); // Start point of currently drawing line
  const [tempEndPoint, setTempEndPoint] = useState<Point | null>(null);
  
  // Calibration
  const [referenceRatio, setReferenceRatio] = useState<number | null>(null); // pixels per mm
  const [showReferenceInput, setShowReferenceInput] = useState<number | null>(null); // ID of line being set as reference
  const [refInputVal, setRefInputVal] = useState('');

  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [notification, setNotification] = useState<string | null>(null);

  // Show temporary notification
  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleToolSelect = (tool: 'move' | 'measure') => {
    if (viewMode === 'patient') {
        showNotification("Función exclusiva para personal sanitario");
        return;
    }
    setActiveTool(tool);
  };

  // Reset function
  const handleReset = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setRotation(0);
    setBrightness(100);
    setContrast(100);
    setInvert(false);
    setGrayscale(false);
    setMeasureLines([]);
    setReferenceRatio(null);
  };

  // Zoom handlers
  const handleZoom = (delta: number) => {
    setScale(prev => Math.min(Math.max(0.5, prev + delta), 5));
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const getImgCoordinates = (e: React.MouseEvent) => {
    if (!imgRef.current) return { x: 0, y: 0 };
    const rect = imgRef.current.getBoundingClientRect();
    // Calculate relative to the image element itself, accounting for current scale
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;
    return { x, y };
  };

  // Drag/Draw handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (activeTool === 'move') {
        e.preventDefault();
        setIsDragging(true);
        dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y };
    } else if (activeTool === 'measure') {
        e.preventDefault();
        const coords = getImgCoordinates(e);
        setCurrentLine(coords);
        setTempEndPoint(coords);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (activeTool === 'move' && isDragging) {
        e.preventDefault();
        setPosition({
          x: e.clientX - dragStart.current.x,
          y: e.clientY - dragStart.current.y
        });
    } else if (activeTool === 'measure' && currentLine) {
        const coords = getImgCoordinates(e);
        setTempEndPoint(coords);
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (activeTool === 'move') {
        setIsDragging(false);
    } else if (activeTool === 'measure' && currentLine) {
        const coords = getImgCoordinates(e);
        const dist = Math.hypot(coords.x - currentLine.x, coords.y - currentLine.y);
        
        if (dist > 5) { // Prevent accidental clicks
            const newLine: Line = {
                start: currentLine,
                end: coords,
                lengthPx: dist,
                id: Date.now()
            };
            setMeasureLines(prev => [...prev, newLine]);
            
            // If it's the first line and no reference set, prompt for it
            if (measureLines.length === 0 && !referenceRatio) {
                setShowReferenceInput(newLine.id);
            }
        }
        setCurrentLine(null);
        setTempEndPoint(null);
    }
  };

  // Reference Logic
  const setReference = (lineId: number) => {
      const line = measureLines.find(l => l.id === lineId);
      const mm = parseFloat(refInputVal);
      if (line && mm > 0) {
          setReferenceRatio(line.lengthPx / mm);
          setShowReferenceInput(null);
          setRefInputVal('');
      }
  };

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
    handleZoom(e.deltaY * -0.001);
  };

  // Keyboard escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[200] bg-white animate-in fade-in duration-300 flex flex-col overflow-hidden">
      
      {/* HEADER TOOLBAR */}
      <div className="h-16 border-b border-gray-100 flex justify-between items-center px-6 bg-white z-20 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-red-700 rounded-lg text-white shadow-md">
            <Eye size={20} />
          </div>
          <div>
            <h3 className="font-black text-gray-900 uppercase tracking-tighter text-lg leading-tight">Visor Clínico</h3>
            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Análisis de Imagen</p>
          </div>
        </div>
        
        {/* Notificación Flotante */}
        {notification && (
            <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-4 py-2 rounded-full text-xs font-bold shadow-xl animate-in fade-in slide-in-from-top-2 z-50 flex items-center gap-2">
                <Lock size={12} className="text-red-500" /> {notification}
            </div>
        )}

        <div className="flex items-center gap-2">
           <div className="hidden md:flex items-center gap-1 bg-gray-50 p-1 rounded-xl border border-gray-100 mr-4">
              <span className="text-[9px] font-bold text-gray-400 uppercase px-2">Zoom: {Math.round(scale * 100)}%</span>
           </div>
           <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-red-700 transition-colors"
          >
            <X size={24} />
          </button>
        </div>
      </div>

      {/* MAIN VIEWPORT */}
      <div 
        ref={containerRef}
        className={`flex-1 relative bg-gray-50 overflow-hidden flex items-center justify-center ${activeTool === 'move' ? 'cursor-move' : 'cursor-crosshair'}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        {/* Grid Overlay */}
        {showGrid && (
          <div 
            className="absolute inset-0 z-10 pointer-events-none opacity-20"
            style={{
                backgroundImage: `linear-gradient(#ef4444 1px, transparent 1px), linear-gradient(90deg, #ef4444 1px, transparent 1px)`,
                backgroundSize: `${20 * scale}px ${20 * scale}px` // Scales with image
            }}
          />
        )}

        {/* Image Container with Transforms */}
        <div 
          className="transition-transform duration-75 ease-linear will-change-transform relative"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
          }}
        >
          <img 
            ref={imgRef}
            src={src} 
            alt={alt || "Clinical view"} 
            className="max-w-[90vw] max-h-[80vh] object-contain shadow-2xl pointer-events-none select-none"
            style={{
                filter: `brightness(${brightness}%) contrast(${contrast}%) invert(${invert ? 100 : 0}%) grayscale(${grayscale ? 100 : 0}%)`
            }}
          />
          
          {/* SVG Overlay for Measurements (Inside Transform Context to scale with image) */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
              {measureLines.map(line => {
                  const mmLength = referenceRatio ? (line.lengthPx / referenceRatio).toFixed(1) + ' mm' : Math.round(line.lengthPx) + ' px';
                  return (
                    <g key={line.id}>
                        <line 
                            x1={line.start.x} y1={line.start.y} 
                            x2={line.end.x} y2={line.end.y} 
                            stroke="#ef4444" strokeWidth={2 / scale} 
                        />
                        <line 
                            x1={line.start.x} y1={line.start.y} 
                            x2={line.end.x} y2={line.end.y} 
                            stroke="white" strokeWidth={4 / scale} strokeOpacity={0.5}
                        />
                        <circle cx={line.start.x} cy={line.start.y} r={3 / scale} fill="#ef4444" stroke="white" strokeWidth={1} />
                        <circle cx={line.end.x} cy={line.end.y} r={3 / scale} fill="#ef4444" stroke="white" strokeWidth={1} />
                        
                        {/* Label Background */}
                        <rect 
                            x={(line.start.x + line.end.x) / 2 - 20 / scale} 
                            y={(line.start.y + line.end.y) / 2 - 10 / scale} 
                            width={50 / scale} height={14 / scale} 
                            rx={4 / scale} fill="rgba(0,0,0,0.8)" 
                        />
                        {/* Label Text */}
                        <text 
                            x={(line.start.x + line.end.x) / 2} 
                            y={(line.start.y + line.end.y) / 2} 
                            dy={3 / scale}
                            textAnchor="middle" 
                            fill="white" 
                            fontSize={8 / scale} 
                            fontWeight="bold"
                        >
                            {mmLength}
                        </text>
                    </g>
                  );
              })}
              {/* Currently Drawing Line */}
              {activeTool === 'measure' && currentLine && tempEndPoint && (
                  <line 
                    x1={currentLine.x} y1={currentLine.y} 
                    x2={tempEndPoint.x} y2={tempEndPoint.y} 
                    stroke="#ef4444" strokeWidth={2 / scale} strokeDasharray={4 / scale}
                  />
              )}
          </svg>
        </div>

        {/* Floating Reference Input */}
        {showReferenceInput && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-4 rounded-2xl shadow-2xl border border-gray-100 z-50 animate-in zoom-in-95 w-64">
                <h4 className="text-xs font-black uppercase text-gray-900 mb-2">Calibrar Referencia</h4>
                <p className="text-[10px] text-gray-500 mb-3">Introduce la longitud real de la línea dibujada para calibrar el resto de mediciones.</p>
                <div className="flex gap-2">
                    <input 
                        type="number" 
                        autoFocus
                        value={refInputVal}
                        onChange={e => setRefInputVal(e.target.value)}
                        placeholder="mm"
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-xs font-bold outline-none focus:ring-1 focus:ring-red-700"
                    />
                    <button 
                        onClick={() => setReference(showReferenceInput)}
                        className="bg-red-700 text-white rounded-lg px-3 py-1 text-xs font-black"
                    >
                        OK
                    </button>
                    <button 
                        onClick={() => { setShowReferenceInput(null); setRefInputVal(''); }}
                        className="bg-gray-100 text-gray-500 rounded-lg px-2 py-1"
                    >
                        <X size={14} />
                    </button>
                </div>
            </div>
        )}

        {/* Floating Reset Button when modified */}
        {(scale !== 1 || position.x !== 0 || measureLines.length > 0) && (
            <button 
                onClick={handleReset}
                className="absolute bottom-6 right-6 z-20 bg-gray-900 text-white px-4 py-2 rounded-full shadow-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:bg-black transition-all"
            >
                <RefreshCcw size={12} /> Reset
            </button>
        )}
      </div>

      {/* BOTTOM TOOLBAR (CONTROLS) */}
      <div className="h-24 md:h-20 bg-white border-t border-gray-100 px-4 md:px-8 flex items-center justify-center md:justify-between gap-4 overflow-x-auto no-scrollbar z-20">
         
         <div className="flex items-center gap-2 md:gap-4 w-full md:w-auto justify-between md:justify-start">
            {/* Tools Group (Doctor Only) */}
            <div className={`flex items-center gap-1 p-1.5 rounded-xl border border-gray-100 ${viewMode === 'patient' ? 'opacity-50 grayscale' : 'bg-gray-50'}`}>
                <button 
                    onClick={() => handleToolSelect('move')} 
                    className={`p-2 rounded-lg transition-all ${activeTool === 'move' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-900'}`}
                    title="Mover Imagen"
                >
                    <Move size={18} />
                </button>
                <button 
                    onClick={() => handleToolSelect('measure')} 
                    className={`p-2 rounded-lg transition-all ${activeTool === 'measure' ? 'bg-white text-red-700 shadow-sm' : 'text-gray-400 hover:text-gray-900'}`}
                    title="Medir / Referencia (Profesional)"
                >
                    <Ruler size={18} />
                </button>
            </div>

            {/* Adjustments Group */}
            <div className="flex items-center gap-1 bg-gray-50 p-1.5 rounded-xl border border-gray-100">
                 <button 
                    onClick={() => setBrightness(b => b === 100 ? 125 : (b === 125 ? 150 : 100))} 
                    className={`p-2 rounded-lg transition-all ${brightness > 100 ? 'bg-white text-red-700 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                    title="Brillo"
                 >
                    <Sun size={18} />
                 </button>
                 <button 
                    onClick={() => setContrast(c => c === 100 ? 125 : (c === 125 ? 150 : 100))} 
                    className={`p-2 rounded-lg transition-all ${contrast > 100 ? 'bg-white text-red-700 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                    title="Contraste"
                 >
                    <Contrast size={18} />
                 </button>
                 <button 
                    onClick={() => setInvert(!invert)} 
                    className={`p-2 rounded-lg transition-all ${invert ? 'bg-red-700 text-white shadow-md' : 'text-gray-500 hover:text-gray-900'}`}
                    title="Invertir (Vascularización)"
                 >
                    <ImageMinus size={18} />
                 </button>
                 <button 
                    onClick={() => setGrayscale(!grayscale)} 
                    className={`p-2 rounded-lg transition-all ${grayscale ? 'bg-gray-900 text-white shadow-md' : 'text-gray-500 hover:text-gray-900'}`}
                    title="Escala de Grises"
                 >
                    <Contrast size={18} className="rotate-90" />
                 </button>
            </div>

            {/* View Tools */}
            <div className="flex items-center gap-1 bg-gray-50 p-1.5 rounded-xl border border-gray-100 hidden sm:flex">
                 <button 
                    onClick={() => handleZoom(-0.25)} 
                    className="p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-white transition-all"
                    title="Alejar"
                >
                    <ZoomOut size={18} />
                </button>
                 <button 
                    onClick={() => handleZoom(0.25)} 
                    className="p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-white transition-all"
                    title="Acercar"
                >
                    <ZoomIn size={18} />
                </button>
                 <button 
                    onClick={handleRotate} 
                    className="p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-white transition-all"
                    title="Rotar"
                >
                    <RotateCw size={18} />
                </button>
                <div className="w-px h-6 bg-gray-200 mx-1" />
                <button 
                    onClick={() => setShowGrid(!showGrid)} 
                    className={`p-2 rounded-lg transition-all ${showGrid ? 'bg-white text-red-700 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                    title="Cuadrícula"
                >
                    <Grid3X3 size={18} />
                </button>
            </div>
         </div>

         <div className="hidden md:flex flex-col items-end">
             <span className="text-[10px] font-black uppercase text-gray-300 tracking-widest">Kurae Medical Viewer</span>
             <span className="text-[9px] font-bold text-gray-300">v1.0.4</span>
         </div>

      </div>
    </div>
  );
};
