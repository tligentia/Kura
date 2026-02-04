import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, HelpCircle, ShieldCheck, Cpu, Zap, Database, ChevronRight, Menu, Layout, Key, Lock, ArrowRight } from 'lucide-react';

interface ManualProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Section {
  id: string;
  title: string;
  icon: React.ReactNode;
}

const SECTIONS: Section[] = [
  { id: 'man-intro', title: 'Introducción', icon: <Layout size={16} /> },
  { id: 'man-motor', title: 'Motor IA', icon: <Cpu size={16} /> },
  { id: 'man-security', title: 'Seguridad PIN', icon: <ShieldCheck size={16} /> },
  { id: 'man-storage', title: 'Almacenamiento', icon: <Database size={16} /> },
  { id: 'man-vault', title: 'Vault Dev', icon: <Lock size={16} /> },
];

export const Manual: React.FC<ManualProps> = ({ isOpen, onClose }) => {
  const [activeSection, setActiveSection] = useState(SECTIONS[0].id);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // --- SCROLL SPY LOGIC ---
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;
    
    const container = scrollContainerRef.current;
    const scrollTop = container.scrollTop;
    const threshold = 150;

    for (const section of SECTIONS) {
      const element = document.getElementById(section.id);
      if (element) {
        const offsetTop = element.offsetTop - threshold;
        if (scrollTop >= offsetTop) {
          setActiveSection(section.id);
        }
      }
    }
  }, []);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (isOpen && container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [isOpen, handleScroll]);

  // --- NAVIGATION ---
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: element.offsetTop - 20,
        behavior: 'smooth'
      });
      setActiveSection(id);
      if (window.innerWidth < 768) setIsSidebarOpen(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-0 md:p-4 bg-gray-900/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white w-full h-full md:h-[90vh] md:max-w-5xl md:rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-gray-100 animate-in zoom-in-95 duration-300">
        
        {/* TOP BAR */}
        <div className="p-4 md:p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 md:hidden hover:bg-gray-200 rounded-lg text-gray-900 transition-colors"
            >
              <Menu size={20} />
            </button>
            <div className="p-2 bg-gray-900 rounded-lg text-white hidden sm:block">
              <HelpCircle size={20} />
            </div>
            <div>
              <h3 className="font-black text-gray-900 uppercase tracking-tighter text-lg leading-tight">Manual de Instrucciones</h3>
              <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest hidden sm:block">System Documentation v2.0</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-red-700 transition-all"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden relative">
          
          {/* SIDEBAR (NAVIGATOR) */}
          <aside className={`
            absolute md:relative z-20 w-64 h-full bg-white border-r border-gray-100 flex flex-col transition-transform duration-300
            ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          `}>
            <div className="p-6 space-y-1">
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Secciones</p>
              {SECTIONS.map((section) => (
                <button
                  key={section.id}
                  onClick={() => scrollToSection(section.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl transition-all group ${
                    activeSection === section.id 
                      ? 'bg-red-50 text-red-700 border-l-4 border-red-700' 
                      : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={activeSection === section.id ? 'text-red-700' : 'text-gray-400'}>
                      {section.icon}
                    </span>
                    <span className={`text-xs font-black uppercase tracking-tight transition-all ${
                      activeSection === section.id ? 'translate-x-1' : ''
                    }`}>
                      {section.title}
                    </span>
                  </div>
                  {activeSection === section.id && <ChevronRight size={14} />}
                </button>
              ))}
            </div>
            <div className="mt-auto p-6 bg-gray-50/50">
               <div className="flex items-center gap-2 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-700 animate-pulse"></span>
                  Documentación Activa
               </div>
            </div>
          </aside>

          {/* OVERLAY FOR MOBILE SIDEBAR */}
          {isSidebarOpen && (
            <div 
              className="md:hidden absolute inset-0 bg-black/20 z-10 backdrop-blur-sm"
              onClick={() => setIsSidebarOpen(false)}
            />
          )}

          {/* CONTENT AREA */}
          <div 
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto p-8 md:p-12 space-y-20 custom-scrollbar scroll-smooth"
          >
            {/* INTRO */}
            <section id="man-intro" className="space-y-6">
              <div className="space-y-2">
                <span className="text-red-700 font-black text-[10px] uppercase tracking-[0.3em]">01. Bienvenida</span>
                <h2 className="text-4xl font-black text-gray-900 tracking-tighter leading-none">Visión del<br/><span className="text-red-700 italic underline decoration-gray-900 decoration-2">Sistema</span></h2>
              </div>
              <p className="text-gray-600 leading-relaxed text-sm">
                Esta plataforma es un entorno avanzado diseñado para el <strong>análisis estratégico de activos Cripto, DeFi y Fiat</strong>. No es una simple interfaz; es un puente entre la inteligencia generativa y el control local de datos.
              </p>
              <div className="bg-gray-900 text-white p-6 rounded-3xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                   <Zap size={80} />
                </div>
                <h4 className="font-black text-xs uppercase tracking-widest mb-2">Filosofía Local-First</h4>
                <p className="text-[11px] text-gray-400 leading-relaxed max-w-sm">
                   Tus claves, tus prompts, tus resultados. Nada se procesa en servidores ajenos a Google y tu propio navegador.
                </p>
              </div>
            </section>

            {/* MOTOR IA */}
            <section id="man-motor" className="space-y-6">
              <div className="space-y-2">
                <span className="text-red-700 font-black text-[10px] uppercase tracking-[0.3em]">02. Inteligencia</span>
                <h2 className="text-4xl font-black text-gray-900 tracking-tighter leading-none">Motor de<br/>IA Gemini</h2>
              </div>
              <p className="text-gray-600 leading-relaxed text-sm">
                Utilizamos el modelo <code className="bg-gray-100 px-1.5 py-0.5 rounded font-mono text-red-700">gemini-3-flash-preview</code> para el procesamiento.
              </p>
              <div className="border-l-4 border-gray-900 pl-6 py-2 space-y-4">
                 <div className="flex items-start gap-4">
                    <div className="w-6 h-6 rounded-full bg-red-700 text-white flex items-center justify-center text-[10px] font-black flex-shrink-0">1</div>
                    <p className="text-xs font-bold text-gray-900">Configura tu API Key en Ajustes para activar el motor.</p>
                 </div>
                 <div className="flex items-center gap-4 text-gray-400 animate-bounce py-2">
                    <ArrowRight size={16} className="rotate-90" />
                 </div>
                 <div className="flex items-start gap-4">
                    <div className="w-6 h-6 rounded-full bg-gray-900 text-white flex items-center justify-center text-[10px] font-black flex-shrink-0">2</div>
                    <p className="text-xs font-bold text-gray-900">Realiza consultas complejas sobre mercados o código directamente.</p>
                 </div>
              </div>
            </section>

            {/* SEGURIDAD */}
            <section id="man-security" className="space-y-6">
              <div className="space-y-2">
                <span className="text-red-700 font-black text-[10px] uppercase tracking-[0.3em]">03. Blindaje</span>
                <h2 className="text-4xl font-black text-gray-900 tracking-tighter leading-none">Acceso por<br/>PIN Único</h2>
              </div>
              <div className="bg-red-50 border border-red-100 p-6 rounded-3xl space-y-4">
                <div className="flex items-center gap-2 text-red-700">
                  <ShieldCheck size={20} />
                  <span className="font-black text-[10px] uppercase tracking-widest">Protocolo de Puerta</span>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Para acceder al contenido, el sistema requiere un <span className="font-black text-gray-900">PIN maestro corporativo</span> proporcionado por la administración. Este PIN no se envía a ningún servidor; se valida localmente mediante un hash volátil para garantizar la máxima privacidad del operador.
                </p>
              </div>
            </section>

            {/* STORAGE */}
            <section id="man-storage" className="space-y-6">
              <div className="space-y-2">
                <span className="text-red-700 font-black text-[10px] uppercase tracking-[0.3em]">04. Datos</span>
                <h2 className="text-4xl font-black text-gray-900 tracking-tighter leading-none">Memoria<br/>Persistente</h2>
              </div>
              <p className="text-gray-600 leading-relaxed text-sm">
                Utilizamos el <span className="text-gray-900 font-bold">LocalStorage</span> del navegador para recordar tu sesión.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 border border-gray-100 rounded-2xl bg-gray-50/50">
                  <h5 className="font-black text-[9px] uppercase tracking-widest mb-1 text-gray-400">¿Qué guardamos?</h5>
                  <p className="text-[11px] font-bold text-gray-700 italic">API Key, Sesión Auth.</p>
                </div>
                <div className="p-4 border border-gray-100 rounded-2xl bg-gray-50/50">
                  <h5 className="font-black text-[9px] uppercase tracking-widest mb-1 text-gray-400">¿Cómo borrar?</h5>
                  <p className="text-[11px] font-bold text-red-700 italic">Botón "Reset" en el Pie.</p>
                </div>
              </div>
            </section>

            {/* VAULT */}
            <section id="man-vault" className="space-y-6 pb-20">
              <div className="space-y-2">
                <span className="text-red-700 font-black text-[10px] uppercase tracking-[0.3em]">05. Developer</span>
                <h2 className="text-4xl font-black text-gray-900 tracking-tighter leading-none">Bóveda de<br/>Claves (Vault)</h2>
              </div>
              <p className="text-gray-600 leading-relaxed text-sm">
                Para usuarios avanzados y desarrolladores de Tligent, el sistema se sincroniza con una base de datos distribuida en Google Sheets para resolución rápida de claves ofuscadas.
              </p>
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl font-mono text-[10px] text-gray-400">
                <p>// Log: Sincronizando Vault...</p>
                <p className="text-green-600">// Success: 14 Shortcuts cargados.</p>
              </div>
            </section>

          </div>
        </div>

        {/* BOTTOM ACTION */}
        <div className="p-6 border-t border-gray-100 bg-white md:hidden">
          <button 
            onClick={onClose} 
            className="w-full bg-gray-900 hover:bg-black text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all"
          >
            Cerrar Manual
          </button>
        </div>
      </div>
    </div>
  );
};