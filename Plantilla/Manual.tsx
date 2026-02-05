
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, HelpCircle, ShieldCheck, Cpu, Zap, Database, ChevronRight, Menu, Layout, Users, Stethoscope, Image as ImageIcon, ArrowUp } from 'lucide-react';

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
  { id: 'man-intro', title: 'Visión General', icon: <Layout size={16} /> },
  { id: 'man-patients', title: 'Gestión Clínica', icon: <Users size={16} /> },
  { id: 'man-ai', title: 'Inteligencia Art.', icon: <Cpu size={16} /> },
  { id: 'man-comms', title: 'Comunicación', icon: <Stethoscope size={16} /> },
  { id: 'man-privacy', title: 'Privacidad', icon: <ShieldCheck size={16} /> },
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
              <h3 className="font-black text-gray-900 uppercase tracking-tighter text-lg leading-tight">Documentación Kurae</h3>
              <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest hidden sm:block">Guía Operativa v2.0</p>
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
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Índice</p>
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
                <span className="text-red-700 font-black text-[10px] uppercase tracking-[0.3em]">01. Introducción</span>
                <h2 className="text-4xl font-black text-gray-900 tracking-tighter leading-none">Ecosistema<br/><span className="text-red-700 underline decoration-gray-900 decoration-2">Kurae</span></h2>
              </div>
              <p className="text-gray-600 leading-relaxed text-sm">
                Kurae es una herramienta de asistencia clínica diseñada para optimizar el <strong>seguimiento de heridas y úlceras</strong>. Su objetivo es reducir la carga administrativa del personal de enfermería y mejorar la precisión en la evaluación mediante Inteligencia Artificial Generativa.
              </p>
              <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 flex flex-col md:flex-row gap-6">
                <div className="flex-1">
                    <h4 className="font-black text-xs uppercase tracking-widest mb-2 text-gray-900">Vista Doctor</h4>
                    <p className="text-[11px] text-gray-500 leading-relaxed">
                       Panel de control completo. Permite gestionar pacientes, analizar imágenes, redactar informes y supervisar la evolución.
                    </p>
                </div>
                <div className="w-px bg-gray-200 hidden md:block"></div>
                <div className="flex-1">
                    <h4 className="font-black text-xs uppercase tracking-widest mb-2 text-red-700">Vista Paciente</h4>
                    <p className="text-[11px] text-gray-500 leading-relaxed">
                       Interfaz simplificada para que el paciente reporte su estado, envíe fotografías de la herida y reciba feedback automático.
                    </p>
                </div>
              </div>
            </section>

            {/* GESTIÓN PACIENTES */}
            <section id="man-patients" className="space-y-6">
              <div className="space-y-2">
                <span className="text-red-700 font-black text-[10px] uppercase tracking-[0.3em]">02. Gestión</span>
                <h2 className="text-4xl font-black text-gray-900 tracking-tighter leading-none">Listado y<br/>Priorización</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-3">
                    <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                        <ArrowUp size={16} className="text-red-700" />
                        Sistema de Prioridad
                    </h4>
                    <p className="text-xs text-gray-500 leading-relaxed">
                        Cada tarjeta de paciente cuenta con un botón de flecha <span className="inline-block bg-red-50 text-red-700 p-0.5 rounded"><ArrowUp size={10}/></span> en la esquina superior derecha.
                        Al activarlo, el paciente se marca como <strong>Caso Prioritario</strong> y se desplaza automáticamente al inicio de la lista, independientemente del orden alfabético.
                    </p>
                 </div>
                 <div className="space-y-3">
                    <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                        <Users size={16} />
                        Búsqueda Inteligente
                    </h4>
                    <p className="text-xs text-gray-500 leading-relaxed">
                        La barra de búsqueda filtra en tiempo real por múltiples campos: <strong>Nombre, Diagnóstico, Aseguradora (Mutua) o Número de Expediente</strong>. Esto facilita la localización rápida en bases de datos extensas.
                    </p>
                 </div>
              </div>
              <div className="p-4 bg-gray-900 text-white rounded-2xl text-[11px] font-mono mt-4">
                 TIP: Utilice el botón "Pencil" en la cabecera para editar datos clínicos o archivar pacientes dados de alta.
              </div>
            </section>

            {/* INTELIGENCIA ARTIFICIAL */}
            <section id="man-ai" className="space-y-6">
              <div className="space-y-2">
                <span className="text-red-700 font-black text-[10px] uppercase tracking-[0.3em]">03. Motor Gemini</span>
                <h2 className="text-4xl font-black text-gray-900 tracking-tighter leading-none">Análisis de<br/>Imágenes</h2>
              </div>
              <p className="text-gray-600 leading-relaxed text-sm">
                Kurae integra visión por computador para asistir en el diagnóstico. Al subir una fotografía de la herida (botón <ImageIcon size={14} className="inline"/>), el sistema genera automáticamente un <strong>Informe Estructurado</strong>.
              </p>
              
              <div className="space-y-4">
                  <div className="border-l-4 border-red-700 pl-4 py-1">
                      <h5 className="text-xs font-black uppercase text-gray-900">Hallazgos Visuales</h5>
                      <p className="text-[10px] text-gray-500">Descripción técnica del lecho de la herida, bordes y piel perilesional.</p>
                  </div>
                  <div className="border-l-4 border-gray-900 pl-4 py-1">
                      <h5 className="text-xs font-black uppercase text-gray-900">Signos de Alerta</h5>
                      <p className="text-[10px] text-gray-500">Detección de infección, necrosis, eritema o exudado purulento.</p>
                  </div>
                  <div className="border-l-4 border-gray-300 pl-4 py-1">
                      <h5 className="text-xs font-black uppercase text-gray-900">Plan de Acción</h5>
                      <p className="text-[10px] text-gray-500">Recomendaciones inmediatas de cura o derivación.</p>
                  </div>
              </div>
            </section>

            {/* COMUNICACIÓN */}
            <section id="man-comms" className="space-y-6">
              <div className="space-y-2">
                <span className="text-red-700 font-black text-[10px] uppercase tracking-[0.3em]">04. Chat Clínico</span>
                <h2 className="text-4xl font-black text-gray-900 tracking-tighter leading-none">Redacción<br/>Asistida</h2>
              </div>
              <div className="flex items-start gap-4 bg-gray-50 p-6 rounded-3xl border border-gray-100">
                 <div className="p-3 bg-white rounded-xl shadow-sm text-red-700">
                    <Zap size={24} />
                 </div>
                 <div>
                    <h4 className="font-bold text-gray-900 text-sm mb-2">Función "Polishing"</h4>
                    <p className="text-xs text-gray-600 leading-relaxed mb-4">
                       Escriba notas rápidas o informales en el chat (ej: "limpiar bien y ver si sale pus"). Pulse el botón del <strong>Rayo</strong>. La IA reescribirá su mensaje con terminología clínica, tono empático y profesional antes de enviarlo.
                    </p>
                    <div className="text-[10px] font-mono bg-white p-2 rounded border border-gray-200 text-gray-500">
                       "Realizar limpieza exhaustiva y vigilar presencia de exudado purulento..."
                    </div>
                 </div>
              </div>
            </section>

            {/* PRIVACIDAD */}
            <section id="man-privacy" className="space-y-6 pb-20">
              <div className="space-y-2">
                <span className="text-red-700 font-black text-[10px] uppercase tracking-[0.3em]">05. Datos</span>
                <h2 className="text-4xl font-black text-gray-900 tracking-tighter leading-none">Seguridad<br/>Local-First</h2>
              </div>
              <p className="text-gray-600 leading-relaxed text-sm">
                Kurae opera bajo un principio de <strong>Privacidad por Diseño</strong>.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 border border-gray-100 rounded-2xl bg-white shadow-sm">
                   <Database size={20} className="text-gray-400 mb-2" />
                   <h5 className="font-black text-[10px] uppercase tracking-widest mb-1 text-gray-900">Almacenamiento</h5>
                   <p className="text-[11px] text-gray-500">Todos los datos de pacientes y chats se guardan en el <strong>LocalStorage</strong> de su dispositivo. No hay base de datos en la nube.</p>
                </div>
                <div className="p-4 border border-gray-100 rounded-2xl bg-white shadow-sm">
                   <ShieldCheck size={20} className="text-red-700 mb-2" />
                   <h5 className="font-black text-[10px] uppercase tracking-widest mb-1 text-gray-900">Procesamiento</h5>
                   <p className="text-[11px] text-gray-500">Las imágenes y textos solo se envían a la API de Google Gemini para su análisis momentáneo y no se usan para reentrenamiento.</p>
                </div>
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
