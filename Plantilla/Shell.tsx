
import React, { useState, useEffect, useCallback } from 'react';
import { Activity, Sparkles, HelpCircle, AlertCircle, CheckCircle2, Key, ArrowRight, Loader2, Stethoscope, Heart, Smartphone, Monitor } from 'lucide-react';
import { COLORS, validateKey, listAvailableModels, fetchVaultKey } from './Parameters';
import { Footer } from './Footer';
import { Cookies } from './Cookies';
import { Ajustes } from './Ajustes';
import { Manual } from './Manual';
import { AppMenu } from './AppMenu';

interface ShellProps {
  children: React.ReactNode;
  apiKey: string;
  onApiKeySave: (key: string) => void;
  viewMode: 'doctor' | 'patient';
  onViewModeChange: (mode: 'doctor' | 'patient') => void;
  isMobileView: boolean;
  onToggleMobileView: () => void;
}

export const Shell: React.FC<ShellProps> = ({ 
  children, apiKey, onApiKeySave, viewMode, onViewModeChange, isMobileView, onToggleMobileView 
}) => {
  const [showAjustes, setShowAjustes] = useState(false);
  const [showCookies, setShowCookies] = useState(false);
  const [showManual, setShowManual] = useState(false);

  // [ESTADOS DE SALUD DEL SISTEMA]
  const [isKeyValid, setIsKeyValid] = useState<boolean | null>(null);
  const [userIp, setUserIp] = useState<string | null>(null);

  const initializeSystem = useCallback(async () => {
    // 1. Detección de IP del Operador e Intento de Auto-Login
    try {
      const res = await fetch('https://api.ipify.org?format=json');
      const data = await res.json();
      setUserIp(data.ip);

      // Protocolo de Auto-Acceso por IP Memorizada
      const savedIpsRaw = localStorage.getItem('app_memorized_ips_v2');
      const isAuthStatus = localStorage.getItem('app_is_auth_v2') === 'true';

      if (!isAuthStatus && savedIpsRaw) {
        const savedIps: string[] = JSON.parse(savedIpsRaw);
        const { crypto } = await import('./Parameters');
        const obfuscatedCurrent = crypto.obfuscate(data.ip);
        if (savedIps.includes(obfuscatedCurrent)) {
          console.log("SISTEMA: IP Memorizada detectada. Concediendo acceso automático...");
          localStorage.setItem('app_is_auth_v2', 'true');
          window.location.reload();
        }
      }
    } catch {
      setUserIp('IP Offline');
    }

    // 2. Validación del Motor IA (Ping a Gemini usando process.env.API_KEY)
    const isValid = await validateKey();
    setIsKeyValid(isValid);
    updateLandingUI(isValid);

    // 3. Optimización de Modelo
    if (isValid) {
      const currentModel = localStorage.getItem('app_selected_model');
      if (!currentModel) {
        const models = await listAvailableModels();
        const optimal = models.find(m => m === 'gemini-3-flash-preview') ||
          models.find(m => m.includes('flash-preview')) ||
          models.find(m => m.includes('flash')) ||
          models[0];
        if (optimal) localStorage.setItem('app_selected_model', optimal);
      }
      console.log("SISTEMA: Motor IA validado y activo.");
    } else {
      console.warn("SISTEMA: Motor Gemini no disponible. Revise la configuración de process.env.API_KEY.");
    }
  }, []);

  // Actualización reactiva de la interfaz de bienvenida (Landing)
  const updateLandingUI = (valid: boolean) => {
    const badge = document.getElementById('status-ready-badge');
    const bar = document.getElementById('status-progress-bar');
    const text = document.getElementById('status-text');

    if (badge) {
      badge.style.display = valid ? 'block' : 'none';
      badge.classList.add('animate-in', 'zoom-in', 'duration-500');
    }
    if (bar) {
      bar.style.width = valid ? '100%' : '25%';
      if (!valid) bar.classList.add('animate-pulse');
      else bar.classList.remove('animate-pulse');
    }
    if (text) {
      text.innerText = valid ? 'System Active & Persistent' : 'System Standby • Check API Config';
      text.classList.toggle('text-red-700', !valid);
    }
  };

  useEffect(() => {
    initializeSystem();
  }, [initializeSystem]);

  return (
    <div className={`min-h-screen ${COLORS.bg} font-sans flex flex-col p-4 md:p-8 animate-in fade-in duration-700`}>
      {/* HEADER DINÁMICO */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md mb-8 border-b border-gray-100 pb-6 pt-4 flex flex-col md:flex-row gap-4 justify-between items-center px-2">
        <div className="w-full md:w-auto flex justify-between md:justify-start items-center">
          <div>
            <h1 className="text-3xl font-black tracking-tighter text-gray-900 flex items-center gap-2">
              <Activity className="text-indigo-600" size={32} />
              Kurae<span className="text-red-700"> +</span>
            </h1>
            <div className="flex items-center gap-4 mt-1">
              <div className="flex items-center gap-1.5">
                {isKeyValid === true ? (
                  <span className="flex items-center gap-1 text-[9px] font-black text-green-600 uppercase tracking-widest bg-green-50 px-2 py-0.5 rounded-md border border-green-100 animate-in fade-in zoom-in">
                    <CheckCircle2 size={10} /> AI ONLINE
                  </span>
                ) : isKeyValid === false ? (
                  <span className="flex items-center gap-1 text-[9px] font-black text-red-700 uppercase tracking-widest bg-red-50 px-2 py-0.5 rounded-md border border-red-100 animate-pulse cursor-help">
                    <AlertCircle size={10} /> AI OFFLINE
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[9px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 px-2 py-0.5 rounded-md">
                    <Sparkles size={10} className="animate-spin text-red-700" /> SYNCING
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* CONTROLES CENTRALES: Modo + Vista */}
        <div className="flex items-center gap-3 bg-gray-50 p-1.5 pr-2 rounded-full border border-gray-200 shadow-sm backdrop-blur-sm">
            {/* Selector Doctor/Paciente */}
            <div className="flex bg-gray-200/50 rounded-full p-1">
                <button 
                    onClick={() => onViewModeChange('doctor')}
                    className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-2 ${viewMode === 'doctor' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:text-indigo-600'}`}
                >
                    <Stethoscope size={14} /> <span className="hidden sm:inline">Doctor</span>
                </button>
                <button 
                    onClick={() => onViewModeChange('patient')}
                    className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-2 ${viewMode === 'patient' ? 'bg-teal-500 text-white shadow-md' : 'text-gray-500 hover:text-teal-600'}`}
                >
                    <Heart size={14} /> <span className="hidden sm:inline">Paciente</span>
                </button>
            </div>

            <div className="h-6 w-px bg-gray-300 mx-1"></div>

            {/* Selector Vista Web/Móvil */}
            <button
                onClick={onToggleMobileView}
                className={`p-2.5 rounded-full transition-all duration-300 hover:scale-105 active:scale-95 ${isMobileView ? 'bg-gray-900 text-white shadow-lg' : 'text-gray-400 hover:text-gray-900 hover:bg-white'}`}
                title={isMobileView ? "Cambiar a Vista Web" : "Cambiar a Vista Móvil"}
            >
                {isMobileView ? <Monitor size={16} /> : <Smartphone size={16} />}
            </button>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <button
            onClick={() => setShowManual(true)}
            className="flex items-center gap-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-900 px-4 py-2 rounded-xl transition-all active:scale-95 group shadow-sm"
          >
            <HelpCircle size={18} className="text-red-700 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Manual</span>
          </button>
          <AppMenu />
        </div>
      </header>

      {/* ÁREA DE CONTENIDO PRINCIPAL */}
      <main className={`flex-1 mx-auto w-full flex flex-col items-center transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] ${
          isMobileView ? 'max-w-[400px]' : 'max-w-7xl'
      }`}>
        <div className={`w-full transition-all duration-500 ${isMobileView ? 'scale-[0.98] origin-top' : ''}`}>
           {children}
        </div>
      </main>

      {/* FOOTER CORPORATIVO */}
      <Footer
        userIp={userIp}
        onShowCookies={() => setShowCookies(true)}
        onShowAjustes={() => setShowAjustes(true)}
      />

      {/* MODALES DE SOPORTE */}
      <Ajustes
        isOpen={showAjustes}
        onClose={() => setShowAjustes(false)}
        apiKey={apiKey}
        onApiKeySave={onApiKeySave}
        userIp={userIp}
      />

      <Cookies isOpen={showCookies} onClose={() => setShowCookies(false)} />
      <Manual isOpen={showManual} onClose={() => setShowManual(false)} />
    </div>
  );
};
