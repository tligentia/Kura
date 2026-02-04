
import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, Plus,  Info, Bell, Send, Image as ImageIcon, Sparkles, 
  Mic, X, CheckCircle2, Stethoscope, Heart, Activity, 
  ChevronRight, BrainCircuit, Calendar, FileText, ArrowLeft,
  User, ShieldCheck, HeartPulse, UserRound, Thermometer, FlaskConical
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
    sidebar: 'hidden', 
    primary: 'bg-teal-600',
    primaryLight: 'bg-teal-50',
    text: 'text-teal-900',
    border: 'border-teal-100',
    accent: 'text-teal-600',
    bubble: 'bg-teal-600 text-white rounded-bl-none',
  }
};

// --- HELPER: GET PATIENT SYMBOL ---
const getPatientSymbol = (name: string, condition: string, size: number = 20) => {
    const hash = name.length + name.charCodeAt(0);
    const symbols = [
        <HeartPulse size={size} />, 
        <ShieldCheck size={size} />, 
        <Activity size={size} />, 
        <Stethoscope size={size} />,
        <Thermometer size={size} />,
        <FlaskConical size={size} />
    ];
    return symbols[hash % symbols.length];
};

interface PacientIAProps {
  viewMode: 'doctor' | 'patient';
  isMobileLayout?: boolean; 
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
  const [mobileShowChat, setMobileShowChat] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const sidebarScrollRef = useRef<HTMLDivElement>(null);
  const activePatient = patients.find(p => p.id === activePatientId);

  const isActuallyMobile = isMobileLayout || (typeof window !== 'undefined' && window.innerWidth < 768);

  // --- SCROLL RESET LOGIC (PRIORITY: TOP) ---
  useEffect(() => {
    const resetScrolls = () => {
        if (chatScrollRef.current) chatScrollRef.current.scrollTop = 0;
        if (sidebarScrollRef.current) sidebarScrollRef.current.scrollTop = 0;
    };
    
    resetScrolls();
    const timer = setTimeout(resetScrolls, 50);

    if (viewMode === 'patient') {
        setMobileShowChat(true); 
    } else {
        setMobileShowChat(false); 
    }

    return () => clearTimeout(timer);
  }, [viewMode]);

  useEffect(() => {
    if (chatScrollRef.current) {
        chatScrollRef.current.scrollTop = 0;
    }
  }, [activePatientId]);

  useEffect(() => {
    localStorage.setItem('pacientia_data_v1', JSON.stringify(patients));
  }, [patients]);

  const prevMsgCount = useRef(activePatient?.messages.length || 0);
  useEffect(() => {
    const currentCount = activePatient?.messages.length || 0;
    if (currentCount > prevMsgCount.current) {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    prevMsgCount.current = currentCount;
  }, [activePatient?.messages]);

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
      if (type === 'suggest') setInputText(response.text || '');
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

  const theme = THEME[viewMode];

  // --- RENDER PATIENT AVATAR ---
  const renderAvatar = (p: Patient, size: 'sm' | 'lg', isHeader: boolean = false) => {
      const containerClass = size === 'lg' 
        ? 'w-9 h-9 md:w-14 md:h-14 rounded-xl md:rounded-[1.2rem]' 
        : 'w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl';
      
      const isActiveInSidebar = !isHeader && activePatientId === p.id && !isActuallyMobile;

      return (
        <div className={`${containerClass} shadow-lg ${isActiveInSidebar ? 'bg-white/20' : p.avatarColor} flex items-center justify-center text-white flex-shrink-0 overflow-hidden relative group/avatar`}>
            {p.avatarUrl ? (
                <img src={p.avatarUrl} alt={p.name} className="w-full h-full object-cover" />
            ) : (
                <div className="flex items-center justify-center transition-transform group-hover/avatar:scale-110 duration-500">
                    {getPatientSymbol(p.name, p.condition, isActuallyMobile && size === 'lg' ? 16 : 20)}
                </div>
            )}
        </div>
      );
  };

  return (
    <div className={`flex flex-col h-[calc(100vh-140px)] md:h-[calc(100vh-160px)] w-full ${theme.bg} overflow-hidden transition-colors duration-700 relative`}>
      <div className="flex flex-1 overflow-hidden relative">
        
        {/* SIDEBAR */}
        <aside 
            ref={sidebarScrollRef}
            className={`
                flex-col z-20 transition-all duration-300 overflow-y-auto custom-scrollbar
                ${viewMode === 'doctor' ? 'flex' : 'hidden'}
                ${isActuallyMobile ? 'w-full absolute inset-0 bg-white z-30' : 'w-80 lg:w-96 bg-white border-r border-indigo-50 relative'}
                ${isActuallyMobile && mobileShowChat ? 'translate-x-[-100%] opacity-0 pointer-events-none' : 'translate-x-0 opacity-100'}
            `}
        >
            <div className="p-4 md:p-6 sticky top-0 bg-white z-10 border-b border-gray-50">
                <div className="flex gap-2 md:gap-3 items-center">
                    <div className="relative group flex-1">
                        <Search className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors" size={14} />
                        <input 
                            type="text" 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Buscar..."
                            className="w-full bg-gray-50 border border-gray-100 pl-9 md:pl-12 pr-4 py-2 md:py-3 rounded-xl md:rounded-2xl text-[11px] md:text-xs font-medium outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all"
                        />
                    </div>
                    <button onClick={() => {}} className="p-2 md:p-3 bg-indigo-50 text-indigo-600 rounded-xl md:rounded-2xl hover:bg-indigo-100 transition-colors shadow-sm active:scale-95">
                        <Plus size={18} />
                    </button>
                </div>
            </div>

            <div className="flex-1 px-3 md:px-4 pb-4 space-y-2 md:space-y-3 pt-4">
                {patients.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())).map(p => (
                <div 
                    key={p.id}
                    onClick={() => handlePatientSelect(p.id)}
                    className={`cursor-pointer p-3 md:p-4 rounded-2xl md:rounded-3xl border transition-all duration-300 group relative overflow-hidden ${activePatientId === p.id && !isActuallyMobile ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-200 border-indigo-600' : 'bg-white border-gray-100 hover:border-indigo-200 hover:shadow-md'}`}
                >
                    <div className="flex items-start justify-between relative z-10">
                        <div className="flex items-center gap-2 md:gap-3">
                            {renderAvatar(p, 'sm')}
                            <div className="min-w-0">
                                <h4 className={`font-bold text-xs md:text-sm leading-tight truncate ${activePatientId === p.id && !isActuallyMobile ? 'text-white' : 'text-gray-900'}`}>{p.name}</h4>
                                <span className={`text-[9px] md:text-[10px] font-medium uppercase tracking-wider ${activePatientId === p.id && !isActuallyMobile ? 'text-indigo-200' : 'text-gray-400'}`}>ID: #{p.id.padStart(4, '0')}</span>
                            </div>
                        </div>
                        {p.reminders.length > 0 && (
                            <div className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full ${activePatientId === p.id && !isActuallyMobile ? 'bg-red-400' : 'bg-red-500'} animate-pulse`} />
                        )}
                    </div>
                    <div className="mt-2 md:mt-4 relative z-10">
                         <div className="flex justify-between items-end">
                            <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 md:py-1 rounded-lg text-[8px] md:text-[10px] font-bold uppercase tracking-wider truncate max-w-[70%] ${activePatientId === p.id && !isActuallyMobile ? 'bg-white/10 text-white' : 'bg-gray-50 text-gray-500'}`}>
                                <Activity size={10} className="flex-shrink-0" />
                                <span className="truncate">{p.condition}</span>
                            </div>
                         </div>
                    </div>
                </div>
                ))}
            </div>
        </aside>

        {/* CHAT AREA */}
        <main className={`
            flex-1 flex flex-col relative bg-white transition-transform duration-300
            ${isActuallyMobile ? 'absolute inset-0 z-40 bg-white' : ''}
            ${isActuallyMobile && !mobileShowChat && viewMode === 'doctor' ? 'translate-x-full' : 'translate-x-0'}
        `}>
            
            {/* HEADER */}
            {activePatient && (
                <header className={`px-3 md:px-8 py-3 md:py-6 border-b ${theme.border} flex justify-between items-center bg-white/80 backdrop-blur-md sticky top-0 z-30`}>
                    <div className="flex items-center gap-2 md:gap-5 min-w-0 flex-1">
                        {isActuallyMobile && viewMode === 'doctor' && (
                            <button onClick={() => setMobileShowChat(false)} className="p-2 -ml-1 text-gray-900 hover:bg-gray-100 rounded-full transition-colors flex items-center justify-center flex-shrink-0">
                                <ArrowLeft size={20} strokeWidth={2.5} />
                            </button>
                        )}

                        {renderAvatar(activePatient, 'lg', true)}
                        
                        <div className="min-w-0 flex-1">
                            <h2 className={`text-sm md:text-2xl font-black tracking-tight truncate ${theme.text}`}>
                                {viewMode === 'patient' ? 'Hola, ' : ''}{activePatient.name}
                            </h2>
                            <div className="flex items-center gap-2 md:gap-3 mt-0.5">
                                <span className={`text-[8px] md:text-[10px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md flex-shrink-0 ${theme.primaryLight} ${theme.accent}`}>
                                    {activePatient.age} Años
                                </span>
                                <span className="text-[8px] md:text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1 truncate min-w-0">
                                    <Activity size={10} className="flex-shrink-0" /> <span className="truncate">{activePatient.condition}</span>
                                </span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-1 md:gap-2 ml-2 flex-shrink-0">
                        {viewMode === 'doctor' && (
                            <button 
                                onClick={() => setShowPatientInfo(!showPatientInfo)}
                                className="p-2 md:p-3 bg-white border border-gray-200 text-gray-400 hover:text-indigo-600 hover:border-indigo-200 rounded-xl md:rounded-2xl transition-all shadow-sm active:scale-95"
                            >
                                {/* Fixed invalid md:size prop */}
                                <FileText size={isActuallyMobile ? 16 : 18} />
                            </button>
                        )}
                         <button 
                            onClick={() => setIsLiveActive(!isLiveActive)}
                            className={`p-2 md:p-3 rounded-xl md:rounded-2xl transition-all shadow-sm active:scale-95 border flex items-center gap-2 ${isLiveActive ? 'bg-red-50 text-red-600 border-red-100 animate-pulse' : 'bg-white border-gray-200 text-gray-400 hover:text-gray-900'}`}
                        >
                            {/* Fixed invalid md:size prop */}
                            <Mic size={isActuallyMobile ? 16 : 18} />
                        </button>
                    </div>
                </header>
            )}

            {/* MESSAGES */}
            <div 
                ref={chatScrollRef}
                className="flex-1 overflow-y-auto p-4 md:p-10 space-y-4 md:space-y-8 custom-scrollbar scroll-smooth"
            >
                {activePatient?.messages.map((m) => {
                    const isMe = m.role === viewMode;
                    const isSystem = m.role === 'ai';
                    
                    if (isSystem) {
                        return (
                            <div key={m.id} className="flex justify-center animate-in fade-in zoom-in duration-500 my-2 md:my-4">
                                <div className="max-w-[95%] md:max-w-2xl w-full bg-white border border-indigo-100 rounded-2xl md:rounded-3xl p-3 md:p-6 shadow-xl shadow-indigo-500/5 relative overflow-hidden group">
                                    <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-indigo-400 to-purple-500" />
                                    <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-3 border-b border-gray-50 pb-2 md:pb-3">
                                        <div className="p-1 md:p-1.5 bg-indigo-50 rounded-lg md:rounded-xl text-indigo-600">
                                            {/* Fixed invalid md:size prop */}
                                            <BrainCircuit size={isActuallyMobile ? 14 : 16} />
                                        </div>
                                        <span className="text-[8px] md:text-[9px] font-black uppercase tracking-[0.2em] text-indigo-900">Análisis Kurae</span>
                                    </div>
                                    <div className="prose prose-xs md:prose-sm prose-indigo max-w-none text-gray-600 text-[11px] md:text-sm leading-relaxed font-medium">
                                        {m.content.split('\n').map((line, i) => <p key={i} className="mb-1">{line}</p>)}
                                    </div>
                                </div>
                            </div>
                        );
                    }

                    return (
                        <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2`}>
                            <div className={`max-w-[85%] md:max-w-[65%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                {m.imageUrl && (
                                    <div className="mb-2 p-1 bg-white border border-gray-100 rounded-2xl md:rounded-3xl shadow-md overflow-hidden">
                                        <img src={m.imageUrl} alt="Clinical Media" className="rounded-xl md:rounded-[1.2rem] max-h-40 md:max-h-64 object-cover" />
                                    </div>
                                )}
                                <div className={`px-4 py-2 md:px-6 md:py-4 shadow-sm text-[11px] md:text-sm font-medium leading-relaxed relative group ${
                                    m.role === 'doctor' 
                                        ? 'bg-indigo-600 text-white rounded-2xl md:rounded-[1.5rem] rounded-br-none' 
                                        : 'bg-white border border-gray-100 text-gray-700 rounded-2xl md:rounded-[1.5rem] rounded-bl-none'
                                }`}>
                                    {m.content}
                                    <span className={`text-[7px] md:text-[9px] font-bold absolute -bottom-4 md:-bottom-5 ${isMe ? 'right-1' : 'left-1'} text-gray-300 uppercase tracking-widest opacity-100`}>
                                        {new Date(m.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}
                {isAiAnalyzing && (
                    <div className="flex justify-center py-2">
                        <div className="flex items-center gap-2 bg-white px-4 py-1.5 rounded-full shadow-sm border border-gray-100">
                            <Sparkles size={14} className="text-indigo-600 animate-spin" />
                            <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">Analizando...</span>
                        </div>
                    </div>
                )}
                <div ref={chatEndRef} />
            </div>

            {/* INPUT BAR */}
            <div className={`px-3 py-4 md:p-8 bg-white/60 backdrop-blur-xl border-t border-gray-100 sticky bottom-0 z-50`}>
                <div className={`max-w-4xl mx-auto relative ${viewMode === 'patient' ? 'p-1' : ''}`}>
                    <div className={`relative flex items-end gap-1.5 md:gap-2 bg-white border ${viewMode === 'doctor' ? 'border-indigo-100' : 'border-teal-100'} p-1 md:p-2 pr-1.5 md:pr-2 rounded-2xl md:rounded-[2rem] shadow-xl shadow-gray-200/50 transition-all focus-within:ring-4 focus-within:ring-indigo-50`}>
                        <label className={`p-2 md:p-3 rounded-full cursor-pointer transition-colors flex-shrink-0 ${viewMode === 'doctor' ? 'text-gray-400 hover:text-indigo-600 hover:bg-indigo-50' : 'text-gray-400 hover:text-teal-600 hover:bg-teal-50'}`}>
                            {/* Fixed invalid md:size prop */}
                            <ImageIcon size={isActuallyMobile ? 18 : 20} />
                            <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                        </label>
                        
                        <textarea
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }}}
                            placeholder={viewMode === 'doctor' ? "Indicaciones..." : "Mensaje..."}
                            className="flex-1 max-h-24 md:max-h-32 py-2.5 md:py-3 bg-transparent border-none outline-none text-[11px] md:text-sm text-gray-700 placeholder:text-gray-300 resize-none font-medium custom-scrollbar"
                            rows={1}
                        />

                        <button 
                            onClick={handleSendMessage}
                            disabled={!inputText.trim()}
                            className={`p-2.5 md:p-3.5 rounded-full text-white shadow-lg transform active:scale-90 transition-all disabled:opacity-50 flex-shrink-0 ${viewMode === 'doctor' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-teal-500 hover:bg-teal-600'}`}
                        >
                            {/* Fixed invalid md:size prop */}
                            <Send size={isActuallyMobile ? 16 : 18} />
                        </button>
                    </div>
                </div>
            </div>

            {/* INFO SIDE PANEL */}
            {showPatientInfo && activePatient && viewMode === 'doctor' && (
                <div className="absolute top-2 right-2 bottom-2 w-72 md:w-80 max-w-[90%] bg-white backdrop-blur-xl border border-gray-100 shadow-2xl rounded-2xl md:rounded-[2rem] p-5 md:p-6 animate-in slide-in-from-right-10 z-[60] overflow-hidden flex flex-col">
                    <div className="flex justify-between items-center mb-4 md:mb-6">
                        <h3 className="font-black text-gray-900 uppercase tracking-tight text-sm">Ficha Clínica</h3>
                        <button onClick={() => setShowPatientInfo(false)} className="p-1.5 hover:bg-gray-100 rounded-full text-gray-400 hover:text-red-500 transition-colors">
                            {/* Fixed invalid md:size prop */}
                            <X size={isActuallyMobile ? 16 : 18} />
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
                        <div className="p-3 md:p-4 bg-indigo-50 rounded-xl md:rounded-2xl border border-indigo-100 mb-6">
                            <label className="text-[8px] md:text-[9px] font-black text-indigo-400 uppercase tracking-widest block mb-1">Diagnóstico</label>
                            <p className="text-xs md:text-sm font-bold text-indigo-900 leading-tight">{activePatient.condition}</p>
                        </div>
                    </div>
                </div>
            )}
        </main>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
        .scrollbar-none::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
};
