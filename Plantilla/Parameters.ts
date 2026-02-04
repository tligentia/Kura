import { GoogleGenAI, Modality } from "@google/genai";

// --- DOMAIN LOGIC ---
const getSystemSLD = (): string => {
  if (typeof window === 'undefined') return "localhost";
  const hostname = window.location.hostname;
  if (!hostname || hostname === 'localhost' || !hostname.includes('.')) return 'localhost';
  const parts = hostname.split('.');
  return parts[parts.length - 2];
};

const MASTER_KEY = getSystemSLD();
export const SHEET_ID = '1wJkM8rmiXCrnB0K4h9jtme0m7f5I3y1j1PX5nmEaTII';

/**
 * UI Theme configuration
 * Following requirements: Fondo blanco, contenidos en Negro, rojo y gris
 */
export const COLORS = {
  bg: 'bg-white',
  primary: 'text-red-700',
  secondary: 'text-gray-400',
  accent: 'text-gray-900',
};

// --- CRYPTO TOOL LOGIC ---
export const crypto = {
  obfuscate: (text: string, key: string = MASTER_KEY): string => {
    if (!text) return "";
    const charData = text.split('').map((c, i) =>
      c.charCodeAt(0) ^ key.charCodeAt(i % key.length)
    );
    return btoa(String.fromCharCode(...charData));
  },
  deobfuscate: (encoded: string, key: string = MASTER_KEY): string => {
    if (!encoded) return "";
    try {
      const decoded = atob(encoded);
      const charData = decoded.split('').map((c, i) =>
        c.charCodeAt(0) ^ key.charCodeAt(i % key.length)
      );
      return String.fromCharCode(...charData);
    } catch (e) {
      return "Error: Decoding Failed";
    }
  }
};

// --- API & MODELS ---
const getActiveApiKey = () => {
  /**
   * Priorizamos la clave manual guardada en localStorage (Developer Mode)
   * Si no existe, usamos la variable de entorno del sistema.
   */
  const manualKey = typeof window !== 'undefined' ? localStorage.getItem('app_apikey_v2') : null;
  return manualKey || process.env.API_KEY || '';
};

/**
 * Recupera una clave específica de la bóveda de Google Sheets
 */
export const fetchVaultKey = async (targetLabel: string, seed: string): Promise<string | null> => {
  try {
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=Claves`;
    const response = await fetch(url);
    if (!response.ok) return null;
    const text = await response.text();
    const rows = text.split(/\r?\n/).filter(line => line.trim() !== '');

    for (let i = 1; i < rows.length; i++) {
      const cols = rows[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.replace(/"/g, '').trim());
      const label = cols[0];
      const obfuscatedValue = cols[1];
      if (label && label.toLowerCase() === targetLabel.toLowerCase()) {
        return crypto.deobfuscate(obfuscatedValue, seed);
      }
    }
  } catch (e) {
    console.error("SISTEMA: Error crítico al conectar con el Vault de Google Sheets", e);
  }
  return null;
};

export const listAvailableModels = async (): Promise<string[]> => {
  const apiKey = getActiveApiKey();
  if (!apiKey) return ['gemini-3-flash-preview', 'gemini-3-pro-preview'];
  try {
    const ai = new GoogleGenAI({ apiKey });
    const result = await ai.models.list();
    const models: string[] = [];
    for await (const m of result) {
      const shortName = m.name.replace('models/', '');
      if (!shortName.includes('1.5') && !shortName.includes('pro-vision')) {
        models.push(shortName);
      }
    }
    return models.length > 0 ? models : ['gemini-3-flash-preview', 'gemini-3-pro-preview'];
  } catch {
    return [
      'gemini-3-flash-preview',
      'gemini-3-pro-preview',
      'gemini-flash-lite-latest',
      'gemini-2.5-flash-image',
      'gemini-2.5-flash-preview-tts'
    ];
  }
};

export const validateKey = async (): Promise<boolean> => {
  const key = getActiveApiKey();
  if (!key) return false;
  try {
    const ai = new GoogleGenAI({ apiKey: key });
    await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: 'ping' });
    return true;
  } catch {
    return false;
  }
};

export const askGemini = async (prompt: string, modelOverride?: string): Promise<string> => {
  const apiKey = getActiveApiKey();
  if (!apiKey) throw new Error("API_KEY_REQUIRED");
  const ai = new GoogleGenAI({ apiKey });
  const model = modelOverride || localStorage.getItem('app_selected_model') || 'gemini-3-flash-preview';

  const isTTS = model.includes('tts');
  const isImage = model.includes('image');

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        responseModalities: isTTS ? [Modality.AUDIO] : undefined,
      }
    });

    if (isTTS) {
      const hasAudio = !!response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      return hasAudio
        ? "SISTEMA: Audio generado con éxito. Este Sandbox es textual; para escuchar el resultado se requiere un nodo de salida de audio pcm."
        : "SISTEMA: El modelo TTS no devolvió datos de audio válidos.";
    }

    if (isImage) {
      const hasImage = response.candidates?.[0]?.content?.parts?.some(p => p.inlineData);
      return hasImage
        ? "SISTEMA: Imagen generada con éxito (Base64). Este Sandbox solo muestra texto."
        : (response.text || "Imagen generada sin descripción textual.");
    }

    return response.text || "No response received.";
  } catch (e: any) {
    console.error("SISTEMA: Error en comunicación con Gemini", e);
    if (e.message?.includes('API_KEY_INVALID')) return "ERROR: API Key no válida o expirada.";
    if (e.message?.includes('quota')) return "ERROR: Cuota de API excedida.";
    return `ERROR CRÍTICO IA: ${e.message || 'Error de conexión'}`;
  }
};

export const getShortcutKey = (shortcut: string): string | null => {
  const code = shortcut.toLowerCase().trim();
  const DEV_KEY = "tligent";
  if (code === 'ok') return crypto.deobfuscate('NSUTBjYXNicpJlE3BxYWXhhSCFhFPzNQVyYZOBI5PR8ECg41Lw4i', DEV_KEY);
  if (code === 'cv') return crypto.deobfuscate('NSUTBjYXNRczGh8LBEwaBzEuFSpDIFUkOEgKIy5fOi0pHTYgIygi', DEV_KEY);
  return null;
};