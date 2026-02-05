
import React, { useState, useRef, useEffect } from 'react';
import { 
  X, ZoomIn, ZoomOut, RotateCw, Move, 
  Sun, Contrast, Eye, Grid3X3, RefreshCcw, 
  Maximize2, ImageMinus, Ruler, Trash2, Check, Lock,
  Pentagon, ScanEye, MousePointer2, Undo2, EyeOff, ClipboardList, Layers
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
interface Polygon { points: Point[]; areaPx: number; id: number }

interface TextureData {
  id: number;
  x: number;
  y: number;
  granulation: number; // % Red/Healthy
  slough: number;      // % Yellow/Fibrin
  necrosis: number;    // % Black/Dead
  other: number;
  label: string;
  color: string;
}

export const ImageViewer: React.FC<ImageViewerProps> = ({ src, alt, onClose, viewMode, onAnalyze }) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [invert, setInvert] = useState(false);
  const [grayscale, setGrayscale] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [layersHidden, setLayersHidden] = useState(false);
  
  // Tools state
  const [activeTool, setActiveTool] = useState<'move' | 'measure' | 'area' | 'texture'>('move');
  
  // Linear Measurement
  const [measureLines, setMeasureLines] = useState<Line[]>([]);
  const [currentLine, setCurrentLine] = useState<Point | null>(null);
  const [tempEndPoint, setTempEndPoint] = useState<Point | null>(null);
  
  // Area Measurement
  const [polygons, setPolygons] = useState<Polygon[]>([]);
  const [currentPolyPoints, setCurrentPolyPoints] = useState<Point[]>([]);

  // Texture Analysis
  const [textureSamples, setTextureSamples] = useState<TextureData[]>([]);
  const [cursorPos, setCursorPos] = useState<Point | null>(null); // For hover effect only
  
  // Calibration
  const [referenceRatio, setReferenceRatio] = useState<number | null>(null); // pixels per mm
  const [showReferenceInput, setShowReferenceInput] = useState<number | null>(null);
  const [refInputVal, setRefInputVal] = useState('');

  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null); // For pixel reading
  const [notification, setNotification] = useState<string | null>(null);

  // --- PERSISTENCE LOGIC ---
  const getStorageKey = (url: string) => `kurae_layers_${btoa(url).slice(0, 32)}`;

  // Load Layers
  useEffect(() => {
    if (!src) return;
    try {
        const savedData = localStorage.getItem(getStorageKey(src));
        if (savedData) {
            const parsed = JSON.parse(savedData);
            if (parsed.lines) setMeasureLines(parsed.lines);
            if (parsed.polygons) setPolygons(parsed.polygons);
            if (parsed.textures) setTextureSamples(parsed.textures);
            if (parsed.ratio) setReferenceRatio(parsed.ratio);
        }
    } catch (e) {
        console.error("Error loading annotations", e);
    }
  }, [src]);

  // Save Layers
  useEffect(() => {
    if (!src) return;
    const dataToSave = {
        lines: measureLines,
        polygons: polygons,
        textures: textureSamples,
        ratio: referenceRatio
    };
    localStorage.setItem(getStorageKey(src), JSON.stringify(dataToSave));
  }, [measureLines, polygons, textureSamples, referenceRatio, src]);


  // Initialize hidden canvas for texture analysis
  useEffect(() => {
    if (!src) return;
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = src;
    img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(img, 0, 0);
            canvasRef.current = canvas;
        }
    };
  }, [src]);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleToolSelect = (tool: 'move' | 'measure' | 'area' | 'texture') => {
    if (viewMode === 'patient') {
        showNotification("Función exclusiva para personal sanitario");
        return;
    }
    setActiveTool(tool);
    // Reset temporary states when switching
    setCurrentLine(null);
    setCurrentPolyPoints([]);
    setCursorPos(null);
  };

  const handleReset = () => {
    if(confirm("¿Borrar todas las mediciones y reiniciar vista?")) {
        setScale(1);
        setPosition({ x: 0, y: 0 });
        setRotation(0);
        setBrightness(100);
        setContrast(100);
        setInvert(false);
        setGrayscale(false);
        setMeasureLines([]);
        setPolygons([]);
        setTextureSamples([]);
        setReferenceRatio(null);
        localStorage.removeItem(getStorageKey(src));
    }
  };

  const handleUndo = () => {
    // Find the latest action across all arrays based on timestamp ID
    const lastLine = measureLines.length > 0 ? measureLines[measureLines.length - 1] : null;
    const lastPoly = polygons.length > 0 ? polygons[polygons.length - 1] : null;
    const lastTexture = textureSamples.length > 0 ? textureSamples[textureSamples.length - 1] : null;

    const times = [
        lastLine ? lastLine.id : 0,
        lastPoly ? lastPoly.id : 0,
        lastTexture ? lastTexture.id : 0
    ];

    const maxTime = Math.max(...times);
    if (maxTime === 0) return; // Nothing to undo

    if (lastLine && lastLine.id === maxTime) {
        setMeasureLines(prev => prev.slice(0, -1));
        // Reset ratio if we deleted the calibration line
        if (measureLines.length === 1 && referenceRatio) setReferenceRatio(null);
    } else if (lastPoly && lastPoly.id === maxTime) {
        setPolygons(prev => prev.slice(0, -1));
    } else if (lastTexture && lastTexture.id === maxTime) {
        setTextureSamples(prev => prev.slice(0, -1));
    }
  };

  const generateSummary = () => {
    let text = "📋 **Resumen Clínico - Kurae**\n";
    text += `Fecha: ${new Date().toLocaleDateString()}\n\n`;

    if (referenceRatio) {
        text += `📏 **Mediciones Lineales:**\n`;
        measureLines.forEach((l, i) => {
            const mm = (l.lengthPx / referenceRatio).toFixed(1);
            text += `- L${i + 1}: ${mm} mm\n`;
        });
        const totalLen = measureLines.reduce((acc, l) => acc + (l.lengthPx / referenceRatio), 0).toFixed(1);
        text += `> Total Lineal: ${totalLen} mm\n\n`;
    }

    if (polygons.length > 0 && referenceRatio) {
        text += `📐 **Áreas:**\n`;
        let totalArea = 0;
        polygons.forEach((p, i) => {
            const mm2 = p.areaPx / (referenceRatio * referenceRatio);
            const cm2 = mm2 / 100;
            totalArea += cm2;
            text += `- Área ${i + 1}: ${cm2.toFixed(2)} cm²\n`;
        });
        text += `> Superficie Total: ${totalArea.toFixed(2)} cm²\n\n`;
    }

    if (textureSamples.length > 0) {
        text += `🔬 **Análisis Tisular (Muestras):**\n`;
        let avgGran = 0, avgSlough = 0, avgNecro = 0;
        textureSamples.forEach((t, i) => {
            avgGran += t.granulation;
            avgSlough += t.slough;
            avgNecro += t.necrosis;
            text += `- Punto ${i + 1}: ${t.label} (G:${t.granulation}% E:${t.slough}% N:${t.necrosis}%)\n`;
        });
        const count = textureSamples.length;
        text += `\n> **Promedio Tisular:**\n`;
        text += `> 🔴 Granulación: ${(avgGran/count).toFixed(0)}%\n`;
        text += `> 🟡 Esfacelo: ${(avgSlough/count).toFixed(0)}%\n`;
        text += `> ⚫ Necrosis: ${(avgNecro/count).toFixed(0)}%\n`;
    }

    navigator.clipboard.writeText(text);
    showNotification("Resumen copiado al portapapeles");
  };

  const handleZoom = (delta: number) => {
    setScale(prev => Math.min(Math.max(0.5, prev + delta), 5));
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const getImgCoordinates = (e: React.MouseEvent) => {
    if (!imgRef.current) return { x: 0, y: 0 };
    const rect = imgRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;
    return { x, y };
  };

  // --- AREA ALGORITHM (Shoelace Formula) ---
  const calculatePolygonArea = (points: Point[]): number => {
      let area = 0;
      for (let i = 0; i < points.length; i++) {
          let j = (i + 1) % points.length;
          area += points[i].x * points[j].y;
          area -= points[j].x * points[i].y;
      }
      return Math.abs(area / 2);
  };

  // --- TEXTURE ANALYSIS ALGORITHM ---
  const analyzeTissue = (x: number, y: number, save: boolean = false) => {
      if (!canvasRef.current) return;
      const ctx = canvasRef.current.getContext('2d');
      if (!ctx) return;

      // Sample radius
      const r = 15; 
      // Ensure bounds
      const sx = Math.max(0, x - r);
      const sy = Math.max(0, y - r);
      const sw = Math.min(canvasRef.current.width - sx, r * 2);
      const sh = Math.min(canvasRef.current.height - sy, r * 2);

      try {
          const imageData = ctx.getImageData(sx, sy, sw, sh);
          const data = imageData.data;
          let pixels = 0;
          let counts = { gran: 0, slough: 0, necro: 0, skin: 0 };

          for (let i = 0; i < data.length; i += 4) {
              const r = data[i];
              const g = data[i + 1];
              const b = data[i + 2];
              
              const brightness = (r + g + b) / 3;
              if (brightness < 40) counts.necro++;
              else if (r > g + 30 && r > b + 30) counts.gran++; 
              else if (r > 150 && g > 150 && b < 140) counts.slough++; 
              else counts.skin++;
              pixels++;
          }

          const total = Math.max(1, pixels);
          const granPct = Math.round((counts.gran / total) * 100);
          const sloughPct = Math.round((counts.slough / total) * 100);
          const necroPct = Math.round((counts.necro / total) * 100);
          const otherPct = 100 - (granPct + sloughPct + necroPct);

          let label = 'Piel/Otro';
          let color = '#9ca3af';

          if (necroPct > 15) { label = 'Necrosis'; color = '#000000'; }
          else if (sloughPct > 20) { label = 'Esfacelo'; color = '#fbbf24'; }
          else if (granPct > 20) { label = 'Granulación'; color = '#ef4444'; }

          if (save) {
              const newSample: TextureData = {
                  id: Date.now(),
                  x, y,
                  granulation: granPct,
                  slough: sloughPct,
                  necrosis: necroPct,
                  other: otherPct,
                  label,
                  color
              };
              setTextureSamples(prev => [...prev, newSample]);
          }

      } catch (e) {
          console.warn("Pixel access restricted");
      }
  };

  // --- MOUSE HANDLERS ---
  const handleMouseDown = (e: React.MouseEvent) => {
    if (layersHidden) return; // Cannot edit if layers are hidden
    
    if (activeTool === 'move') {
        e.preventDefault();
        setIsDragging(true);
        dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y };
    } else if (activeTool === 'measure') {
        e.preventDefault();
        const coords = getImgCoordinates(e);
        setCurrentLine(coords);
        setTempEndPoint(coords);
    } else if (activeTool === 'area') {
        e.preventDefault();
        const coords = getImgCoordinates(e);
        if (currentPolyPoints.length > 2) {
            const first = currentPolyPoints[0];
            const dist = Math.hypot(coords.x - first.x, coords.y - first.y);
            if (dist < 15 / scale) {
                const area = calculatePolygonArea(currentPolyPoints);
                setPolygons(prev => [...prev, { points: currentPolyPoints, areaPx: area, id: Date.now() }]);
                setCurrentPolyPoints([]);
                return;
            }
        }
        setCurrentPolyPoints(prev => [...prev, coords]);
    } else if (activeTool === 'texture') {
        const coords = getImgCoordinates(e);
        analyzeTissue(coords.x, coords.y, true); // Save point
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const coords = getImgCoordinates(e);
    
    if (activeTool === 'move' && isDragging) {
        e.preventDefault();
        setPosition({
          x: e.clientX - dragStart.current.x,
          y: e.clientY - dragStart.current.y
        });
    } else if (activeTool === 'measure' && currentLine) {
        setTempEndPoint(coords);
    } else if (activeTool === 'texture') {
        setCursorPos(coords);
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (activeTool === 'move') {
        setIsDragging(false);
    } else if (activeTool === 'measure' && currentLine) {
        const coords = getImgCoordinates(e);
        const dist = Math.hypot(coords.x - currentLine.x, coords.y - currentLine.y);
        
        if (dist > 5) {
            const newLine: Line = {
                start: currentLine,
                end: coords,
                lengthPx: dist,
                id: Date.now()
            };
            setMeasureLines(prev => [...prev, newLine]);
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

  const handleWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
    handleZoom(e.deltaY * -0.001);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
          if (currentPolyPoints.length > 0) setCurrentPolyPoints([]);
          else onClose();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
          handleUndo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, currentPolyPoints, measureLines, polygons, textureSamples]);

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
            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Análisis y Capas</p>
          </div>
        </div>
        
        {notification && (
            <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-4 py-2 rounded-full text-xs font-bold shadow-xl animate-in fade-in slide-in-from-top-2 z-50 flex items-center gap-2">
                <Check size={12} className="text-green-500" /> {notification}
            </div>
        )}

        <div className="flex items-center gap-2">
           <div className="hidden md:flex items-center gap-1 bg-gray-50 p-1 rounded-xl border border-gray-100 mr-4">
              <span className="text-[9px] font-bold text-gray-400 uppercase px-2">Zoom: {Math.round(scale * 100)}%</span>
           </div>
           <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-red-700 transition-colors">
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
                backgroundSize: `${20 * scale}px ${20 * scale}px`
            }}
          />
        )}

        {/* Image Container */}
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
          
          {/* SVG Overlay (Only if Layers are Visible) */}
          {!layersHidden && (
            <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
              
              {/* MEASURE LINES */}
              {measureLines.map(line => {
                  const mmLength = referenceRatio ? (line.lengthPx / referenceRatio).toFixed(1) + ' mm' : Math.round(line.lengthPx) + ' px';
                  return (
                    <g key={line.id}>
                        <line x1={line.start.x} y1={line.start.y} x2={line.end.x} y2={line.end.y} stroke="#ef4444" strokeWidth={2 / scale} />
                        <circle cx={line.start.x} cy={line.start.y} r={3 / scale} fill="#ef4444" />
                        <circle cx={line.end.x} cy={line.end.y} r={3 / scale} fill="#ef4444" />
                        <rect x={(line.start.x + line.end.x) / 2 - 20 / scale} y={(line.start.y + line.end.y) / 2 - 10 / scale} width={50 / scale} height={14 / scale} rx={4 / scale} fill="rgba(0,0,0,0.8)" />
                        <text x={(line.start.x + line.end.x) / 2} y={(line.start.y + line.end.y) / 2} dy={3 / scale} textAnchor="middle" fill="white" fontSize={8 / scale} fontWeight="bold">{mmLength}</text>
                    </g>
                  );
              })}
              {activeTool === 'measure' && currentLine && tempEndPoint && (
                  <line x1={currentLine.x} y1={currentLine.y} x2={tempEndPoint.x} y2={tempEndPoint.y} stroke="#ef4444" strokeWidth={2 / scale} strokeDasharray={4 / scale} />
              )}

              {/* POLYGONS (AREA) */}
              {polygons.map((poly, idx) => {
                  const pointsStr = poly.points.map(p => `${p.x},${p.y}`).join(' ');
                  // Calculate area in cm2 if reference exists, else pixels
                  let areaLabel = Math.round(poly.areaPx).toLocaleString() + ' px²';
                  if (referenceRatio) {
                      const areaMm2 = poly.areaPx / (referenceRatio * referenceRatio);
                      areaLabel = (areaMm2 / 100).toFixed(2) + ' cm²';
                  }

                  const center = poly.points.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
                  center.x /= poly.points.length;
                  center.y /= poly.points.length;

                  return (
                      <g key={poly.id}>
                          <polygon points={pointsStr} fill="rgba(239, 68, 68, 0.2)" stroke="#ef4444" strokeWidth={2 / scale} />
                          <rect x={center.x - 30 / scale} y={center.y - 8 / scale} width={60 / scale} height={16 / scale} rx={4 / scale} fill="rgba(0,0,0,0.8)" />
                          <text x={center.x} y={center.y} dy={4 / scale} textAnchor="middle" fill="white" fontSize={8 / scale} fontWeight="bold">#{idx+1} {areaLabel}</text>
                      </g>
                  );
              })}
              
              {/* CURRENT DRAWING POLYGON */}
              {activeTool === 'area' && currentPolyPoints.length > 0 && (
                  <g>
                      <polyline points={currentPolyPoints.map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke="#ef4444" strokeWidth={2 / scale} strokeDasharray={4 / scale} />
                      {currentPolyPoints.map((p, i) => (
                          <circle key={i} cx={p.x} cy={p.y} r={3 / scale} fill={i === 0 ? "#22c55e" : "white"} stroke="#ef4444" strokeWidth={1} />
                      ))}
                  </g>
              )}

              {/* SAVED TEXTURE POINTS */}
              {textureSamples.map((t, i) => (
                 <g key={t.id}>
                    <circle cx={t.x} cy={t.y} r={15 / scale} fill="none" stroke={t.color} strokeWidth={2 / scale} />
                    <line x1={t.x - 20/scale} y1={t.y} x2={t.x + 20/scale} y2={t.y} stroke={t.color} strokeWidth={1 / scale} />
                    <line x1={t.x} y1={t.y - 20/scale} x2={t.x} y2={t.y + 20/scale} stroke={t.color} strokeWidth={1 / scale} />
                    <rect x={t.x + 20/scale} y={t.y - 10/scale} width={40/scale} height={12/scale} rx={2} fill="rgba(0,0,0,0.7)" />
                    <text x={t.x + 40/scale} y={t.y} dy={3/scale} textAnchor="middle" fill="white" fontSize={8/scale} fontWeight="bold">T{i+1}</text>
                 </g>
              ))}

              {/* CURRENT CURSOR TEXTURE PROBE */}
              {activeTool === 'texture' && cursorPos && (
                  <g>
                      <circle cx={cursorPos.x} cy={cursorPos.y} r={15 / scale} fill="none" stroke="#ef4444" strokeWidth={2 / scale} strokeDasharray={2 / scale} />
                  </g>
              )}
            </svg>
          )}
        </div>

        {/* Floating Reference Input */}
        {showReferenceInput && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-4 rounded-2xl shadow-2xl border border-gray-100 z-50 animate-in zoom-in-95 w-64">
                <h4 className="text-xs font-black uppercase text-gray-900 mb-2">Calibrar Referencia</h4>
                <div className="flex gap-2">
                    <input type="number" autoFocus value={refInputVal} onChange={e => setRefInputVal(e.target.value)} placeholder="mm" className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-xs font-bold outline-none focus:ring-1 focus:ring-red-700" />
                    <button onClick={() => setReference(showReferenceInput)} className="bg-red-700 text-white rounded-lg px-3 py-1 text-xs font-black">OK</button>
                    <button onClick={() => { setShowReferenceInput(null); setRefInputVal(''); }} className="bg-gray-100 text-gray-500 rounded-lg px-2 py-1"><X size={14} /></button>
                </div>
            </div>
        )}

        {/* LAYER HUD - Only show if we have annotations */}
        {(measureLines.length > 0 || polygons.length > 0 || textureSamples.length > 0) && (
             <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md rounded-xl shadow-sm border border-gray-100 p-2 z-30 flex flex-col gap-2 animate-in slide-in-from-left-4">
                 <button 
                    onClick={() => setLayersHidden(!layersHidden)}
                    className={`p-2 rounded-lg transition-all ${layersHidden ? 'bg-red-50 text-red-700' : 'hover:bg-gray-100 text-gray-600'}`}
                    title={layersHidden ? "Mostrar Capas" : "Ocultar Capas"}
                 >
                    {layersHidden ? <EyeOff size={16} /> : <Layers size={16} />}
                 </button>
                 
                 <button 
                    onClick={generateSummary}
                    className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 hover:text-blue-700 transition-all"
                    title="Copiar Resumen al Portapapeles"
                 >
                    <ClipboardList size={16} />
                 </button>

                 <button 
                    onClick={handleUndo}
                    className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 hover:text-orange-700 transition-all"
                    title="Deshacer última marca"
                 >
                    <Undo2 size={16} />
                 </button>
             </div>
        )}

        {/* Floating Reset Button */}
        {(scale !== 1 || position.x !== 0 || measureLines.length > 0 || polygons.length > 0) && (
            <button onClick={handleReset} className="absolute bottom-6 right-6 z-20 bg-gray-900 text-white px-4 py-2 rounded-full shadow-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:bg-black transition-all">
                <RefreshCcw size={12} /> Reset
            </button>
        )}
      </div>

      {/* BOTTOM TOOLBAR (CONTROLS) */}
      <div className="h-24 md:h-20 bg-white border-t border-gray-100 px-4 md:px-8 flex items-center justify-center md:justify-between gap-4 overflow-x-auto no-scrollbar z-20">
         
         <div className="flex items-center gap-2 md:gap-4 w-full md:w-auto justify-between md:justify-start">
            {/* Tools Group */}
            <div className={`flex items-center gap-1 p-1.5 rounded-xl border border-gray-100 ${viewMode === 'patient' || layersHidden ? 'opacity-50 pointer-events-none' : 'bg-gray-50'}`}>
                <button 
                    onClick={() => handleToolSelect('move')} 
                    className={`p-2 rounded-lg transition-all ${activeTool === 'move' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-900'}`}
                    title="Mover Imagen"
                >
                    <Move size={18} />
                </button>
                <div className="w-px h-6 bg-gray-200 mx-1" />
                <button 
                    onClick={() => handleToolSelect('measure')} 
                    className={`p-2 rounded-lg transition-all ${activeTool === 'measure' ? 'bg-white text-red-700 shadow-sm' : 'text-gray-400 hover:text-gray-900'}`}
                    title="Regla (Calibrar)"
                >
                    <Ruler size={18} />
                </button>
                <button 
                    onClick={() => handleToolSelect('area')} 
                    className={`p-2 rounded-lg transition-all ${activeTool === 'area' ? 'bg-white text-red-700 shadow-sm' : 'text-gray-400 hover:text-gray-900'}`}
                    title="Área (Polígono)"
                >
                    <Pentagon size={18} />
                </button>
                <button 
                    onClick={() => handleToolSelect('texture')} 
                    className={`p-2 rounded-lg transition-all ${activeTool === 'texture' ? 'bg-white text-red-700 shadow-sm' : 'text-gray-400 hover:text-gray-900'}`}
                    title="Analizador Textura"
                >
                    <ScanEye size={18} />
                </button>
            </div>

            {/* Adjustments Group */}
            <div className="flex items-center gap-1 bg-gray-50 p-1.5 rounded-xl border border-gray-100 hidden sm:flex">
                 <button onClick={() => setBrightness(b => b === 100 ? 125 : (b === 125 ? 150 : 100))} className={`p-2 rounded-lg transition-all ${brightness > 100 ? 'bg-white text-red-700 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`} title="Brillo"><Sun size={18} /></button>
                 <button onClick={() => setContrast(c => c === 100 ? 125 : (c === 125 ? 150 : 100))} className={`p-2 rounded-lg transition-all ${contrast > 100 ? 'bg-white text-red-700 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`} title="Contraste"><Contrast size={18} /></button>
                 <button onClick={() => setInvert(!invert)} className={`p-2 rounded-lg transition-all ${invert ? 'bg-red-700 text-white shadow-md' : 'text-gray-500 hover:text-gray-900'}`} title="Invertir"><ImageMinus size={18} /></button>
                 <button onClick={() => setGrayscale(!grayscale)} className={`p-2 rounded-lg transition-all ${grayscale ? 'bg-gray-900 text-white shadow-md' : 'text-gray-500 hover:text-gray-900'}`} title="B/N"><Contrast size={18} className="rotate-90" /></button>
            </div>

            {/* View Tools */}
            <div className="flex items-center gap-1 bg-gray-50 p-1.5 rounded-xl border border-gray-100 hidden sm:flex">
                 <button onClick={() => handleZoom(-0.25)} className="p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-white" title="Alejar"><ZoomOut size={18} /></button>
                 <button onClick={() => handleZoom(0.25)} className="p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-white" title="Acercar"><ZoomIn size={18} /></button>
                 <button onClick={handleRotate} className="p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-white" title="Rotar"><RotateCw size={18} /></button>
            </div>
         </div>

         <div className="hidden md:flex flex-col items-end">
             <span className="text-[10px] font-black uppercase text-gray-300 tracking-widest">Kurae Medical Viewer</span>
             <span className="text-[9px] font-bold text-gray-300">v1.2.0</span>
         </div>

      </div>
    </div>
  );
};
