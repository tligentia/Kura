
import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, Plus,  Info, Bell, Send, Image as ImageIcon, Sparkles, 
  Mic, X, CheckCircle2, Stethoscope, Heart, Activity, 
  ChevronRight, BrainCircuit, Calendar, FileText, ArrowLeft
} from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { Patient, Message } from './types';

// --- THEME CONFIGURATION ---
const THEME = {
  doctor: {
    bg: 'bg-slate-50',
    sidebar: 'bg-white',
    primary: 'bg-indigo-600',
    primaryLight: 'bg-indigo-50',
    text: 'text-indigo-900',
    border: 'border-indigo-100',
    accent: 'text-indigo-600',
    bubble: 'bg-indigo-600 text-white rounded-br-none',
  },
  patient: {
    bg: 'bg-teal-50',
    sidebar: 'hidden', // Patient doesn't see list
    primary: 'bg-teal-600',
    primaryLight: 'bg-teal-50',
    text: 'text-teal-900',
    border: 'border-teal-100',
    accent: 'text-teal-600',
    bubble: 'bg-teal-600 text-white rounded-bl-none',
  }
};

interface PacientIAProps {
  viewMode: 'doctor' | 'patient';
  isMobileLayout?: boolean; // New prop to force mobile behavior from shell
}

export const PacientIA: React.FC<PacientIAProps> = ({ viewMode, isMobileLayout = false }) => {
  // --- STATE ---
  const [patients, setPatients] = useState<Patient[]>(() => {
    const saved = localStorage.getItem('pacientia_data_v1');
    return saved ? JSON.parse(saved) : [
      {
        id: '1',
        name: 'Roberto Gómez',
        age: 64,
        condition: 'Úlcera Diabética Grado 2',
        lastActivity: new Date().toISOString(),
        avatarColor: 'bg-gradient-to-br from-blue-500 to-indigo-600',
        messages: [
          { id: 'm1', role: 'doctor', content: '¿Cómo notas la inflamación hoy, Roberto?', timestamp: new Date().toISOString() },
          { id: 'm2', role: 'patient', content: 'Un poco mejor doctor, pero me duele al cambiar el vendaje.', timestamp: new Date().toISOString() }
        ],
        reminders: [{ id: 'r1', title: 'Cambio de apósito', date: new Date().toISOString(), completed: false }]
      },
      {
        id: '2',
        name: 'Ana María Sur',
        age: 72,
        condition: 'Post-operatorio Cadera',
        lastActivity: new Date(Date.now() - 86400000).toISOString(),
        avatarColor: 'bg-gradient-to-br from-emerald-400 to-teal-600',
        messages: [],
        reminders: []
      }
    ];
  });

  const [activePatientId, setActivePatientId] = useState<string>(patients[0]?.id || '');
  const [searchTerm, setSearchTerm] = useState('');
  const [inputText, setInputText] = useState('');
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
  const [showPatientInfo, setShowPatientInfo] = useState(false);
  const [isLiveActive, setIsLiveActive] = useState(false);
  
  // Mobile Navigation State
  const [mobileShowChat, setMobileShowChat] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const mainContainerRef = useRef<HTMLDivElement>(null);
  const activePatient = patients.find(p => p.id === activePatientId);

  // --- RESPONSIVE LOGIC ---
  const isActuallyMobile = isMobileLayout || (typeof window !== 'undefined' && window.innerWidth < 768);

  // SCROLL LOGIC: 
  // 1. When changing modes, we want to see the TOP (Header), not the bottom.
  useEffect(() => {
    if (mainContainerRef.current) {
        // Force scroll to top instantly to show the "Inicio"
        mainContainerRef.current.scrollTop = 0;
    }
    
    // Logic for mobile navigation reset
    if (viewMode === 'patient') {
        setMobileShowChat(true); // Patient always sees chat
    } else {
        setMobileShowChat(false); // Doctor starts at list on mobile
    }
  }, [viewMode]);

  // --- EFFECT ---
  useEffect(() => {
    localStorage.setItem('pacientia_data_v1', JSON.stringify(patients));
  }, [patients]);

  // SCROLL LOGIC 2:
  // Only scroll to bottom when MESSAGES change or we explicitly open the chat in mobile.
  // REMOVED 'viewMode' from dependency to prevent auto-scrolling to bottom on mode switch.
  useEffect(() => {
    if (mobileShowChat || !isActuallyMobile) {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activePatient?.messages, mobileShowChat]);

  // --- AI LOGIC ---
  const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

  const handleAiAction = async (type: 'suggest' | 'analyze', payload?: any) => {
    if (!activePatient || isAiAnalyzing) return;
    setIsAiAnalyzing(true);
    const ai = getAI();
    
    try {
      let prompt = '';
      if (type === 'suggest') {
        prompt = `Actúa como médico experto. Basado en este historial: ${JSON.stringify(activePatient.messages.slice(-3))}, sugiere una respuesta clínica, empática y breve para el paciente.`;
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });

      if (type === 'suggest') {
        setInputText(response.text || '');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsAiAnalyzing(false);
    }
  };

  const handleImageAnalysis = async (base64: string, mimeType: string) => {
    setIsAiAnalyzing(true);
    const ai = getAI();
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
          parts: [
            { inlineData: { data: base64, mimeType } },
            { text: "Analiza esta imagen clínica. Formato Markdown. 1) Hallazgos visuales. 2) Signos de alarma. 3) Recomendación." }
          ]
        }
      });
      
      if (response.text) {
        const aiMsg: Message = {
          id: Date.now().toString(),
          role: 'ai',
          content: response.text,
          timestamp: new Date().toISOString(),
          isAnalysis: true
        };
        addMessageToPatient(activePatientId, aiMsg);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsAiAnalyzing(false);
    }
  };

  // --- ACTIONS ---
  const addMessageToPatient = (pid: string, msg: Message) => {
    setPatients(prev => prev.map(p => 
      p.id === pid 
        ? { ...p, messages: [...p.messages, msg], lastActivity: new Date().toISOString() } 
        : p
    ));
  };

  const handlePatientSelect = (pid: string) => {
      setActivePatientId(pid);
      setMobileShowChat(true);
  };

  const handleSendMessage = () => {
    if (!inputText.trim() || !activePatientId) return;
    
    const newMsg: Message = {
      id: Date.now().toString(),
      role: viewMode === 'doctor' ? 'doctor' : 'patient',
      content: inputText,
      timestamp: new Date().toISOString()
    };
    
    addMessageToPatient(activePatientId, newMsg);
    setInputText('');

    // Auto-reply simulation for demo
    if (viewMode === 'patient') {
      setTimeout(() => {
        setIsAiAnalyzing(true);
        setTimeout(() => {
            const autoMsg: Message = {
            id: (Date.now()+1).toString(),
            role: 'ai',
            content: "**Notificación Kurae**: Hemos recibido su actualización. El Dr. revisará la información en breve.",
            timestamp: new Date().toISOString()
            };
            addMessageToPatient(activePatientId, autoMsg);
            setIsAiAnalyzing(false);
        }, 1500);
      }, 500);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activePatientId) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(',')[1];
      const newMsg: Message = {
        id: Date.now().toString(),
        role: viewMode === 'patient' ? 'patient' : 'doctor',
        content: "Adjunto imagen clínica para revisión.",
        timestamp: new Date().toISOString(),
        imageUrl: reader.result as string
      };
      addMessageToPatient(activePatientId, newMsg);
      handleImageAnalysis(base64, file.type);
    };
    reader.readAsDataURL(file);
  };

  // --- RENDER HELPERS ---
  const theme = THEME[viewMode];

  return (
    <div 
        ref={mainContainerRef}
        className={`flex flex-col h-[85vh] w-full ${theme.bg} rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/50 transition-colors duration-700 relative`}
    >
      
      {/* CONTAINER FLEX */}
      <div className="flex flex-1 overflow-hidden relative">
        
        {/* 2. SIDEBAR (DOCTOR LIST) */}
        {/* Responsive Logic: Visible if Doctor Mode AND (Desktop OR (Mobile AND Not Showing Chat)) */}
        <aside className={`
            flex-col z-20 transition-all duration-300
            ${viewMode === 'doctor' ? 'flex' : 'hidden'}
            ${isActuallyMobile ? 'w-full absolute inset-0 bg-white z-30' : 'w-96 bg-white/80 backdrop-blur-sm border-r border-indigo-50 relative'}
            ${isActuallyMobile && mobileShowChat ? 'translate-x-[-100%] opacity-0 pointer-events-none' : 'translate-x-0 opacity-100'}
        `}>
            <div className="p-6">
                <div className="flex gap-3 items-center">
                    <div className="relative group flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors" size={16} />
                        <input 
                            type="text" 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Buscar historial..."
                            className="w-full bg-gray-50 border border-gray-100 pl-12 pr-4 py-3 rounded-2xl text-xs font-medium outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all"
                        />
                    </div>
                    <button onClick={() => {}} className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl hover:bg-indigo-100 transition-colors shadow-sm active:scale-95">
                        <Plus size={20} />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3 custom-scrollbar">
                {patients.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())).map(p => (
                <div 
                    key={p.id}
                    onClick={() => handlePatientSelect(p.id)}
                    className={`cursor-pointer p-4 rounded-3xl border transition-all duration-300 group relative overflow-hidden ${activePatientId === p.id && !isActuallyMobile ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-200 border-indigo-600' : 'bg-white border-gray-100 hover:border-indigo-200 hover:shadow-md'}`}
                >
                    <div className="flex items-start justify-between relative z-10">
                        <div className="flex items-center gap-3">
                            <div className={`w-12 h-12 rounded-2xl ${activePatientId === p.id && !isActuallyMobile ? 'bg-white/20' : p.avatarColor} flex items-center justify-center text-sm font-black text-white shadow-sm`}>
                                {p.name[0]}
                            </div>
                            <div>
                                <h4 className={`font-bold text-sm leading-tight ${activePatientId === p.id && !isActuallyMobile ? 'text-white' : 'text-gray-900'}`}>{p.name}</h4>
                                <span className={`text-[10px] font-medium uppercase tracking-wider ${activePatientId === p.id && !isActuallyMobile ? 'text-indigo-200' : 'text-gray-400'}`}>ID: #{p.id.padStart(4, '0')}</span>
                            </div>
                        </div>
                        {p.reminders.length > 0 && (
                            <div className={`w-2 h-2 rounded-full ${activePatientId === p.id && !isActuallyMobile ? 'bg-red-400' : 'bg-red-500'} animate-pulse`} />
                        )}
                    </div>
                    <div className="mt-4 relative z-10">
                         <div className="flex justify-between items-end">
                            <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${activePatientId === p.id && !isActuallyMobile ? 'bg-white/10 text-white' : 'bg-gray-50 text-gray-500'}`}>
                                <Activity size={10} />
                                {p.condition}
                            </div>
                            {p.messages.length > 0 && (
                                <span className={`text-[9px] font-medium ${activePatientId === p.id && !isActuallyMobile ? 'text-indigo-200' : 'text-gray-400'}`}>
                                    {new Date(p.messages[p.messages.length - 1].timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </span>
                            )}
                         </div>
                         {/* Last message preview for mobile look */}
                         {p.messages.length > 0 && (
                            <p className={`mt-2 text-xs truncate ${activePatientId === p.id && !isActuallyMobile ? 'text-indigo-100' : 'text-gray-500'}`}>
                                {p.messages[p.messages.length - 1].content}
                            </p>
                         )}
                    </div>
                    {activePatientId === p.id && !isActuallyMobile && <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />}
                </div>
                ))}
            </div>
        </aside>

        {/* 3. MAIN CONTENT AREA (CHAT) */}
        {/* Responsive Logic: Always visible on Desktop. On Mobile, visible if mobileShowChat is true. */}
        <main className={`
            flex-1 flex flex-col relative bg-white/50 backdrop-blur-xl transition-transform duration-300
            ${isActuallyMobile ? 'absolute inset-0 z-40 bg-white' : ''}
            ${isActuallyMobile && !mobileShowChat && viewMode === 'doctor' ? 'translate-x-full' : 'translate-x-0'}
        `}>
            
            {/* HEADER */}
            {activePatient && (
                <header className={`px-4 md:px-8 py-4 md:py-6 border-b ${theme.border} flex justify-between items-center bg-white/40 backdrop-blur-md sticky top-0 z-30`}>
                    <div className="flex items-center gap-3 md:gap-5">
                        {/* BACK BUTTON (Mobile Doctor Mode) */}
                        {isActuallyMobile && viewMode === 'doctor' && (
                            <button onClick={() => setMobileShowChat(false)} className="mr-1 p-2 -ml-2 text-gray-500 hover:bg-gray-100 rounded-full">
                                <ArrowLeft size={20} />
                            </button>
                        )}

                        <div className={`w-10 h-10 md:w-14 md:h-14 rounded-[1rem] md:rounded-[1.2rem] shadow-lg ${activePatient.avatarColor} flex items-center justify-center text-white text-base md:text-xl font-black flex-shrink-0`}>
                            {activePatient.name[0]}
                        </div>
                        <div className="overflow-hidden">
                            <h2 className={`text-lg md:text-2xl font-black tracking-tight truncate ${theme.text}`}>
                                {viewMode === 'patient' ? 'Hola, ' : ''}{activePatient.name}
                            </h2>
                            <div className="flex items-center gap-3 mt-0.5 md:mt-1">
                                <span className={`text-[9px] md:text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${theme.primaryLight} ${theme.accent}`}>
                                    {activePatient.age} Años
                                </span>
                                <span className="text-[9px] md:text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1 truncate">
                                    <Activity size={12} /> {activePatient.condition}
                                </span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-1 md:gap-2">
                        {viewMode === 'doctor' && (
                            <button 
                                onClick={() => setShowPatientInfo(!showPatientInfo)}
                                className="p-2 md:p-3 bg-white border border-gray-200 text-gray-400 hover:text-indigo-600 hover:border-indigo-200 rounded-2xl transition-all shadow-sm active:scale-95"
                            >
                                <FileText size={18} className="md:w-5 md:h-5" />
                            </button>
                        )}
                         <button 
                            onClick={() => setIsLiveActive(!isLiveActive)}
                            className={`p-2 md:p-3 rounded-2xl transition-all shadow-sm active:scale-95 border flex items-center gap-2 ${isLiveActive ? 'bg-red-50 text-red-600 border-red-100 animate-pulse' : 'bg-white border-gray-200 text-gray-400 hover:text-gray-900'}`}
                        >
                            <Mic size={18} className="md:w-5 md:h-5" />
                            {isLiveActive && <span className="text-[10px] font-black uppercase hidden md:inline">Rec</span>}
                        </button>
                    </div>
                </header>
            )}

            {/* CHAT AREA */}
            <div className="flex-1 overflow-y-auto p-4 md:p-10 space-y-6 md:space-y-8 custom-scrollbar">
                {activePatient?.messages.map((m) => {
                    const isMe = m.role === viewMode;
                    const isSystem = m.role === 'ai';
                    
                    if (isSystem) {
                        return (
                            <div key={m.id} className="flex justify-center animate-in fade-in zoom-in duration-500 my-4">
                                <div className="max-w-2xl w-full bg-white/80 backdrop-blur-xl border border-indigo-100 rounded-3xl p-4 md:p-6 shadow-xl shadow-indigo-500/5 relative overflow-hidden group">
                                    <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-indigo-400 to-purple-500" />
                                    <div className="flex items-center gap-3 mb-3 border-b border-gray-50 pb-3">
                                        <div className="p-1.5 bg-indigo-50 rounded-xl text-indigo-600">
                                            <BrainCircuit size={16} />
                                        </div>
                                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-indigo-900">Análisis Kurae</span>
                                    </div>
                                    <div className="prose prose-sm prose-indigo max-w-none text-gray-600 text-xs md:text-sm leading-relaxed font-medium">
                                        {m.content.split('\n').map((line, i) => <p key={i}>{line}</p>)}
                                    </div>
                                </div>
                            </div>
                        );
                    }

                    return (
                        <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2`}>
                            <div className={`max-w-[85%] md:max-w-[60%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                {m.imageUrl && (
                                    <div className="mb-2 p-1 bg-white border border-gray-100 rounded-3xl shadow-md overflow-hidden">
                                        <img src={m.imageUrl} alt="Clinical Media" className="rounded-[1.2rem] max-h-48 md:max-h-64 object-cover" />
                                    </div>
                                )}
                                <div className={`px-5 py-3 md:px-6 md:py-4 shadow-sm text-xs md:text-sm font-medium leading-relaxed relative group ${
                                    m.role === 'doctor' 
                                        ? 'bg-indigo-600 text-white rounded-[1.5rem] rounded-br-none' 
                                        : 'bg-white border border-gray-100 text-gray-700 rounded-[1.5rem] rounded-bl-none'
                                }`}>
                                    {m.content}
                                    <span className={`text-[8px] md:text-[9px] font-bold absolute -bottom-5 ${isMe ? 'right-2' : 'left-2'} text-gray-300 uppercase tracking-widest opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity`}>
                                        {new Date(m.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}
                {isAiAnalyzing && (
                    <div className="flex justify-center py-4">
                        <div className="flex items-center gap-3 bg-white px-5 py-2 rounded-full shadow-sm border border-gray-100">
                            <Sparkles size={16} className="text-indigo-600 animate-spin" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Procesando...</span>
                        </div>
                    </div>
                )}
                <div ref={chatEndRef} />
            </div>

            {/* INPUT AREA (STICKY BOTTOM) */}
            <div className={`p-4 md:p-8 bg-white/60 backdrop-blur-xl border-t border-white/50 sticky bottom-0 z-50`}>
                <div className={`max-w-4xl mx-auto relative ${viewMode === 'patient' ? 'p-1' : ''}`}>
                    
                    {/* INPUT CONTAINER */}
                    <div className={`relative flex items-end gap-2 bg-white border ${viewMode === 'doctor' ? 'border-indigo-100' : 'border-teal-100'} p-1.5 md:p-2 pr-2 rounded-[2rem] shadow-xl shadow-gray-200/50 transition-all focus-within:ring-4 focus-within:ring-indigo-50`}>
                        <label className={`p-2 md:p-3 rounded-full cursor-pointer transition-colors ${viewMode === 'doctor' ? 'text-gray-400 hover:text-indigo-600 hover:bg-indigo-50' : 'text-gray-400 hover:text-teal-600 hover:bg-teal-50'}`}>
                            <ImageIcon size={20} className="md:w-[22px] md:h-[22px]" />
                            <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                        </label>
                        
                        <textarea
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }}}
                            placeholder={viewMode === 'doctor' ? "Escriba indicaciones..." : "Describa sus síntomas..."}
                            className="flex-1 max-h-32 py-3 bg-transparent border-none outline-none text-xs md:text-sm text-gray-700 placeholder:text-gray-300 resize-none font-medium custom-scrollbar"
                            rows={1}
                        />

                        {viewMode === 'doctor' && (
                            <button 
                                onClick={() => handleAiAction('suggest')}
                                className="p-2 md:p-3 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-all hidden sm:block"
                                title="Sugerir respuesta IA"
                            >
                                <Sparkles size={20} />
                            </button>
                        )}

                        <button 
                            onClick={handleSendMessage}
                            disabled={!inputText.trim()}
                            className={`p-3 md:p-3.5 rounded-full text-white shadow-lg transform active:scale-90 transition-all disabled:opacity-50 disabled:shadow-none ${viewMode === 'doctor' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-teal-500 hover:bg-teal-600'}`}
                        >
                            <Send size={18} className={`md:w-5 md:h-5 ${inputText.trim() ? '-ml-0.5 mt-0.5' : ''}`} />
                        </button>
                    </div>

                    {/* QUICK ACTIONS (PATIENT MODE) */}
                    {viewMode === 'patient' && (
                        <div className="flex overflow-x-auto justify-start md:justify-center gap-2 md:gap-3 mt-3 pb-2 md:pb-0 px-1 scrollbar-none">
                            <button onClick={() => setInputText("Me siento mucho mejor hoy.")} className="flex-shrink-0 px-3 py-2 bg-white border border-teal-100 rounded-xl text-[9px] md:text-[10px] font-bold uppercase tracking-wide text-teal-700 hover:bg-teal-50 transition-all shadow-sm">👍 Mejorando</button>
                            <button onClick={() => setInputText("Tengo dolor en la zona.")} className="flex-shrink-0 px-3 py-2 bg-white border border-teal-100 rounded-xl text-[9px] md:text-[10px] font-bold uppercase tracking-wide text-teal-700 hover:bg-teal-50 transition-all shadow-sm">👎 Con Dolor</button>
                            <button onClick={() => setInputText("Necesito reagendar mi cita.")} className="flex-shrink-0 px-3 py-2 bg-white border border-teal-100 rounded-xl text-[9px] md:text-[10px] font-bold uppercase tracking-wide text-teal-700 hover:bg-teal-50 transition-all shadow-sm">📅 Cita</button>
                        </div>
                    )}
                </div>
            </div>

            {/* INFO PANEL (DOCTOR ONLY) */}
            {showPatientInfo && activePatient && viewMode === 'doctor' && (
                <div className="absolute top-4 right-4 bottom-4 w-80 max-w-[90%] bg-white/95 backdrop-blur-xl border border-gray-100 shadow-2xl rounded-[2rem] p-6 animate-in slide-in-from-right-10 z-40 overflow-hidden flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-black text-gray-900 uppercase tracking-tight">Ficha Clínica</h3>
                        <button onClick={() => setShowPatientInfo(false)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-red-500 transition-colors">
                            <X size={18} />
                        </button>
                    </div>
                    
                    <div className="space-y-6 overflow-y-auto flex-1 custom-scrollbar pr-2">
                        <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                            <label className="text-[9px] font-black text-indigo-400 uppercase tracking-widest block mb-2">Diagnóstico Principal</label>
                            <p className="text-sm font-bold text-indigo-900 leading-tight">{activePatient.condition}</p>
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-3">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                    <Calendar size={12} /> Recordatorios
                                </label>
                                <button className="text-[9px] font-black text-indigo-600 hover:underline">Nuevo</button>
                            </div>
                            <div className="space-y-2">
                                {activePatient.reminders.length > 0 ? activePatient.reminders.map(r => (
                                    <div key={r.id} className="flex items-center gap-3 p-3 bg-white border border-gray-100 rounded-xl shadow-sm">
                                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${r.completed ? 'border-green-500 bg-green-500' : 'border-gray-300'}`}>
                                            {r.completed && <CheckCircle2 size={10} className="text-white" />}
                                        </div>
                                        <span className={`text-xs font-medium ${r.completed ? 'text-gray-400 line-through' : 'text-gray-700'}`}>{r.title}</span>
                                    </div>
                                )) : <p className="text-xs text-gray-300 italic text-center py-2">Sin tareas pendientes</p>}
                            </div>
                        </div>

                        <div className="pt-4 border-t border-gray-100">
                            <button className="w-full py-3 bg-gray-900 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-black transition-all shadow-lg">
                                Ver Historial Completo
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        .scrollbar-none::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
};
