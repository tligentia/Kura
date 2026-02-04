
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
  lastActivity: string;
  avatarColor: string;
  messages: Message[];
  reminders: Reminder[];
}
