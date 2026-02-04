import React, { useState, useEffect } from 'react';
import { Lock, Unlock, Copy, RefreshCw, KeyRound, ArrowRightLeft, Check, X, Info, Loader2, Database, Shield, Table } from 'lucide-react';
import { obfuscate, deobfuscate } from './Crypto';

interface VaultItem {
  label: string;
  value: string;
}

interface ObfuscatorProps {
  isOpen: boolean;
  onClose: () => void;
}

const SHEET_ID = '1wJkM8rmiXCrnB0K4h9jtme0m7f5I3y1j1PX5nmEaTII';
// URL de la Bóveda de Desarrollo (Hoja: Claves)
const VAULT_CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=Claves`;

export const Obfuscator: React.FC<ObfuscatorProps> = ({ isOpen, onClose }) => {
  const [key, setKey] = useState<string>('');
  const [currentSLD, setCurrentSLD] = useState<string>('');
  const [input, setInput] = useState<string>('');
  const [output, setOutput] = useState<string>('');
  const [mode, setMode] = useState<'obfuscate' | 'deobfuscate'>('obfuscate');
  const [copied, setCopied] = useState(false);
  
  // Estados de la Bóveda de Desarrollo
  const [vaultItems, setVaultItems] = useState<VaultItem[]>([]);
  const [showVault, setShowVault] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const getSLDFromHostname = (hostname: string): string => {
    if (!hostname || hostname === 'localhost' || !hostname.includes('.')) {
      return hostname || 'localhost';
    }
    const parts = hostname.split('.');
    if (parts.length >= 2) {
      return parts[parts.length - 2];
    }
    return hostname;
  };

  const parseCSVLine = (line: string): string[] => {
    const columns: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') inQuotes = !inQuotes;
      else if (char === ',' && !inQuotes) {
        columns.push(current.trim());
        current = '';
      } else current += char;
    }
    columns.push(current.trim());
    return columns.map(col => col.replace(/^"|"$/g, '').trim());
  };

  const syncDevelopmentVault = async () => {
    setIsSyncing(true);
    try {
      const response = await fetch(VAULT_CSV_URL);
      if (!response.ok) throw new Error('Network Vault Unreachable');
      const text = await response.text();
      const rows = text.split(/\r?\n/).filter(line => line.trim() !== '');
      
      const data = rows.slice(1).map((row, index) => {
        const cols = parseCSVLine(row);
        return {
          label: cols[0] || `Dev Key ${index + 1}`,
          value: cols[1] || ''
        };
      }).filter(item => item.value);
      
      setVaultItems(data);
    } catch (error) {
      console.error('Error syncing development vault:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname || 'localhost';
      const sld = getSLDFromHostname(hostname);
      setCurrentSLD(sld);
      setKey(sld);
    }
    syncDevelopmentVault();
  }, []);

  const handleProcess = () => {
    if (!input) {
      setOutput('');
      return;
    }
    if (mode === 'obfuscate') {
      const result = obfuscate(input, key);
      setOutput(result);
    } else {
      const result = deobfuscate(input, key);
      setOutput(result);
    }
    setCopied(false);
  };

  useEffect(() => {
    handleProcess();
  }, [input, key, mode]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const toggleMode = () => {
    if (output && !output.startsWith('Error:')) {
      setInput(output);
    }
    setMode(prev => prev === 'obfuscate' ? 'deobfuscate' : 'obfuscate');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className={`bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-gray-100 transition-all duration-500 ease-in-out ${showVault ? 'w-full max-w-4xl' : 'w-full max-w-xl'} max-h-[90vh] animate-in zoom-in-95`}>
        
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-700 rounded-lg text-white">
              <Lock size={20} />
            </div>
            <div>
              <h3 className="font-black text-gray-900 uppercase tracking-tighter text-xl leading-tight">Crypto Tool</h3>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Entorno de Cifrado Maestro</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Direct access to control sheet */}
            <button 
              onClick={() => window.open(`https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit`, '_blank')}
              className="p-2 bg-white border border-gray-200 text-gray-400 hover:text-red-700 rounded-xl transition-all shadow-sm group"
              title="Abrir Sheet de Control"
            >
              <Table size={20} className="group-hover:scale-110 transition-transform" />
            </button>
            <button 
              onClick={() => setShowVault(!showVault)}
              className={`p-2 rounded-xl transition-all border ${showVault ? 'bg-red-700 text-white border-red-700 shadow-lg' : 'bg-white border-gray-200 text-gray-400 hover:text-red-700'}`}
              title="Ver Bóveda de Desarrollo"
            >
              <Database size={20} />
            </button>
            <button 
              onClick={onClose} 
              className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-red-700 transition-all"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          
          {/* Main Workspace */}
          <div className={`p-8 overflow-y-auto space-y-6 custom-scrollbar transition-all duration-500 ${showVault ? 'md:w-1/2' : 'w-full'}`}>
            <div className="space-y-2">
              <label className="flex items-center text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                <KeyRound className="w-3 h-3 mr-2 text-red-700" />
                Clave de Desofuscación
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 focus:border-red-700 focus:bg-white text-gray-900 p-4 rounded-xl outline-none transition-all font-mono text-sm"
                  placeholder="XOR Key..."
                />
                <button 
                  onClick={() => setKey(currentSLD)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-700 p-1"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <h2 className="text-xs font-black uppercase tracking-widest flex items-center text-gray-900">
                {mode === 'obfuscate' ? <Lock className="w-3 h-3 mr-2 text-red-700" /> : <Unlock className="w-3 h-3 mr-2 text-green-600" />}
                {mode === 'obfuscate' ? 'Cifrar' : 'Revelar'}
              </h2>
              <button
                onClick={toggleMode}
                className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest bg-gray-900 text-white px-3 py-1.5 rounded-lg hover:bg-black transition-all"
              >
                <ArrowRightLeft className="w-3 h-3" /> Invertir Proceso
              </button>
            </div>

            <div className="space-y-4">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={mode === 'obfuscate' ? "Texto en claro..." : "Código ofuscado..."}
                className="w-full h-32 p-4 bg-white border border-gray-200 focus:border-red-700 rounded-2xl resize-none outline-none text-xs font-mono shadow-inner"
              />
              <div className="relative">
                <div className={`w-full h-32 p-4 bg-gray-50 border ${output.startsWith('Error:') ? 'border-red-200 text-red-700' : 'border-gray-100 text-gray-900'} rounded-2xl font-mono text-xs break-all overflow-y-auto`}>
                  {output || <span className="text-gray-300 italic">Esperando entrada...</span>}
                </div>
                {output && !output.startsWith('Error:') && (
                  <button
                    onClick={() => copyToClipboard(output)}
                    className="absolute bottom-3 right-3 flex items-center gap-2 bg-white border border-gray-200 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase text-gray-500 hover:text-red-700 shadow-sm transition-all"
                  >
                    {copied ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
                    {copied ? 'Copiado' : 'Copiar'}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Development Vault Panel (Sincronizado vía syncDevelopmentVault) */}
          {showVault && (
            <div className="md:w-1/2 bg-gray-50 border-l border-gray-100 p-8 overflow-y-auto animate-in slide-in-from-right-4 duration-500 custom-scrollbar">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-lg shadow-sm border border-gray-100">
                    <Shield size={16} className="text-red-700" />
                  </div>
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-900">Bóveda de Desarrollo</h4>
                    <p className="text-[9px] text-gray-400 font-bold uppercase italic">Claves Externas Activas</p>
                  </div>
                </div>
                <button 
                  onClick={syncDevelopmentVault} 
                  className={`p-2 bg-white border border-gray-100 rounded-lg text-gray-400 hover:text-red-700 transition-all ${isSyncing ? 'animate-spin' : ''}`}
                >
                  <RefreshCw size={14} />
                </button>
              </div>

              {isSyncing ? (
                <div className="h-64 flex flex-col items-center justify-center gap-4">
                  <Loader2 className="animate-spin text-red-700" size={24} />
                  <p className="text-[9px] font-black uppercase text-gray-400 tracking-widest animate-pulse">Sincronizando Bóveda...</p>
                </div>
              ) : vaultItems.length === 0 ? (
                <div className="p-12 text-center border-2 border-dashed border-gray-200 rounded-3xl">
                   <Info size={32} className="mx-auto text-gray-200 mb-4" />
                   <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 leading-relaxed">
                     Bóveda de Claves inaccesible.<br/>Revise la conexión con la hoja 'Claves'.
                   </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {vaultItems.map((item, idx) => {
                    const decoded = deobfuscate(item.value, key);
                    const isError = decoded.startsWith('Error:');
                    
                    return (
                      <div key={idx} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4 hover:shadow-md transition-all group">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-black uppercase tracking-widest text-red-700 bg-red-50 px-3 py-1 rounded-full border border-red-100">
                            {item.label}
                          </span>
                          <button 
                            onClick={() => {
                              setMode('deobfuscate');
                              setInput(item.value);
                            }}
                            className="text-[9px] font-black uppercase text-gray-400 hover:text-gray-900 flex items-center gap-1 transition-transform group-hover:-translate-x-1"
                          >
                            Procesar <ArrowRightLeft size={10} />
                          </button>
                        </div>
                        
                        <div className="space-y-3">
                          <div className="space-y-1.5">
                            <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Código Original (Ofuscado):</p>
                            <div className="text-[10px] font-mono text-gray-900 break-all bg-gray-50 p-3 rounded-xl border border-gray-100 relative group/line">
                              {item.value}
                              <button onClick={() => copyToClipboard(item.value)} className="absolute right-2 top-2 opacity-0 group-hover/line:opacity-100 text-gray-400 hover:text-red-700 transition-all">
                                <Copy size={12} />
                              </button>
                            </div>
                          </div>
                          
                          <div className="space-y-1.5">
                            <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Resultado de Revelado:</p>
                            <div className={`text-[10px] font-mono p-3 rounded-xl border transition-colors ${isError ? 'bg-red-50 border-red-100 text-red-900' : 'bg-green-50 border-green-100 text-green-900 font-bold'}`}>
                              {decoded}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  
                  <div className="pt-4 text-center">
                    <p className="text-[8px] text-gray-300 font-black uppercase tracking-[0.3em]">Acceso Seguro • Claves de Desarrollo</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Footer */}
        <div className="p-6 border-t border-gray-100 bg-white">
          <button 
            onClick={onClose} 
            className="w-full bg-gray-900 hover:bg-black text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all shadow-xl shadow-gray-200"
          >
            Cerrar Módulo de Cifrado
          </button>
        </div>
      </div>
    </div>
  );
};