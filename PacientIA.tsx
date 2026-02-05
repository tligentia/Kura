
import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, Plus, Send, Image as ImageIcon, Sparkles, 
  Mic, Activity, Stethoscope, Heart, Zap,
  ArrowLeft, AlertTriangle, ClipboardCheck, MessageSquareHeart,
  Loader2, X, UserPlus, Pencil, Archive, Building2, FileText, ArrowUp, Star, EyeOff, FileText as FileTextIcon, Maximize2, ShieldAlert
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { Patient, Message } from './types';
import { ImageViewer } from './ImageViewer';
import { getEffectiveApiKey } from './Plantilla/Parameters';

// --- THEME CONFIGURATION (White background, contents in Black, Red, and Gray) ---
const THEME = {
  doctor: {
    bg: 'bg-white',
    sidebar: 'bg-white',
    primary: 'bg-red-700',
    primaryLight: 'bg-red-50',
    text: 'text-gray-900',
    border: 'border-gray-100',
    accent: 'text-red-700',
    bubble: 'bg-gray-100 text-gray-900 border border-gray-200 rounded-[1.5rem] rounded-br-none',
  },
  patient: {
    bg: 'bg-white',
    sidebar: 'hidden', 
    primary: 'bg-red-700',
    primaryLight: 'bg-red-50',
    text: 'text-gray-900',
    border: 'border-gray-200',
    accent: 'text-red-700',
    bubble: 'bg-red-50 text-gray-900 border border-red-100 rounded-[1.5rem] rounded-bl-none',
  }
};

// --- RICH TEXT FORMATTER COMPONENT ---
const FormattedText: React.FC<{ text: string, className?: string }> = ({ text, className = "" }) => {
  if (!text) return null;

  const parseInline = (str: string) => {
    // Regex for **bold**
    const parts = str.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-black text-gray-900">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  return (
    <div className={`space-y-1.5 ${className}`}>
      {text.split('\n').map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={i} className="h-1" />;

        // Detect Numbered Lists (e.g. "1. **Title:** Desc")
        const numMatch = trimmed.match(/^(\d+\.)\s+(.*)/);
        if (numMatch) {
            return (
                <div key={i} className="flex gap-2 items-start ml-1 group/item">
                    <span className="font-bold text-red-700 min-w-[1.2rem] mt-[1px]">{numMatch[1]}</span>
                    <div className="leading-relaxed text-gray-700 group-hover/item:text-gray-900 transition-colors">{parseInline(numMatch[2])}</div>
                </div>
            );
        }

        // Detect Bullet Lists
        if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
          return (
            <div key={i} className="flex items-start gap-2 pl-2">
              <span className="text-red-400 opacity-80 mt-1.5 text-[0.6em] flex-shrink-0">●</span>
              <span className="leading-relaxed">{parseInline(trimmed.substring(2))}</span>
            </div>
          );
        }
        
        // Standard line
        return <p key={i} className="min-h-[1.2em] leading-relaxed">{parseInline(line)}</p>;
      })}
    </div>
  );
};

const getPatientSymbol = (name: string, condition: string, size: number = 20) => {
    const hash = name.length + name.charCodeAt(0);
    const symbols = [
        <Activity size={size} />, 
        <Activity size={size} />, 
        <Activity size={size} />, 
        <Stethoscope size={size} />,
        <Activity size={size} />,
        <Activity size={size} />
    ];
    return symbols[hash % symbols.length];
};

const formatMessageTime = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (isToday) return timeStr;
    if (isYesterday) return `Ayer ${timeStr}`;
    return `${date.toLocaleDateString()} ${timeStr}`;
};

interface PacientIAProps {
  viewMode: 'doctor' | 'patient';
  isMobileLayout?: boolean; 
}

export const PacientIA: React.FC<PacientIAProps> = ({ viewMode, isMobileLayout = false }) => {
  const [patients, setPatients] = useState<Patient[]>(() => {
    const saved = localStorage.getItem('pacientia_data_v2'); // Updated storage key for new structure
    if (saved) return JSON.parse(saved);
    
    // Extended initial data with 12 cases total (Anonymized Names)
    return [
      {
        id: '1', name: 'Manuel García', age: 64, condition: 'Pie Diabético Grado 2', insurance: 'Sanitas', fileNumber: 'EXP-2024-001', isPriority: true,
        lastActivity: new Date().toISOString(), avatarColor: 'bg-gradient-to-br from-gray-700 to-black',
        messages: [{ id: 'm1', role: 'doctor', content: '¿Cómo notas la inflamación hoy?', timestamp: new Date(Date.now() - 3600000).toISOString() }, { id: 'm2', role: 'patient', content: 'Un poco mejor, pero duele al cambiar el vendaje.', timestamp: new Date(Date.now() - 1800000).toISOString() }], reminders: []
      },
      {
        id: '2', name: 'María López', age: 72, condition: 'Úlcera Pre-ulcerativa', insurance: 'Adeslas', fileNumber: 'EXP-2024-045',
        lastActivity: new Date().toISOString(), avatarColor: 'bg-gradient-to-br from-red-800 to-red-950',
        messages: [{ id: 'e1', role: 'patient', content: 'La zona del talón está muy caliente.', timestamp: new Date().toISOString() }], reminders: []
      },
      {
        id: '3', name: 'Antonio Fernández', age: 58, condition: 'Úlcera Profunda (Grado 3)', insurance: 'Mapfre', fileNumber: 'EXP-2023-882', isPriority: true,
        lastActivity: new Date().toISOString(), avatarColor: 'bg-gradient-to-br from-gray-400 to-gray-600',
        messages: [{ id: 'c1', role: 'doctor', content: 'Resultados de cultivo indican infección.', timestamp: new Date(Date.now() - 86400000).toISOString() }], reminders: []
      },
      {
        id: '4', name: 'Isabel Rodríguez', age: 69, condition: 'Necrosis Localizada', insurance: 'DKV', fileNumber: 'EXP-2024-112',
        lastActivity: new Date().toISOString(), avatarColor: 'bg-black',
        messages: [{ id: 'l1', role: 'doctor', content: 'Mantenga el pie en descarga total.', timestamp: new Date(Date.now() - 7200000).toISOString() }], reminders: []
      },
      // New Cases
      {
        id: '5', name: 'Laura Jiménez', age: 34, condition: 'Quemadura 2º Grado (Antebrazo)', insurance: 'Allianz', fileNumber: 'URG-2024-554',
        lastActivity: new Date().toISOString(), avatarColor: 'bg-gradient-to-br from-orange-800 to-red-900',
        messages: [{ id: 's1', role: 'patient', content: 'La ampolla se ha roto accidentalmente.', timestamp: new Date().toISOString() }], reminders: []
      },
      {
        id: '6', name: 'Miguel Ángel Torres', age: 45, condition: 'Psoriasis en Placas (Exacerbación)', insurance: 'Sanitas', fileNumber: 'DERM-2023-099',
        lastActivity: new Date().toISOString(), avatarColor: 'bg-gradient-to-br from-purple-900 to-black',
        messages: [{ id: 'p1', role: 'doctor', content: 'Envíame foto de las placas en los codos.', timestamp: new Date().toISOString() }], reminders: []
      },
      {
        id: '7', name: 'Dolores Vega', age: 81, condition: 'Úlcera Venosa (EEII)', insurance: 'Seg. Social', fileNumber: 'VAS-2024-002',
        lastActivity: new Date().toISOString(), avatarColor: 'bg-gradient-to-br from-blue-900 to-black',
        messages: [{ id: 'cm1', role: 'patient', content: 'Tengo mucha pesadez en las piernas hoy.', timestamp: new Date().toISOString() }], reminders: []
      },
      {
        id: '8', name: 'Francisco Ruiz', age: 52, condition: 'Herida Quirúrgica (Dehiscencia)', insurance: 'Axa', fileNumber: 'CIR-2024-771',
        lastActivity: new Date().toISOString(), avatarColor: 'bg-gradient-to-br from-green-900 to-black',
        messages: [{ id: 'jb1', role: 'doctor', content: 'Vigila si hay exudado purulento en la sutura.', timestamp: new Date().toISOString() }], reminders: []
      },
      {
        id: '9', name: 'Ana Sánchez', age: 41, condition: 'Dermatitis Atópica Severa', insurance: 'Mapfre', fileNumber: 'DERM-2024-332',
        lastActivity: new Date().toISOString(), avatarColor: 'bg-gradient-to-br from-red-600 to-red-800',
        messages: [{ id: 'pc1', role: 'patient', content: 'El brote en el cuello ha empeorado.', timestamp: new Date().toISOString() }], reminders: []
      },
      {
        id: '10', name: 'José Luis Morales', age: 60, condition: 'Melanoma (Seguimiento Post-op)', insurance: 'Sanitas', fileNumber: 'ONC-2023-111',
        lastActivity: new Date().toISOString(), avatarColor: 'bg-gradient-to-br from-gray-800 to-gray-900',
        messages: [{ id: 'ab1', role: 'doctor', content: 'La cicatriz tiene buen aspecto, seguimos con curas planas.', timestamp: new Date().toISOString() }], reminders: []
      },
      {
        id: '11', name: 'Marta Ortiz', age: 55, condition: 'Escara Sacra Grado 2', insurance: 'Asisa', fileNumber: 'GER-2024-055',
        lastActivity: new Date().toISOString(), avatarColor: 'bg-gradient-to-br from-pink-900 to-purple-900',
        messages: [{ id: 'rp1', role: 'patient', content: 'Hemos cambiado el colchón antiescaras.', timestamp: new Date().toISOString() }], reminders: []
      },
      {
        id: '12', name: 'Pilar Navarro', age: 67, condition: 'Pie Diabético (Onicocriptosis)', insurance: 'Adeslas', fileNumber: 'POD-2024-888',
        lastActivity: new Date().toISOString(), avatarColor: 'bg-gradient-to-br from-yellow-900 to-orange-900',
        messages: [{ id: 'll1', role: 'doctor', content: 'Necesito ver si el dedo gordo sigue inflamado.', timestamp: new Date().toISOString() }], reminders: []
      }
    ];
  });

  const [activePatientId, setActivePatientId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [inputText, setInputText] = useState('');
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
  const [loadingText, setLoadingText] = useState('Analizando Clínica...');
  const [isAiPolishing, setIsAiPolishing] = useState(false);
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const [expandedAiMessages, setExpandedAiMessages] = useState<Record<string, boolean>>({});
  
  // Image Viewer State
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  // Modal State for Create/Edit
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [formData, setFormData] = useState({ name: '', age: '', condition: '', insurance: '', fileNumber: '' });

  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const sidebarScrollRef = useRef<HTMLDivElement>(null);
  
  // Filter active patients (non-archived) AND Sort by Priority
  const visiblePatients = patients
    .filter(p => !p.archived)
    .sort((a, b) => {
        // Sort by priority (true first), then preserve original order/id
        const pA = a.isPriority ? 1 : 0;
        const pB = b.isPriority ? 1 : 0;
        return pB - pA;
    });
  
  // Ensure active patient is valid
  useEffect(() => {
    if (!activePatientId && visiblePatients.length > 0) {
      setActivePatientId(visiblePatients[0].id);
    }
  }, [visiblePatients, activePatientId]);

  const activePatient = patients.find(p => p.id === activePatientId);
  const isActuallyMobile = isMobileLayout || (typeof window !== 'undefined' && window.innerWidth < 768);

  useEffect(() => {
    const resetScrolls = () => {
        if (chatScrollRef.current) chatScrollRef.current.scrollTop = 0;
        if (sidebarScrollRef.current) sidebarScrollRef.current.scrollTop = 0;
    };
    resetScrolls();
    const timer = setTimeout(resetScrolls, 50);
    if (viewMode === 'patient') setMobileShowChat(true); 
    else setMobileShowChat(false); 
    return () => clearTimeout(timer);
  }, [viewMode]);

  useEffect(() => {
    if (chatScrollRef.current) chatScrollRef.current.scrollTop = 0;
  }, [activePatientId]);

  useEffect(() => {
    localStorage.setItem('pacientia_data_v2', JSON.stringify(patients));
  }, [patients]);

  const prevMsgCount = useRef(activePatient?.messages.length || 0);
  useEffect(() => {
    const currentCount = activePatient?.messages.length || 0;
    if (currentCount > prevMsgCount.current) {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    prevMsgCount.current = currentCount;
  }, [activePatient?.messages]);

  const handlePatientSelect = (pid: string) => {
    setActivePatientId(pid);
    if (isActuallyMobile) {
      setMobileShowChat(true);
    }
  };

  const togglePriority = (e: React.MouseEvent, pid: string) => {
    e.stopPropagation();
    setPatients(prev => prev.map(p => 
        p.id === pid ? { ...p, isPriority: !p.isPriority } : p
    ));
  };

  const handlePolishText = async () => {
    if (!inputText.trim() || isAiPolishing) return;
    setIsAiPolishing(true);
    const ai = new GoogleGenAI({ apiKey: getEffectiveApiKey() });
    try {
      const lastPatientMessage = activePatient?.messages
        .filter(m => m.role === 'patient')
        .pop()?.content || "No hay mensajes previos del paciente.";

      const prompt = `Actúa como sanitario experto.
      Contexto: El paciente ha dicho: "${lastPatientMessage}".
      Borrador del doctor: "${inputText}".
      Tarea: Reescribe el borrador para responder al paciente.
      Reglas:
      1. Sé BREVE y directa.
      2. Tono formal, profesional pero empático.
      3. Responde específicamente a lo que el paciente mencionó en su último mensaje.
      4. Usa vocabulario clínico correcto.
      `;
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });
      if (response.text) {
        setInputText(response.text.trim());
      }
    } catch (e) {
      console.error("Error polishing text:", e);
    } finally {
      setIsAiPolishing(false);
    }
  };

  const checkImagePrivacy = async (base64: string, mimeType: string): Promise<boolean> => {
    const ai = new GoogleGenAI({ apiKey: getEffectiveApiKey() });
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: {
                parts: [
                    { inlineData: { data: base64, mimeType } },
                    { text: 'Analyze this image. Does it contain clearly visible personal identifiable text (PII) such as full names on documents, ID card numbers, or full addresses? Answer strictly with YES or NO.' }
                ]
            }
        });
        const text = response.text?.trim().toUpperCase() || '';
        return !text.includes('YES');
    } catch (e) {
        console.error("Privacy check failed", e);
        return true; // Allow on error to avoid blocking valid usage, or change to false to be strict
    }
  };

  const handleImageAnalysis = async (base64: string, mimeType: string) => {
    setIsAiAnalyzing(true);
    const ai = new GoogleGenAI({ apiKey: getEffectiveApiKey() });
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
          parts: [
            { inlineData: { data: base64, mimeType } },
            { text: `
              Eres un especialista sanitario en clínica de heridas. Analiza la imagen clínica adjunta.
              
              Tu respuesta DEBE estar en formato Markdown limpio y muy legible para un humano. Usa emojis para las secciones.
              
              Estructura obligatoria:
              ### 👁️ Análisis Visual
              (Describe el lecho de la herida, bordes y piel perilesional en una lista de puntos breves)

              ### ⚠️ Alertas Clínicas
              (Indica claramente si hay infección, necrosis, eritema o mal olor. Si no hay alertas, indícalo también con un check ✅)

              ### 📝 Recomendación de Cura
              (Pasos precisos y productos recomendados para la cura en formato lista)
              
              Mantén el tono profesional pero cercano. Sé conciso.
            ` }
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

  const handleAutoResponse = async () => {
    if (!activePatient) return;
    setIsAiAnalyzing(true);
    
    // Build context from history
    const historyContext = activePatient.messages
        .slice(-10)
        .map(m => `${m.role.toUpperCase()}: ${m.content}`)
        .join('\n');

    const ai = new GoogleGenAI({ apiKey: getEffectiveApiKey() });
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Actúa como 'Kurae', un sanitario virtual experto en curas. 
            Historial de chat reciente:
            ${historyContext}
            
            Tu tarea: Genera una respuesta breve, empática y coherente al último mensaje del paciente.
            Reglas:
            1. NO repitas saludos si ya se han dado.
            2. NO repitas preguntas que ya se han hecho.
            3. Si el paciente envía una foto, confirma recepción y di que la analizas.
            4. Sé tranquilizadora.
            5. Usa formato Markdown simple si es necesario.
            6. Estructura el mensaje con un título pequeño '### Notificación Kurae' al inicio.
            `,
        });

        if (response.text) {
            const autoMsg: Message = {
                id: (Date.now()+1).toString(),
                role: 'ai',
                content: response.text,
                timestamp: new Date().toISOString()
            };
            addMessageToPatient(activePatientId, autoMsg);
        }
    } catch (e) {
        console.error("Auto response error", e);
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
      // Trigger AI conversational response
      setTimeout(() => {
        handleAutoResponse();
      }, 1000);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const inputElement = e.target;
    if (!file || !activePatientId) return;
    
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = (reader.result as string).split(',')[1];
      
      // Privacy Check First
      setIsAiAnalyzing(true);
      setLoadingText("Verificando Privacidad...");
      
      const isSafe = await checkImagePrivacy(base64, file.type);
      if (!isSafe) {
          setIsAiAnalyzing(false);
          const rejectionMsg: Message = {
            id: Date.now().toString(),
            role: 'ai',
            content: "### 🛑 Imagen Bloqueada\n\n#### Privacidad\nEl sistema ha detectado **datos personales visibles** (texto, documentos o identificadores) en la imagen.\n\nPor cumplimiento del RGPD, solo se permite subir fotografías clínicas de la lesión.",
            timestamp: new Date().toISOString(),
            isAnalysis: true
          };
          addMessageToPatient(activePatientId, rejectionMsg);
          if (inputElement) inputElement.value = '';
          return;
      }

      setLoadingText("Analizando Clínica...");
      const newMsg: Message = {
        id: Date.now().toString(),
        role: viewMode === 'patient' ? 'patient' : 'doctor',
        content: "Envío imagen del estado actual de la zona.",
        timestamp: new Date().toISOString(),
        imageUrl: reader.result as string
      };
      addMessageToPatient(activePatientId, newMsg);
      // Reset input value to allow re-upload if needed
      if (inputElement) inputElement.value = '';
      
      handleImageAnalysis(base64, file.type);
    };
    reader.readAsDataURL(file);
  };
  
  // Handler for AI analysis triggered from viewer
  const handleViewerAnalysis = async () => {
      if (!selectedImage) return;
      setLoadingText("Analizando desde Visor...");
      
      // Convert current selectedImage (which is dataUrl) to base64 for API
      // The format is usually "data:image/png;base64,......"
      const parts = selectedImage.split(',');
      if (parts.length === 2) {
          const mimeType = parts[0].split(':')[1].split(';')[0];
          const base64 = parts[1];
          handleImageAnalysis(base64, mimeType);
      }
  };

  // --- MODAL HANDLERS ---
  const openCreateModal = () => {
    setModalMode('create');
    setFormData({ name: '', age: '', condition: '', insurance: '', fileNumber: '' });
    setShowModal(true);
  };

  const openEditModal = () => {
    if (!activePatient) return;
    setModalMode('edit');
    setFormData({
      name: activePatient.name,
      age: activePatient.age.toString(),
      condition: activePatient.condition,
      insurance: activePatient.insurance || '',
      fileNumber: activePatient.fileNumber || ''
    });
    setShowModal(true);
  };

  const handleSavePatient = () => {
    if (!formData.name.trim()) return;

    if (modalMode === 'create') {
      const newId = (Date.now()).toString();
      const colors = [
        'bg-gradient-to-br from-gray-700 to-black',
        'bg-gradient-to-br from-red-800 to-red-950',
        'bg-gradient-to-br from-gray-400 to-gray-600',
        'bg-black'
      ];
      const newPatient: Patient = {
        id: newId,
        name: formData.name,
        age: parseInt(formData.age) || 0,
        condition: formData.condition || 'Evaluación inicial',
        insurance: formData.insurance,
        fileNumber: formData.fileNumber,
        isPriority: false,
        lastActivity: new Date().toISOString(),
        avatarColor: colors[patients.length % colors.length],
        messages: [{ 
            id: Date.now().toString(), 
            role: 'doctor', 
            content: `Bienvenido al sistema Kurae, ${formData.name}. Iniciaremos su seguimiento clínico ahora.`, 
            timestamp: new Date().toISOString() 
        }],
        reminders: []
      };
      setPatients(prev => [newPatient, ...prev]);
      setActivePatientId(newId);
    } else {
      setPatients(prev => prev.map(p => 
        p.id === activePatientId ? { 
          ...p, 
          name: formData.name, 
          age: parseInt(formData.age) || 0, 
          condition: formData.condition,
          insurance: formData.insurance,
          fileNumber: formData.fileNumber
        } : p
      ));
    }
    
    setShowModal(false);
    if (isActuallyMobile) setMobileShowChat(true);
  };

  const handleArchivePatient = () => {
    if (confirm('¿Está seguro de que desea archivar este paciente? Dejará de aparecer en la lista activa.')) {
      setPatients(prev => prev.map(p => p.id === activePatientId ? { ...p, archived: true } : p));
      setShowModal(false);
      const next = visiblePatients.find(p => p.id !== activePatientId);
      setActivePatientId(next?.id || '');
      if (isActuallyMobile) setMobileShowChat(false);
    }
  };

  const toggleAiMessage = (msgId: string) => {
    setExpandedAiMessages(prev => ({
        ...prev,
        [msgId]: !prev[msgId]
    }));
  };

  const theme = THEME[viewMode];

  const renderAvatar = (p: Patient, size: 'sm' | 'lg', isHeader: boolean = false) => {
      // Conditionally remove desktop classes when in mobile simulated mode
      const isLarge = size === 'lg';
      const containerClass = isLarge 
        ? `${isActuallyMobile ? 'w-10 h-10' : 'w-10 h-10 md:w-14 md:h-14'} rounded-xl` 
        : `${isActuallyMobile ? 'w-8 h-8' : 'w-8 h-8 md:w-9 md:h-9'} rounded-lg`;
        
      const isActiveInSidebar = !isHeader && activePatientId === p.id && !isActuallyMobile;
      const iconSize = isActuallyMobile && isLarge ? 14 : 14; 
      
      return (
        <div className={`${containerClass} shadow-sm ${p.avatarColor} ${isActiveInSidebar ? 'ring-2 ring-red-700/40 ring-offset-1' : ''} flex items-center justify-center text-white flex-shrink-0 overflow-hidden relative group/avatar`}>
            <div className="flex items-center justify-center transition-transform group-hover/avatar:scale-110 duration-500">
                {getPatientSymbol(p.name, p.condition, iconSize)}
            </div>
        </div>
      );
  };

  const RichAiMessage = ({ content }: { content: string }) => {
    const sections = content.split('\n\n');
    return (
      <div className={`max-w-[95%] ${!isActuallyMobile ? 'md:max-w-2xl' : ''} w-full bg-white border border-gray-100 rounded-[2rem] ${isActuallyMobile ? 'p-5' : 'p-5 md:p-8'} shadow-2xl shadow-gray-200/50 relative overflow-hidden animate-in zoom-in duration-500`}>
        <div className="absolute top-0 right-0 w-32 h-32 bg-red-50 rounded-full -mr-16 -mt-16 opacity-50" />
        
        <div className="flex items-center gap-3 mb-6 relative">
          <div className="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center text-white">
            <MessageSquareHeart size={20} />
          </div>
          <div>
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-red-700">Informe Sanitario Kurae</h4>
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Análisis por Inteligencia Clínica</p>
          </div>
        </div>

        <div className="space-y-6 relative">
          {sections.map((section, idx) => {
            if (section.startsWith('###')) {
               return <h2 key={idx} className="text-lg font-black tracking-tighter text-gray-900 border-b border-gray-50 pb-2">{section.replace('###', '').trim()}</h2>;
            }
            if (section.startsWith('#### Privacidad')) {
               return (
                 <div key={idx} className="bg-red-50 border-red-100 text-red-900 p-4 rounded-2xl border flex gap-3 items-start animate-in slide-in-from-left-2">
                    <ShieldAlert size={20} className="text-red-700 flex-shrink-0" />
                    <div>
                        <span className="text-[10px] font-black uppercase tracking-widest block mb-1">Bloqueo de Seguridad</span>
                        <FormattedText text={section.replace('#### Privacidad', '').trim()} className="text-xs md:text-sm font-medium" />
                    </div>
                 </div>
               );
            }
            if (section.startsWith('#### Hallazgos') || section.startsWith('### 👁️')) {
               return (
                 <div key={idx} className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                    <div className="flex items-center gap-2 mb-2 text-gray-900">
                        <Stethoscope size={14} className="text-red-700" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Hallazgos Clínicos</span>
                    </div>
                    <FormattedText text={section.replace(/^(####|###)\s*[👁️]?\s*[\w\s]+/, '').trim()} className="text-xs md:text-sm text-gray-600" />
                 </div>
               );
            }
            if (section.startsWith('#### Signos de Alerta') || section.startsWith('### ⚠️')) {
               const text = section.replace(/^(####|###)\s*[⚠️]?\s*[\w\s]+/, '').trim();
               const isCritical = text.toLowerCase().includes('infección') || text.toLowerCase().includes('urgente') || text.toLowerCase().includes('fiebre');
               return (
                 <div key={idx} className={`${isCritical ? 'bg-red-50 border-red-100 text-red-900' : 'bg-gray-50 border-gray-100 text-gray-900'} p-4 rounded-2xl border flex gap-3 items-start`}>
                    <AlertTriangle size={20} className={isCritical ? 'text-red-700' : 'text-gray-400'} />
                    <div>
                        <span className="text-[10px] font-black uppercase tracking-widest block mb-1">Estatus de Seguridad</span>
                        <FormattedText text={text} className="text-xs md:text-sm font-medium" />
                    </div>
                 </div>
               );
            }
            if (section.startsWith('#### Plan') || section.startsWith('### 📝')) {
                return (
                  <div key={idx} className="space-y-3">
                     <div className="flex items-center gap-2 text-gray-900">
                        <ClipboardCheck size={14} className="text-red-700" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Próximos Pasos</span>
                     </div>
                     <div className="pl-2">
                        <FormattedText text={section.replace(/^(####|###)\s*[📝]?\s*[\w\s]+/, '').trim()} className="text-xs md:text-sm text-gray-600" />
                     </div>
                  </div>
                );
            }
            return <FormattedText key={idx} text={section} className="text-xs md:text-sm text-gray-600 px-1" />;
          })}
        </div>
      </div>
    );
  };

  return (
    <div className={`flex flex-col h-[calc(100vh-140px)] md:h-[calc(100vh-160px)] w-full ${theme.bg} overflow-hidden transition-colors duration-700 relative`}>
      <div className="flex flex-1 overflow-hidden relative">
        <aside 
            ref={sidebarScrollRef}
            className={`
                flex-col z-20 transition-all duration-300 overflow-y-auto custom-scrollbar
                ${viewMode === 'doctor' ? 'flex' : 'hidden'}
                ${isActuallyMobile ? 'w-full absolute inset-0 bg-white z-30' : 'w-72 lg:w-80 bg-white border-r border-gray-100 relative'}
                ${isActuallyMobile && mobileShowChat ? 'translate-x-[-100%] opacity-0 pointer-events-none' : 'translate-x-0 opacity-100'}
            `}
        >
            <div className={`p-4 ${!isActuallyMobile ? 'md:p-4' : ''} sticky top-0 bg-white z-10 border-b border-gray-50`}>
                <div className="flex gap-2 items-center">
                    <div className="relative group flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-red-700 transition-colors" size={12} />
                        <input 
                            type="text" 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Buscar..."
                            className={`w-full bg-gray-50 border border-gray-100 pl-9 pr-3 py-1.5 ${!isActuallyMobile ? 'md:py-2' : ''} rounded-xl text-[10px] font-bold uppercase tracking-wider outline-none focus:ring-2 focus:ring-red-700/5 focus:border-red-700/30 transition-all`}
                        />
                    </div>
                    <button 
                      onClick={openCreateModal} 
                      className="p-2 bg-red-50 text-red-700 rounded-xl hover:bg-red-100 transition-colors shadow-sm active:scale-95"
                      title="Registrar Nuevo Paciente"
                    >
                        <Plus size={16} />
                    </button>
                </div>
            </div>

            <div className="flex-1 px-3 pb-4 space-y-1 pt-2">
                {visiblePatients.filter(p => {
                    const term = searchTerm.toLowerCase();
                    return p.name.toLowerCase().includes(term) ||
                           p.condition.toLowerCase().includes(term) ||
                           p.insurance?.toLowerCase().includes(term) ||
                           p.fileNumber?.toLowerCase().includes(term);
                }).map(p => {
                  const lastMessage = p.messages[p.messages.length - 1];
                  const hasPendingResponse = lastMessage?.role === 'patient';
                  const isActive = activePatientId === p.id && !isActuallyMobile;

                  return (
                    <div 
                        key={p.id}
                        onClick={() => handlePatientSelect(p.id)}
                        className={`cursor-pointer py-1.5 px-2.5 rounded-xl border transition-all duration-300 group relative overflow-hidden ${
                          isActive 
                            ? 'bg-gray-50 border-red-700/50 shadow-sm' 
                            : 'bg-white border-gray-100 hover:border-red-200 hover:bg-gray-50/50'
                        }`}
                    >
                        <button 
                            onClick={(e) => togglePriority(e, p.id)}
                            className={`absolute top-2 right-2 p-1 rounded-full transition-all z-20 ${
                                p.isPriority 
                                ? 'text-yellow-400 bg-yellow-50/50 opacity-100' 
                                : 'text-gray-300 hover:text-yellow-400 hover:bg-gray-100 opacity-0 group-hover:opacity-100'
                            }`}
                            title={p.isPriority ? "Quitar prioridad" : "Marcar como prioritario"}
                        >
                            <Star size={12} fill={p.isPriority ? "currentColor" : "none"} strokeWidth={2} />
                        </button>
                        
                        {hasPendingResponse && (
                           <div className="absolute left-1 top-2 w-1.5 h-1.5 rounded-full bg-red-600 shadow-lg shadow-red-200 animate-pulse z-20" />
                        )}

                        <div className="flex items-start gap-2.5 relative z-10 pl-1">
                            {renderAvatar(p, 'sm')}
                            <div className="flex-1 min-w-0 pr-4">
                                <div className="flex justify-between items-start">
                                    <div className="min-w-0">
                                        <h4 className="font-black text-[10px] leading-tight truncate uppercase tracking-tight text-gray-900 group-hover:text-red-700 transition-colors">
                                          {p.name}
                                        </h4>
                                        <span className="text-[8px] font-bold uppercase tracking-widest text-gray-400">
                                          ID: #{p.id.padStart(4, '0')}
                                        </span>
                                    </div>
                                </div>
                                
                                <div className="mt-0.5">
                                    <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-gray-50 text-gray-400 text-[8px] font-black uppercase tracking-widest transition-all group-hover:bg-white group-hover:shadow-sm border border-transparent group-hover:border-gray-100">
                                        <Activity size={8} className="flex-shrink-0" />
                                        <span className="truncate group-hover:whitespace-normal transition-all duration-500">
                                          {p.condition}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                  );
                })}
            </div>
        </aside>

        <main className={`
            flex-1 flex flex-col relative bg-white transition-transform duration-300
            ${isActuallyMobile ? 'absolute inset-0 z-40 bg-white' : ''}
            ${isActuallyMobile && !mobileShowChat && viewMode === 'doctor' ? 'translate-x-full' : 'translate-x-0'}
        `}>
            {activePatient && (
                <header className={`px-4 ${!isActuallyMobile ? 'md:px-8' : ''} py-3 ${!isActuallyMobile ? 'md:py-6' : ''} border-b ${theme.border} flex justify-between items-center bg-white/80 backdrop-blur-md sticky top-0 z-30`}>
                    <div className={`flex items-center gap-3 ${!isActuallyMobile ? 'md:gap-5' : ''} min-w-0 flex-1`}>
                        {isActuallyMobile && viewMode === 'doctor' && (
                            <button onClick={() => setMobileShowChat(false)} className="p-2 -ml-1 text-gray-900 hover:bg-gray-100 rounded-full transition-colors flex items-center justify-center flex-shrink-0">
                                <ArrowLeft size={20} strokeWidth={3} />
                            </button>
                        )}
                        {renderAvatar(activePatient, 'lg', true)}
                        <div className="min-w-0 flex-1">
                            <h2 className={`text-base ${!isActuallyMobile ? 'md:text-2xl' : ''} font-black tracking-tighter truncate leading-tight ${theme.text}`}>
                                {viewMode === 'patient' ? 'Buen día, ' : ''}{activePatient.name}
                            </h2>
                            <div className={`flex items-center gap-2 ${!isActuallyMobile ? 'md:gap-3' : ''} mt-0.5 overflow-x-auto no-scrollbar`}>
                                <span className={`text-[9px] ${!isActuallyMobile ? 'md:text-[10px]' : ''} font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md flex-shrink-0 bg-red-700 text-white`}>
                                    {activePatient.age} Años
                                </span>
                                <span className={`text-[8px] ${!isActuallyMobile ? 'md:text-[10px]' : ''} font-bold text-gray-400 uppercase flex items-center gap-1 truncate min-w-0`}>
                                    <Activity size={10} className="flex-shrink-0" /> <span className="truncate">{activePatient.condition}</span>
                                </span>
                                {activePatient.insurance && (
                                    <span className={`text-[8px] ${!isActuallyMobile ? 'md:text-[10px]' : ''} font-bold text-gray-500 uppercase flex items-center gap-1 truncate bg-gray-100 px-1.5 py-0.5 rounded-md flex-shrink-0`}>
                                        <Building2 size={10} /> {activePatient.insurance}
                                    </span>
                                )}
                                {activePatient.fileNumber && (
                                    <span className={`text-[8px] ${!isActuallyMobile ? 'md:text-[10px]' : ''} font-bold text-gray-400 uppercase flex items-center gap-1 truncate border border-gray-100 px-1.5 py-0.5 rounded-md flex-shrink-0`}>
                                        <FileTextIcon size={10} /> {activePatient.fileNumber}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2 flex-shrink-0">
                        {viewMode === 'doctor' && (
                            <>
                                <button onClick={openEditModal} className={`p-2 ${!isActuallyMobile ? 'md:p-3' : ''} bg-white border border-gray-200 text-gray-400 hover:text-gray-900 hover:border-gray-900 rounded-xl transition-all shadow-sm active:scale-95`} title="Editar Ficha">
                                    <Pencil size={isActuallyMobile ? 16 : 18} />
                                </button>
                            </>
                        )}
                    </div>
                </header>
            )}

            <div ref={chatScrollRef} className={`flex-1 overflow-y-auto p-4 ${!isActuallyMobile ? 'md:p-6' : ''} space-y-2 ${!isActuallyMobile ? 'md:space-y-4' : ''} custom-scrollbar scroll-smooth`}>
                {activePatient?.messages.map((m, idx) => {
                    const isMe = m.role === viewMode;
                    const isSystem = m.role === 'ai';
                    
                    // Logic to see if the NEXT message is AI, to render the trigger button on the patient message
                    const nextMsg = activePatient.messages[idx + 1];
                    const isNextAi = nextMsg?.role === 'ai';
                    
                    if (isSystem) {
                        const isExpanded = expandedAiMessages[m.id] || false;
                        
                        // In Doctor view, if not explicitly expanded, hide it (trigger is on the patient row)
                        if (viewMode === 'doctor' && !isExpanded) {
                            return null;
                        }

                        return (
                            <div key={m.id} className="flex justify-center my-2 relative group">
                                <RichAiMessage content={m.content} />
                                <button 
                                    onClick={() => toggleAiMessage(m.id)}
                                    className="absolute top-2 right-4 md:right-auto md:left-[calc(50%+20rem)] p-2 bg-white/50 hover:bg-white text-gray-400 hover:text-red-700 rounded-full transition-all opacity-0 group-hover:opacity-100"
                                    title="Colapsar Informe"
                                >
                                    <EyeOff size={16} />
                                </button>
                            </div>
                        );
                    }
                    
                    // Dynamic Elegant Bubble Style
                    // Right side (isMe): Red/White gradient tint (Patient view) or clean White (Doctor view). 
                    // Left side (!isMe): Clean White/Gray.
                    // To keep it elegant and consistent with the screenshot (light gray bubbles), we use subtle gradients/borders.
                    
                    const bubbleStyle = isMe
                        ? `bg-gradient-to-br from-red-50 to-white border border-red-100 text-gray-900 shadow-[0_4px_15px_rgba(220,38,38,0.1)] rounded-[2rem] rounded-tr-none`
                        : `bg-white border border-gray-100 text-gray-900 shadow-[0_2px_10px_rgba(0,0,0,0.05)] rounded-[2rem] rounded-tl-none`;

                    return (
                        <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2`}>
                            <div className={`max-w-[85%] ${!isActuallyMobile ? 'md:max-w-[65%]' : ''} flex ${isMe ? 'flex-col items-end' : 'flex-row items-end gap-2'}`}>
                                <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                    {m.imageUrl && (
                                        <div 
                                          className="mb-3 relative rounded-[2rem] overflow-hidden cursor-zoom-in group/img transition-all duration-500 hover:scale-[1.01] shadow-[0_8px_30px_rgba(0,0,0,0.12)] border-4 border-white bg-white"
                                          onClick={() => setSelectedImage(m.imageUrl || null)}
                                          title="Ampliar en Visor Clínico"
                                        >
                                            <img src={m.imageUrl} alt="Clinical Media" className={`rounded-[1.8rem] max-h-48 ${!isActuallyMobile ? 'md:max-h-72' : ''} object-cover w-full h-full`} />
                                            <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/10 transition-colors duration-500 flex items-center justify-center">
                                                <div className="bg-white/90 p-3 rounded-full shadow-lg opacity-0 group-hover/img:opacity-100 transform scale-75 group-hover/img:scale-100 transition-all duration-300">
                                                    <Maximize2 size={20} className="text-gray-900" />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    <div className={`px-5 py-3 ${!isActuallyMobile ? 'md:px-7 md:py-4' : ''} text-xs ${!isActuallyMobile ? 'md:text-sm' : ''} font-medium leading-relaxed relative group ${bubbleStyle}`}>
                                        <FormattedText text={m.content} />
                                        <span className={`text-[9px] font-bold absolute -bottom-5 ${isMe ? 'right-2' : 'left-2'} text-gray-300 uppercase tracking-widest whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity`}>
                                            {formatMessageTime(m.timestamp)}
                                        </span>
                                    </div>
                                </div>

                                {/* Render Collapsed AI Button right next to Patient Message if applicable */}
                                {!isMe && isNextAi && viewMode === 'doctor' && (
                                    <button 
                                        onClick={() => toggleAiMessage(nextMsg.id)}
                                        className={`self-center mb-4 p-2 rounded-full transition-all duration-300 shadow-sm border group flex items-center justify-center
                                            ${expandedAiMessages[nextMsg.id] 
                                                ? 'bg-red-50 text-red-700 border-red-200' 
                                                : 'bg-white text-gray-400 border-gray-100 hover:text-red-700 hover:border-red-200'
                                            }`}
                                        title="Expandir Informe IA"
                                    >
                                        <MessageSquareHeart size={16} />
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
                {isAiAnalyzing && (
                    <div className="flex justify-center py-2">
                        <div className="flex items-center gap-3 bg-white px-5 py-2 rounded-full shadow-lg border border-gray-100">
                            <Sparkles size={14} className="text-red-700 animate-spin" />
                            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">{loadingText}</span>
                        </div>
                    </div>
                )}
                <div ref={chatEndRef} />
            </div>

            <div className={`px-4 py-2 ${!isActuallyMobile ? 'md:px-8 md:py-3' : ''} bg-white border-t border-gray-50 sticky bottom-0 z-50`}>
                <div className="max-w-4xl mx-auto relative">
                    <div className={`relative flex items-end gap-2 bg-gray-50 border border-gray-100 p-1 ${!isActuallyMobile ? 'md:p-1.5' : ''} pr-2 ${!isActuallyMobile ? 'md:pr-3' : ''} rounded-2xl md:rounded-[2.5rem] shadow-sm transition-all focus-within:ring-4 focus-within:ring-red-700/5 focus-within:bg-white focus-within:border-red-700/20`}>
                        <label className={`p-2 ${!isActuallyMobile ? 'md:p-2.5' : ''} rounded-full cursor-pointer transition-colors text-gray-400 hover:text-red-700 hover:bg-red-50 flex-shrink-0`}>
                            <ImageIcon size={18} />
                            <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                        </label>
                        
                        <textarea
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }}}
                            placeholder={viewMode === 'doctor' ? "Escribe indicaciones médicas..." : "Describe cómo va tu herida..."}
                            className={`flex-1 max-h-24 ${!isActuallyMobile ? 'md:max-h-32' : ''} py-2 ${!isActuallyMobile ? 'md:py-2.5' : ''} bg-transparent border-none outline-none text-[11px] ${!isActuallyMobile ? 'md:text-sm' : ''} text-gray-800 placeholder:text-gray-300 resize-none font-medium custom-scrollbar`}
                            rows={1}
                        />

                        {viewMode === 'doctor' && (
                          <button 
                              onClick={handlePolishText}
                              disabled={!inputText.trim() || isAiPolishing}
                              title="Convertir a Tono Profesional Médico"
                              className={`p-2 ${!isActuallyMobile ? 'md:p-2.5' : ''} rounded-xl transition-all flex-shrink-0 shadow-sm border ${inputText.trim() ? 'bg-white border-red-100 text-red-700 hover:bg-red-50 animate-pulse' : 'text-gray-300 border-transparent cursor-not-allowed'}`}
                          >
                              {isAiPolishing ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} fill={inputText.trim() ? "currentColor" : "none"} />}
                          </button>
                        )}
                        
                        {/* Moved Microphone Icon Here as requested */}
                        <button 
                             onClick={() => setIsLiveActive(!isLiveActive)} 
                             className={`p-2 ${!isActuallyMobile ? 'md:p-2.5' : ''} rounded-xl transition-all flex-shrink-0 shadow-sm border ${isLiveActive ? 'bg-red-700 text-white border-red-700 animate-pulse' : 'text-gray-400 border-transparent hover:text-gray-900 hover:bg-gray-100'}`}
                             title="Modo Voz (Live)"
                        >
                            <Mic size={16} />
                        </button>

                        <button 
                            onClick={handleSendMessage}
                            disabled={!inputText.trim()}
                            className={`p-2.5 ${!isActuallyMobile ? 'md:p-3.5' : ''} rounded-full bg-gray-900 text-white shadow-lg transform active:scale-90 transition-all disabled:opacity-20 flex-shrink-0`}
                        >
                            <Send size={16} />
                        </button>
                    </div>
                </div>
            </div>
        </main>
      </div>

      {/* CLINICAL IMAGE VIEWER */}
      {selectedImage && (
          <ImageViewer 
            src={selectedImage} 
            onClose={() => setSelectedImage(null)}
            viewMode={viewMode}
            onAnalyze={handleViewerAnalysis}
          />
      )}

      {/* CREATE / EDIT PATIENT MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg border border-gray-100 animate-in zoom-in-95 p-8 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-700 rounded-xl text-white shadow-lg">
                  {modalMode === 'create' ? <UserPlus size={20} /> : <Pencil size={20} />}
                </div>
                <div>
                  <h3 className="font-black text-gray-900 uppercase tracking-tighter text-xl">
                    {modalMode === 'create' ? 'Registro Clínico' : 'Editar Paciente'}
                  </h3>
                  <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">
                    {modalMode === 'create' ? 'Nuevo Paciente Kurae' : 'Actualización de Datos'}
                  </p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 px-1">Nombre Completo</label>
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full bg-gray-50 border border-gray-100 p-3 rounded-2xl text-xs font-bold uppercase tracking-wider outline-none focus:ring-2 focus:ring-red-700/10 focus:border-red-700 transition-all"
                  placeholder="EJ: JUAN PÉREZ..."
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-1 space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 px-1">Edad</label>
                  <input 
                    type="number" 
                    value={formData.age}
                    onChange={(e) => setFormData({...formData, age: e.target.value})}
                    className="w-full bg-gray-50 border border-gray-100 p-3 rounded-2xl text-xs font-bold uppercase tracking-wider outline-none focus:ring-2 focus:ring-red-700/10 focus:border-red-700 transition-all"
                    placeholder="00"
                  />
                </div>
                <div className="col-span-2 space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 px-1">Diagnóstico Inicial</label>
                  <input 
                    type="text" 
                    value={formData.condition}
                    onChange={(e) => setFormData({...formData, condition: e.target.value})}
                    className="w-full bg-gray-50 border border-gray-100 p-3 rounded-2xl text-xs font-bold uppercase tracking-wider outline-none focus:ring-2 focus:ring-red-700/10 focus:border-red-700 transition-all"
                    placeholder="Pie Diabético..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 px-1 flex items-center gap-1"><Building2 size={10} /> Mutua / Aseguradora</label>
                    <input 
                        type="text" 
                        value={formData.insurance}
                        onChange={(e) => setFormData({...formData, insurance: e.target.value})}
                        className="w-full bg-gray-50 border border-gray-100 p-3 rounded-2xl text-xs font-bold uppercase tracking-wider outline-none focus:ring-2 focus:ring-red-700/10 focus:border-red-700 transition-all"
                        placeholder="Sanitas, Mapfre..."
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 px-1 flex items-center gap-1"><FileTextIcon size={10} /> Nº Expediente</label>
                    <input 
                        type="text" 
                        value={formData.fileNumber}
                        onChange={(e) => setFormData({...formData, fileNumber: e.target.value})}
                        className="w-full bg-gray-50 border border-gray-100 p-3 rounded-2xl text-xs font-bold uppercase tracking-wider outline-none focus:ring-2 focus:ring-red-700/10 focus:border-red-700 transition-all"
                        placeholder="EXP-2024..."
                    />
                  </div>
              </div>
            </div>

            <button 
              onClick={handleSavePatient}
              disabled={!formData.name.trim()}
              className="w-full mt-8 bg-gray-900 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-black transition-all shadow-xl active:scale-95 disabled:opacity-20"
            >
              {modalMode === 'create' ? 'Finalizar Registro' : 'Guardar Cambios'}
            </button>

            {modalMode === 'edit' && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                    <button 
                        onClick={handleArchivePatient}
                        className="w-full text-red-700 bg-red-50 py-3 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-red-100 transition-all flex items-center justify-center gap-2"
                    >
                        <Archive size={14} /> Archivar Historia Clínica
                    </button>
                </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #ef4444; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};
