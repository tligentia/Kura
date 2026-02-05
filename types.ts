
export interface Message {
  id: string;
  role: 'doctor' | 'patient' | 'ai';
  content: string;
  timestamp: string;
  imageUrl?: string;
  isAnalysis?: boolean;
}

export interface Reminder {
  id: string;
  title: string;
  date: string;
  completed: boolean;
}

export interface Patient {
  id: string;
  name: string;
  age: number;
  condition: string;
  insurance?: string; // Mutua
  fileNumber?: string; // Expediente / Carpeta
  archived?: boolean; // Estado de archivado
  isPriority?: boolean; // Estado de favorito/prioridad
  lastActivity: string;
  avatarColor: string;
  avatarUrl?: string; // New field for patient photo
  messages: Message[];
  reminders: Reminder[];
}
