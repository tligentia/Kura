import React, { useState, useEffect } from 'react';
import { X, Key, ShieldCheck, RefreshCcw, Eye, EyeOff, ExternalLink, Lock, Database, Loader2, CheckCircle2, XCircle, Sparkles, Send, Table, Cpu, ChevronDown, Globe, Plus, Zap } from 'lucide-react';
import { getShortcutKey, crypto, validateKey, listAvailableModels, askGemini } from './Parameters';
import { Obfuscator } from './Obfuscator';

interface AjustesProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  onApiKeySave: (key: string) => void;
  userIp: string | null;
}

export const Ajustes: React.FC<AjustesProps> = ({ isOpen, onClose, apiKey, onApiKeySave, userIp }) => {
  const [showObfuscator, setShowObfuscator] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [isValidating, setIsValidating] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [localKey, setLocalKey] = useState(apiKey);
  
  // AI Sandbox states
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiAnswer, setAiAnswer] = useState('');
  const [isAsking, setIsAsking] = useState(false);

  // AI Model states
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState(localStorage.getItem('app_selected_model') || '');
  const [isLoadingModels, setIsLoadingModels] = useState(false);

  // IP memorization states
  const [memorizedIps, setMemorizedIps] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('app_memorized_ips_v2') || '[]');
    } catch { return []; }
  });

  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const isAuthorized = !hostname || hostname === 'localhost' || hostname === 'hello.tligent.com';
  const isCurrentIpMemorized = userIp ? memorizedIps.includes(crypto.obfuscate(userIp)) : false;

  const loadModels = async () => {
    setIsLoadingModels(true);
    try {
      const models = await listAvailableModels();
      setAvailableModels(models);
      
      if (!selectedModel || !models.includes(selectedModel)) {
        const optimal = models.find(m => m === 'gemini-3-flash-preview') || 
                        models.find(m => m.includes('flash-preview')) || 
                        models.find(m => m.includes('flash')) || 
                        models[0];
                        
        if (optimal) {
          setSelectedModel(optimal);
          localStorage.setItem('app_selected_model', optimal);
        }
      }
    } catch (e) {
      console.error("Failed loading models", e);
    } finally {
      setIsLoadingModels(false);
    }
  };

  const handleConfigCheck = async () => {
    setIsValidating(true);
    const ok = await validateKey();
    setStatus(ok ? 'success' : 'error');
    if (ok) await loadModels();
    setIsValidating(false);
  };

  useEffect(() => {
    if (isOpen) {
      setLocalKey(apiKey);
      handleConfigCheck();
    }
  }, [isOpen, apiKey]);

  const handleSaveKey = () => {
    onApiKeySave(localKey);
    handleConfigCheck();
  };

  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedModel(val);
    localStorage.setItem('app_selected_model', val);
  };

  const handleMemorizeIp = () => {
    if (!userIp) return;
    const obfuscated = crypto.obfuscate(userIp);
    if (!memorizedIps.includes(obfuscated)) {
      const newList = [...memorizedIps, obfuscated];
      setMemorizedIps(newList);
      localStorage.setItem('app_memorized_ips_v2', JSON.stringify(newList));
    }
  };

  const handleAiAsk = async () => {
    if (!aiQuestion.trim() || isAsking) return;
    setIsAsking(true);
    try {
      const res = await askGemini(aiQuestion, selectedModel);
      setAiAnswer(res);
    } catch (e: any) {
      setAiAnswer(`System Error: ${e.message}`);
    } finally {
      setIsAsking(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-xl max-h-[95vh] overflow-hidden flex flex-col border border-gray-100 animate-in zoom-in-95">
        
        {/* HEADER COMPACTO */}
        <div className="px-8 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-gray-900 rounded-xl text-white shadow-lg"><ShieldCheck size={20} /></div>
            <div>
              <h3 className="font-black text-gray-900 uppercase tracking-tighter text-lg leading-tight">Ajustes Maestro</h3>
              <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Configuración de Kurae</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-red-700 transition-all active:scale-90">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar">
          
          {/* SECCIÓN API KEY (DEVELOPER MODE) */}
          <section className="space-y-4 bg-gray-50/50 p-6 rounded-3xl border border-gray-100 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-110 transition-transform">
              <Key size={80} />
            </div>
            
            <div className="flex justify-between items-center px-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-900 flex items-center gap-2">
                <Lock size={14} className="text-red-700" /> ApiKey de Gemini
              </label>
              <a 
                href="https://ai.google.dev/" 
                target="_blank" 
                rel="noreferrer"
                className="text-[9px] font-black uppercase text-indigo-600 flex items-center gap-1 hover:underline"
              >
                Obtener Key <ExternalLink size={10} />
              </a>
            </div>

            <div className="space-y-3">
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={localKey}
                  onChange={(e) => setLocalKey(e.target.value)}
                  placeholder="Introducir Gemini API Key..."
                  className="w-full bg-white border border-gray-200 p-4 rounded-2xl text-xs font-mono outline-none focus:ring-2 focus:ring-red-700 transition-all shadow-sm"
                />
                <button 
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-900 transition-colors"
                >
                  {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              
              <div className="flex gap-2">
                <button 
                  onClick={handleSaveKey}
                  className="flex-1 bg-gray-900 text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
                >
                  <RefreshCcw size={14} className={isValidating ? 'animate-spin' : ''} />
                  Sincronizar Key
                </button>
              </div>
            </div>

            {status === 'error' && (
              <div className="flex items-center gap-2 text-red-700 bg-red-50 p-3 rounded-xl border border-red-100 animate-in slide-in-from-top-1">
                <XCircle size={14} />
                <span className="text-[9px] font-black uppercase tracking-widest">Error: Key no válida o configurada incorrectamente</span>
              </div>
            )}
            {status === 'success' && (
              <div className="flex items-center gap-2 text-green-700 bg-green-50 p-3 rounded-xl border border-green-100 animate-in slide-in-from-top-1">
                <CheckCircle2 size={14} />
                <span className="text-[9px] font-black uppercase tracking-widest">Motor Gemini Validado y Activo</span>
              </div>
            )}
          </section>

          <div className="space-y-4 bg-gray-50/30 p-4 rounded-3xl border border-gray-100">
            {/* MOTOR DE IA DINÁMICO */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-900 flex items-center gap-2 px-1">
                <Cpu size={14} className="text-red-700" /> Inteligencia del Sistema
              </label>
              <div className="relative group">
                <select 
                  value={selectedModel}
                  onChange={handleModelChange}
                  disabled={isLoadingModels}
                  className="w-full bg-white border border-gray-200 p-3 rounded-2xl text-xs font-bold uppercase tracking-wider appearance-none outline-none focus:ring-2 focus:ring-gray-900 cursor-pointer disabled:opacity-50 shadow-sm transition-colors hover:border-red-200"
                >
                  {availableModels.length > 0 ? (
                    availableModels.map(m => (
                      <option key={m} value={m} className="font-sans py-2">
                        {m === 'gemini-3-flash-preview' ? `⭐ ${m} (Recomendado)` : m}
                      </option>
                    ))
                  ) : (
                    <option value="">{isLoadingModels ? 'Sincronizando modelos...' : 'No se detectan modelos'}</option>
                  )}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-300">
                  <ChevronDown size={16} />
                </div>
              </div>
            </div>
          </div>

          {/* ACCESO RÁPIDO IP */}
          <section className="bg-gray-50/50 border border-gray-100 p-4 rounded-3xl space-y-3">
             <div className="flex items-center justify-between px-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-gray-900 flex items-center gap-2">
                  <Globe size={14} className="text-red-700" /> Memorizar IP
                </label>
                {isCurrentIpMemorized && (
                  <span className="text-[8px] font-black uppercase text-green-600 flex items-center gap-1 bg-green-50 px-2 py-0.5 rounded-full border border-green-100">
                    <Zap size={10} fill="currentColor" /> Memorizada
                  </span>
                )}
             </div>
             <div className="flex gap-2">
                <div className="flex-1 bg-white border border-gray-100 px-3 py-2 rounded-xl text-xs font-mono text-gray-400 flex items-center shadow-inner italic">
                  {userIp || '0.0.0.0'}
                </div>
                <button 
                  onClick={handleMemorizeIp}
                  disabled={!userIp || isCurrentIpMemorized}
                  className="bg-gray-900 hover:bg-black text-white px-4 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all disabled:opacity-10"
                >
                  <Plus size={14} />
                </button>
             </div>
          </section>

          {/* SANDBOX IA */}
          <section className="space-y-2">
             <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2 px-1">
               <Sparkles size={14} className="text-red-700" /> Sandbox IA
             </label>
             <div className="relative group">
               <textarea 
                 value={aiQuestion}
                 onChange={(e) => setAiQuestion(e.target.value)}
                 placeholder="Pregunta algo al motor seleccionado..."
                 className="w-full bg-gray-50 border border-gray-200 p-3 rounded-2xl text-[11px] font-medium min-h-[80px] outline-none focus:ring-2 focus:ring-gray-900 transition-all resize-none shadow-inner"
               />
               <button 
                 onClick={handleAiAsk}
                 disabled={isAsking || !aiQuestion.trim()}
                 className="absolute bottom-2 right-2 p-2 bg-gray-900 text-white rounded-xl hover:bg-black shadow-lg disabled:opacity-20 active:scale-90 transition-all"
               >
                 {isAsking ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
               </button>
             </div>
             {aiAnswer && (
               <div className="bg-gray-900 text-white p-3 rounded-2xl text-[10px] leading-relaxed font-mono animate-in slide-in-from-top-1 shadow-2xl overflow-y-auto max-h-24 custom-scrollbar border-l-4 border-red-700">
                 {aiAnswer}
               </div>
             )}
          </section>

          {/* CRYPTO TOOL LINK */}
          {isAuthorized && (
            <button onClick={() => setShowObfuscator(true)} className="w-full flex items-center justify-center gap-3 p-4 bg-gray-900 text-white border border-transparent rounded-2xl hover:bg-black transition-all group shadow-md active:scale-95">
              <Database size={16} />
              <span className="text-[10px] font-black uppercase tracking-widest text-center">Abrir Módulo de Cifrado (Crypto Tool)</span>
            </button>
          )}

        </div>

        {/* ACCIONES FINALES */}
        <div className="px-8 py-5 border-t border-gray-100 bg-gray-50/50 flex gap-3">
           <button 
             onClick={() => { if(confirm("¿Eliminar todos los datos de sesión?")) { localStorage.clear(); window.location.reload(); }}} 
             className="flex-1 border border-red-100 bg-white text-red-700 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-50 transition-all"
           >
             RESET MEMORY
           </button>
           <button onClick={onClose} className="flex-1 bg-gray-900 hover:bg-black text-white py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg active:scale-95">
             CERRAR PANEL
           </button>
        </div>
      </div>
      {isAuthorized && <Obfuscator isOpen={showObfuscator} onClose={() => setShowObfuscator(false)} />}
    </div>
  );
};